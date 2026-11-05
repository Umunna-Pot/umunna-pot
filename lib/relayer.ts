import crypto from "node:crypto"
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { baseSepolia } from "viem/chains"

if (typeof window !== "undefined") {
  throw new Error("lib/relayer.ts must only be imported on the server.")
}

import {
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  UMUNNA_POT_ABI,
  UMUNNA_POT_ADDRESS,
  isContractConfigured,
} from "@/lib/contracts"
import { USDC_DECIMALS } from "@/lib/format"

interface RelayerMemoryStore {
  creditedPaymentRefs: Map<
    string,
    { txHash: `0x${string}`; mode: "onchain" | "simulated" }
  >
  settledTxHashes: Set<string>
}

const globalForRelayer = globalThis as unknown as {
  __umunnaRelayerStore?: RelayerMemoryStore
}

const relayerStore: RelayerMemoryStore =
  globalForRelayer.__umunnaRelayerStore ?? {
    creditedPaymentRefs: new Map(),
    settledTxHashes: new Set(),
  }

globalForRelayer.__umunnaRelayerStore = relayerStore

function getRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL?.trim() ||
    "https://sepolia.base.org"
  )
}

export function getPublicBaseClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  })
}

function getRelayerWalletClient() {
  const rawKey = process.env.RELAYER_PRIVATE_KEY?.trim() || ""
  if (!/^0x[a-fA-F0-9]{64}$/.test(rawKey)) {
    return null
  }
  const account = privateKeyToAccount(rawKey as `0x${string}`)
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  })
  return { account, client }
}

function deriveDeterministicDemoHash(seed: string): `0x${string}` {
  const digest = crypto.createHash("sha256").update(seed).digest("hex")
  return `0x${digest}`
}

export async function creditPotFromRoqqu(params: {
  communityId: number
  amountUsdc: number
  contributorTag: string
  paymentReference: string
}): Promise<{
  txHash: `0x${string}`
  mode: "onchain" | "simulated"
  duplicate: boolean
}> {
  const normalizedRef = params.paymentReference.trim().toUpperCase()
  const existing = relayerStore.creditedPaymentRefs.get(normalizedRef)
  if (existing) {
    return {
      txHash: existing.txHash,
      mode: existing.mode,
      duplicate: true,
    }
  }

  const rawUsdcAmount = parseUnits(
    Math.max(params.amountUsdc, 0.01).toFixed(6),
    USDC_DECIMALS
  )

  const relayer = getRelayerWalletClient()
  if (isContractConfigured() && relayer) {
    try {
      const publicClient = getPublicBaseClient()
      const { account, client } = relayer

      // In Solidity, community IDs are 1-indexed. If <= 0 is passed, normalize to 1.
      const targetPotId =
        params.communityId <= 0 ? BigInt(1) : BigInt(params.communityId)

      // Ensure the community exists on Base Sepolia. If on-chain count is smaller, auto-provision:
      const totalOnchain = await publicClient.readContract({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "communityCount",
      })

      if (totalOnchain < targetPotId) {
        const sampleSigners = [
          account.address,
          "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" as `0x${string}`,
          "0x90f79bf6eb2c4f870365e785982e1f101e93b906" as `0x${string}`,
        ]
        const createHash = await client.writeContract({
          address: UMUNNA_POT_ADDRESS,
          abi: UMUNNA_POT_ABI,
          functionName: "createCommunity",
          args: [
            targetPotId === BigInt(1)
              ? "Enugu Town Union Health Pot"
              : "UNN '19 Lab Solar Upgrade Pot",
            sampleSigners,
            2,
          ],
        })
        await publicClient.waitForTransactionReceipt({ hash: createHash })
      }

      const balance = await publicClient.readContract({
        address: MOCK_USDC_ADDRESS,
        abi: MOCK_USDC_ABI,
        functionName: "balanceOf",
        args: [account.address],
      })

      if (balance < rawUsdcAmount) {
        const mintHash = await client.writeContract({
          address: MOCK_USDC_ADDRESS,
          abi: MOCK_USDC_ABI,
          functionName: "mint",
          args: [account.address, rawUsdcAmount * BigInt(10)],
        })
        await publicClient.waitForTransactionReceipt({ hash: mintHash })
      }

      const allowance = await publicClient.readContract({
        address: MOCK_USDC_ADDRESS,
        abi: MOCK_USDC_ABI,
        functionName: "allowance",
        args: [account.address, UMUNNA_POT_ADDRESS],
      })

      if (allowance < rawUsdcAmount) {
        const approveHash = await client.writeContract({
          address: MOCK_USDC_ADDRESS,
          abi: MOCK_USDC_ABI,
          functionName: "approve",
          args: [UMUNNA_POT_ADDRESS, rawUsdcAmount * BigInt(100)],
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      const txHash = await client.writeContract({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "contribute",
        args: [targetPotId, rawUsdcAmount, params.contributorTag],
      })
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      relayerStore.creditedPaymentRefs.set(normalizedRef, {
        txHash,
        mode: "onchain",
      })

      return { txHash, mode: "onchain", duplicate: false }
    } catch (onchainErr) {
      console.warn(
        "[Relayer] Onchain execution notice, falling back to simulated mode:",
        onchainErr
      )
    }
  }

  const simulatedHash = deriveDeterministicDemoHash(
    `${normalizedRef}:${params.communityId}:${params.amountUsdc}`
  )
  relayerStore.creditedPaymentRefs.set(normalizedRef, {
    txHash: simulatedHash,
    mode: "simulated",
  })

  return { txHash: simulatedHash, mode: "simulated", duplicate: false }
}

export function isTxAlreadySettled(txHash: string): boolean {
  return relayerStore.settledTxHashes.has(txHash.toLowerCase())
}

export function markTxSettled(txHash: string): void {
  relayerStore.settledTxHashes.add(txHash.toLowerCase())
}

export async function verifyPayoutExecutionTx(
  txHash: `0x${string}`
): Promise<{ verifiedOnchain: boolean }> {
  if (!isContractConfigured()) {
    return { verifiedOnchain: false }
  }

  try {
    const publicClient = getPublicBaseClient()
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
    if (receipt.status !== "success") {
      throw new Error("On-chain transaction reverted.")
    }
    return { verifiedOnchain: true }
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("On-chain transaction reverted")
    ) {
      throw err
    }
    return { verifiedOnchain: false }
  }
}
