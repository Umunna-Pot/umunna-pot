import { NextResponse } from "next/server"
import { decodeEventLog, isAddress } from "viem"
import { dbConnect } from "@/lib/db"
import {
  BASE_SEPOLIA_CHAIN_ID,
  UMUNNA_POT_ABI,
  UMUNNA_POT_ADDRESS,
  isContractConfigured,
} from "@/lib/contracts"
import { getBaseSepoliaPublicClient } from "@/lib/blockchain"
import { verifyDripVaultInputSchema } from "@/lib/schemas"
import DripVault from "@/models/DripVault"

interface MongoDuplicateKeyError extends Error {
  code?: number
  keyPattern?: Record<string, unknown>
}

/**
 * GET /api/drip-vaults
 * Purely read-only.
 * Returns verified on-chain Drip Vaults associated with a participant wallet address.
 * Never inserts mock records, never synthesizes data, never modifies MongoDB.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawAddress = searchParams.get("address")?.trim()

    if (!rawAddress) {
      return NextResponse.json(
        { error: "Query parameter 'address' is required." },
        { status: 400 }
      )
    }

    if (!isAddress(rawAddress)) {
      return NextResponse.json(
        { error: "Invalid Ethereum/EVM wallet address format." },
        { status: 400 }
      )
    }

    const conn = await dbConnect()
    if (!conn) {
      return NextResponse.json(
        { error: "Database service temporarily unavailable." },
        { status: 503 }
      )
    }

    const normalizedAddress = rawAddress.toLowerCase()
    const contractAddress = UMUNNA_POT_ADDRESS.toLowerCase()

    // Filter purely verified on-chain records matching the participant and active deployment
    const query = {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      contractAddress,
      verificationStatus: "verified",
      $or: [
        { funderAddress: normalizedAddress },
        { beneficiaryAddress: normalizedAddress },
        { guardianAddress: normalizedAddress },
      ],
    }

    const vaults = await DripVault.find(query).sort({ createdAt: -1 }).lean()

    return NextResponse.json({
      chainId: BASE_SEPOLIA_CHAIN_ID,
      contractAddress,
      count: vaults.length,
      vaults,
    })
  } catch (error) {
    console.error("[API GET /api/drip-vaults] Internal error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json(
      { error: "Failed to retrieve verified drip vaults." },
      { status: 500 }
    )
  }
}

/**
 * POST /api/drip-vaults
 * Hardened On-Chain Ingestion & Idempotent Verification.
 * Mandates a confirmed Base Sepolia transaction hash.
 * Independently validates:
 * 1. Transaction receipt status is success (1).
 * 2. Transaction destination matches UmunnaPot contract.
 * 3. VaultCreated event is emitted with valid schedule & participants.
 * 4. Contract state getDripVault(vaultId) strictly matches parsed event.
 * 5. Safely creates or idempotently returns existing verified document.
 */
export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request payload." },
        { status: 400 }
      )
    }

    const parseResult = verifyDripVaultInputSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload. Required field 'txHash' must be a 64-character 0x hex string.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const txHash = parseResult.data.txHash.toLowerCase() as `0x${string}`

    if (!isContractConfigured()) {
      return NextResponse.json(
        { error: "UmunnaPot smart contract is not configured on this environment." },
        { status: 503 }
      )
    }

    const conn = await dbConnect()
    if (!conn) {
      return NextResponse.json(
        { error: "Database service temporarily unavailable." },
        { status: 503 }
      )
    }

    // 1. Idempotency pre-check: If this transaction hash is already verified in DB, return it immediately
    const existingByTx = await DripVault.findOne({
      transactionHash: txHash,
      verificationStatus: "verified",
    }).lean()

    if (existingByTx) {
      return NextResponse.json(
        {
          message: "Drip Vault already verified and recorded.",
          vault: existingByTx,
          idempotent: true,
        },
        { status: 200 }
      )
    }

    // 2. Fetch public client and transaction receipt from Base Sepolia
    const publicClient = getBaseSepoliaPublicClient()
    const targetContract = UMUNNA_POT_ADDRESS.toLowerCase()

    let receipt
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash })
    } catch (rpcErr) {
      console.error("[API POST /api/drip-vaults] RPC receipt fetch failed:", rpcErr instanceof Error ? rpcErr.message : "RPC Error")
      return NextResponse.json(
        { error: "Transaction receipt not found or not yet confirmed on Base Sepolia. Please verify the transaction hash." },
        { status: 404 }
      )
    }

    if (!receipt) {
      return NextResponse.json(
        { error: "Transaction receipt unavailable on Base Sepolia." },
        { status: 404 }
      )
    }

    // 3. Verify receipt status
    if (receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction reverted or failed on-chain. Cannot verify failed transactions." },
        { status: 422 }
      )
    }

    // 4. Verify transaction destination
    if (!receipt.to || receipt.to.toLowerCase() !== targetContract) {
      return NextResponse.json(
        { error: "Transaction was not directed to the configured UmunnaPot contract." },
        { status: 422 }
      )
    }

    // 5. Locate and parse VaultCreated event in transaction receipt logs
    let foundEvent: {
      vaultId: bigint
      funder: `0x${string}`
      beneficiary: `0x${string}`
      guardian: `0x${string}`
      totalAmount: bigint
      installmentAmount: bigint
      intervalSeconds: bigint | number
      firstReleaseAt: bigint | number
      logIndex: number
    } | null = null

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== targetContract) continue

      try {
        const decoded = decodeEventLog({
          abi: UMUNNA_POT_ABI,
          data: log.data,
          topics: log.topics,
        })

        if (decoded.eventName === "VaultCreated") {
          const args = decoded.args as {
            vaultId: bigint
            funder: `0x${string}`
            beneficiary: `0x${string}`
            guardian: `0x${string}`
            totalAmount: bigint
            installmentAmount: bigint
            intervalSeconds: bigint
            firstReleaseAt: bigint
          }

          if (foundEvent !== null) {
            return NextResponse.json(
              { error: "Ambiguous transaction: Multiple VaultCreated events detected in single receipt." },
              { status: 422 }
            )
          }

          foundEvent = {
            vaultId: args.vaultId,
            funder: args.funder,
            beneficiary: args.beneficiary,
            guardian: args.guardian,
            totalAmount: args.totalAmount,
            installmentAmount: args.installmentAmount,
            intervalSeconds: args.intervalSeconds,
            firstReleaseAt: args.firstReleaseAt,
            logIndex: Number(log.logIndex ?? 0),
          }
        }
      } catch {
        // Skip logs that do not match UmunnaPot ABI
        continue
      }
    }

    if (!foundEvent) {
      return NextResponse.json(
        { error: "No VaultCreated event was emitted by the UmunnaPot contract in this transaction." },
        { status: 422 }
      )
    }

    // 6. Validate Event Fields
    if (foundEvent.totalAmount <= 0n) {
      return NextResponse.json(
        { error: "Invalid VaultCreated event: totalAmount must be positive." },
        { status: 422 }
      )
    }

    if (foundEvent.installmentAmount <= 0n) {
      return NextResponse.json(
        { error: "Invalid VaultCreated event: installmentAmount must be positive." },
        { status: 422 }
      )
    }

    if (foundEvent.installmentAmount > foundEvent.totalAmount) {
      return NextResponse.json(
        { error: "Invalid VaultCreated event: installmentAmount exceeds totalAmount." },
        { status: 422 }
      )
    }

    const minInterval = 30 // UmunnaPot.MIN_INTERVAL_SECONDS
    if (Number(foundEvent.intervalSeconds) < minInterval) {
      return NextResponse.json(
        { error: `Invalid VaultCreated event: intervalSeconds is less than contract minimum (${minInterval}s).` },
        { status: 422 }
      )
    }

    // Verify transaction sender is the funder
    if (receipt.from.toLowerCase() !== foundEvent.funder.toLowerCase()) {
      return NextResponse.json(
        { error: "Transaction sender does not match the vault funder recorded in the event." },
        { status: 422 }
      )
    }

    // 7. Contract State Verification: Read getDripVault(vaultId) directly from chain
    let onChainState
    try {
      onChainState = await publicClient.readContract({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "getDripVault",
        args: [foundEvent.vaultId],
      })
    } catch (stateErr) {
      console.error("[API POST /api/drip-vaults] Contract state read failed:", stateErr instanceof Error ? stateErr.message : "Contract error")
      return NextResponse.json(
        { error: "Failed to read vault state from UmunnaPot contract." },
        { status: 502 }
      )
    }

    if (!onChainState || !onChainState.exists) {
      return NextResponse.json(
        { error: "Vault does not exist in UmunnaPot contract storage." },
        { status: 422 }
      )
    }

    // Verify contract state matches the event
    if (
      onChainState.funder.toLowerCase() !== foundEvent.funder.toLowerCase() ||
      onChainState.beneficiary.toLowerCase() !== foundEvent.beneficiary.toLowerCase() ||
      onChainState.guardian.toLowerCase() !== foundEvent.guardian.toLowerCase() ||
      onChainState.totalAmount !== foundEvent.totalAmount ||
      onChainState.installmentAmount !== foundEvent.installmentAmount ||
      BigInt(onChainState.intervalSeconds) !== BigInt(foundEvent.intervalSeconds)
    ) {
      return NextResponse.json(
        { error: "Contract state mismatch with event parameters." },
        { status: 422 }
      )
    }

    // Calculate claimed amount in base units: totalAmount - remainingAmount
    const claimedBaseUnits = (onChainState.totalAmount - onChainState.remainingAmount).toString()
    const nextReleaseDate = new Date(Number(onChainState.nextReleaseAt) * 1000)

    const docPayload = {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      contractAddress: targetContract,
      onChainVaultId: foundEvent.vaultId.toString(),
      transactionHash: txHash,
      eventLogIndex: foundEvent.logIndex,
      blockNumber: Number(receipt.blockNumber),
      blockHash: receipt.blockHash.toLowerCase(),
      funderAddress: foundEvent.funder.toLowerCase(),
      freelancerAddress: foundEvent.funder.toLowerCase(),
      beneficiaryAddress: foundEvent.beneficiary.toLowerCase(),
      guardianAddress: foundEvent.guardian.toLowerCase(),
      totalLockedBaseUnits: onChainState.totalAmount.toString(),
      installmentAmountBaseUnits: onChainState.installmentAmount.toString(),
      claimedBaseUnits,
      remainingBaseUnits: onChainState.remainingAmount.toString(),
      intervalSeconds: Number(onChainState.intervalSeconds),
      nextReleaseAt: nextReleaseDate,
      releasedCount: Number(onChainState.releasedCount),
      active: onChainState.active,
      earlyExitRequested: onChainState.earlyExitRequested,
      verificationStatus: "verified" as const,
      status: onChainState.active
        ? ("streaming" as const)
        : onChainState.remainingAmount === 0n
        ? ("completed" as const)
        : ("emergency_unlocked" as const),
    }

    // 8. Idempotent Atomic Persistence
    // Uses findOneAndUpdate with upsert to prevent duplicate-key race conditions
    try {
      const savedVault = await DripVault.findOneAndUpdate(
        {
          chainId: BASE_SEPOLIA_CHAIN_ID,
          contractAddress: targetContract,
          onChainVaultId: foundEvent.vaultId.toString(),
        },
        { $setOnInsert: docPayload },
        { upsert: true, new: true, lean: true }
      )

      return NextResponse.json(
        {
          message: "Drip Vault verified and saved successfully.",
          vault: savedVault,
        },
        { status: 201 }
      )
    } catch (dbErr) {
      const mongoErr = dbErr as MongoDuplicateKeyError
      if (mongoErr.code === 11000) {
        // Race condition duplicate handled cleanly: fetch and return existing
        const existing = await DripVault.findOne({
          chainId: BASE_SEPOLIA_CHAIN_ID,
          contractAddress: targetContract,
          onChainVaultId: foundEvent.vaultId.toString(),
        }).lean()

        return NextResponse.json(
          {
            message: "Drip Vault already verified and recorded.",
            vault: existing,
            idempotent: true,
          },
          { status: 200 }
        )
      }

      console.error("[API POST /api/drip-vaults] Database save error:", dbErr instanceof Error ? dbErr.message : "DB error")
      return NextResponse.json(
        { error: "Database error while storing verified vault record." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[API POST /api/drip-vaults] Unhandled exception:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json(
      { error: "Internal server error during vault verification." },
      { status: 500 }
    )
  }
}
