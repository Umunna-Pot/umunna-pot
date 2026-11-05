import { decodeEventLog } from "viem"
import {
  UMUNNA_POT_ABI,
  UMUNNA_POT_ADDRESS,
} from "./contracts"

export type SyncStatus =
  | "IDLE"
  | "PENDING_ON_CHAIN"
  | "ON_CHAIN_SUCCESS_DATABASE_SYNC_PENDING"
  | "ON_CHAIN_SUCCESS_DATABASE_SYNCED"
  | "FAILED"

export interface DecodedVaultCreatedLog {
  vaultId: bigint
  funder: `0x${string}`
  beneficiary: `0x${string}`
  guardian: `0x${string}`
  totalAmount: bigint
  installmentAmount: bigint
  intervalSeconds: bigint
  firstReleaseAt: bigint
  logIndex: number
  blockNumber: bigint
  blockHash: `0x${string}`
  transactionHash: `0x${string}`
}

export interface DecodedVaultReleasedLog {
  vaultId: bigint
  beneficiary: `0x${string}`
  amount: bigint
  remainingAmount: bigint
  logIndex: number
  blockNumber: bigint
  blockHash: `0x${string}`
  transactionHash: `0x${string}`
}

export interface ExpectedVaultCreationParams {
  funder: `0x${string}`
  beneficiary: `0x${string}`
  guardian: `0x${string}`
  totalAmount: bigint
  installmentAmount: bigint
  intervalSeconds: bigint
  firstReleaseAt?: bigint
}

export interface OnChainVaultState {
  funder: `0x${string}`
  beneficiary: `0x${string}`
  guardian: `0x${string}`
  totalAmount: bigint
  remainingAmount: bigint
  installmentAmount: bigint
  intervalSeconds: bigint
  nextReleaseAt: bigint
  releasedCount: number | bigint
  active: boolean
  earlyExitRequested: boolean
  exists: boolean
}

export interface SyncDripVaultResult {
  status: SyncStatus
  txHash: `0x${string}`
  vaultId?: bigint
  blockNumber?: bigint
  databaseVault?: Record<string, unknown>
  idempotent?: boolean
  error?: string
  canRetrySync: boolean
}

/**
 * Extracts and strictly validates the VaultCreated event from a Base Sepolia transaction receipt.
 * Ensures emitter matches UMUNNA_POT_ADDRESS, sender matches funder, and checks submitted parameters.
 */
export function extractVaultCreatedEvent(
  receipt: {
    logs: Array<{
      address: string
      data: `0x${string}`
      topics: [signature: `0x${string}`, ...args: `0x${string}`[]] | []
      logIndex: number | bigint
    }>
    status: "success" | "reverted"
    to: string | null
    from: string
    blockNumber: bigint
    blockHash: `0x${string}`
    transactionHash: `0x${string}`
  },
  expected?: ExpectedVaultCreationParams
): DecodedVaultCreatedLog {
  if (receipt.status !== "success") {
    throw new Error("Transaction failed or reverted on Base Sepolia.")
  }

  const targetContract = UMUNNA_POT_ADDRESS.toLowerCase()
  if (!receipt.to || receipt.to.toLowerCase() !== targetContract) {
    throw new Error("Transaction destination is not the configured UmunnaPot contract.")
  }

  let foundEvent: DecodedVaultCreatedLog | null = null

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== targetContract) continue

    try {
      const decoded = decodeEventLog({
        abi: UMUNNA_POT_ABI,
        data: log.data,
        topics: log.topics,
      })

      if (decoded.eventName === "VaultCreated") {
        if (foundEvent !== null) {
          throw new Error("Ambiguous transaction: Multiple VaultCreated events detected in single receipt.")
        }

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

        foundEvent = {
          vaultId: args.vaultId,
          funder: args.funder,
          beneficiary: args.beneficiary,
          guardian: args.guardian,
          totalAmount: args.totalAmount,
          installmentAmount: args.installmentAmount,
          intervalSeconds: args.intervalSeconds,
          firstReleaseAt: args.firstReleaseAt,
          logIndex: Number(log.logIndex),
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          transactionHash: receipt.transactionHash,
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Ambiguous transaction")) {
        throw e
      }
      // Non-matching logs skipped
      continue
    }
  }

  if (!foundEvent) {
    throw new Error("No VaultCreated event was emitted by the UmunnaPot contract in this transaction.")
  }

  // Sender matching
  if (receipt.from.toLowerCase() !== foundEvent.funder.toLowerCase()) {
    throw new Error("Transaction sender does not match the vault funder recorded in the event.")
  }

  // Field sanity
  if (foundEvent.totalAmount <= 0n) {
    throw new Error("Invalid VaultCreated event: totalAmount must be positive.")
  }
  if (foundEvent.installmentAmount <= 0n) {
    throw new Error("Invalid VaultCreated event: installmentAmount must be positive.")
  }
  if (foundEvent.installmentAmount > foundEvent.totalAmount) {
    throw new Error("Invalid VaultCreated event: installmentAmount exceeds totalAmount.")
  }
  if (foundEvent.intervalSeconds < 30n) {
    throw new Error("Invalid VaultCreated event: intervalSeconds is less than contract minimum (30s).")
  }

  // If expected submitted parameters are provided, strictly verify against event
  if (expected) {
    if (foundEvent.funder.toLowerCase() !== expected.funder.toLowerCase()) {
      throw new Error("Event funder does not match submitted funder parameter.")
    }
    if (foundEvent.beneficiary.toLowerCase() !== expected.beneficiary.toLowerCase()) {
      throw new Error("Event beneficiary does not match submitted beneficiary parameter.")
    }
    if (foundEvent.guardian.toLowerCase() !== expected.guardian.toLowerCase()) {
      throw new Error("Event guardian does not match submitted guardian parameter.")
    }
    if (foundEvent.totalAmount !== expected.totalAmount) {
      throw new Error("Event totalAmount does not match submitted totalAmount parameter.")
    }
    if (foundEvent.installmentAmount !== expected.installmentAmount) {
      throw new Error("Event installmentAmount does not match submitted installmentAmount parameter.")
    }
    if (foundEvent.intervalSeconds !== expected.intervalSeconds) {
      throw new Error("Event intervalSeconds does not match submitted intervalSeconds parameter.")
    }
    if (expected.firstReleaseAt && expected.firstReleaseAt > 0n && foundEvent.firstReleaseAt !== expected.firstReleaseAt) {
      throw new Error("Event firstReleaseAt does not match submitted firstReleaseAt parameter.")
    }
  }

  return foundEvent
}

/**
 * Validates that on-chain getDripVault(vaultId) state matches the verified creation event.
 */
export function verifyOnChainStateMatchesEvent(
  state: OnChainVaultState,
  event: DecodedVaultCreatedLog
): void {
  if (!state.exists) {
    throw new Error("Contract state check failed: Vault does not exist in contract storage.")
  }
  if (!state.active) {
    throw new Error("Contract state check failed: Newly created vault is not active.")
  }
  if (state.funder.toLowerCase() !== event.funder.toLowerCase()) {
    throw new Error("Contract state funder mismatch against VaultCreated event.")
  }
  if (state.beneficiary.toLowerCase() !== event.beneficiary.toLowerCase()) {
    throw new Error("Contract state beneficiary mismatch against VaultCreated event.")
  }
  if (state.guardian.toLowerCase() !== event.guardian.toLowerCase()) {
    throw new Error("Contract state guardian mismatch against VaultCreated event.")
  }
  if (state.totalAmount !== event.totalAmount) {
    throw new Error("Contract state totalAmount mismatch against VaultCreated event.")
  }
  if (state.remainingAmount !== event.totalAmount) {
    throw new Error("Contract state initial remainingAmount must equal totalAmount.")
  }
  if (state.installmentAmount !== event.installmentAmount) {
    throw new Error("Contract state installmentAmount mismatch against VaultCreated event.")
  }
  if (BigInt(state.intervalSeconds) !== event.intervalSeconds) {
    throw new Error("Contract state intervalSeconds mismatch against VaultCreated event.")
  }
  if (state.nextReleaseAt !== event.firstReleaseAt) {
    throw new Error("Contract state nextReleaseAt mismatch against VaultCreated event.")
  }
  if (Number(state.releasedCount) !== 0) {
    throw new Error("Contract state initial releasedCount must be 0.")
  }
  if (state.earlyExitRequested) {
    throw new Error("Contract state initial earlyExitRequested must be false.")
  }
}

/**
 * Extracts and strictly validates the VaultReleased event from a Base Sepolia transaction receipt.
 * Confirms contract emitter, matching vaultId, valid beneficiary, and positive released amount.
 */
export function extractVaultReleasedEvent(
  receipt: {
    logs: Array<{
      address: string
      data: `0x${string}`
      topics: [signature: `0x${string}`, ...args: `0x${string}`[]] | []
      logIndex: number | bigint
    }>
    status: "success" | "reverted"
    to: string | null
    blockNumber: bigint
    blockHash: `0x${string}`
    transactionHash: `0x${string}`
  },
  expectedVaultId: bigint,
  expectedRecipient?: `0x${string}`
): DecodedVaultReleasedLog {
  if (receipt.status !== "success") {
    throw new Error("Release transaction failed or reverted on Base Sepolia.")
  }

  const targetContract = UMUNNA_POT_ADDRESS.toLowerCase()
  if (!receipt.to || receipt.to.toLowerCase() !== targetContract) {
    throw new Error("Release transaction destination is not the configured UmunnaPot contract.")
  }

  let foundEvent: DecodedVaultReleasedLog | null = null

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== targetContract) continue

    try {
      const decoded = decodeEventLog({
        abi: UMUNNA_POT_ABI,
        data: log.data,
        topics: log.topics,
      })

      if (decoded.eventName === "VaultReleased") {
        const args = decoded.args as {
          vaultId: bigint
          beneficiary: `0x${string}`
          amount: bigint
          remainingAmount: bigint
        }

        if (args.vaultId === expectedVaultId) {
          if (foundEvent !== null) {
            throw new Error("Ambiguous transaction: Multiple VaultReleased events for the same vault ID in receipt.")
          }

          foundEvent = {
            vaultId: args.vaultId,
            beneficiary: args.beneficiary,
            amount: args.amount,
            remainingAmount: args.remainingAmount,
            logIndex: Number(log.logIndex),
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            transactionHash: receipt.transactionHash,
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Ambiguous transaction")) {
        throw e
      }
      continue
    }
  }

  if (!foundEvent) {
    throw new Error(`No VaultReleased event for vault ID ${expectedVaultId} was found in receipt.`)
  }

  if (foundEvent.amount <= 0n) {
    throw new Error("Invalid VaultReleased event: released amount must be positive.")
  }

  if (expectedRecipient && foundEvent.beneficiary.toLowerCase() !== expectedRecipient.toLowerCase()) {
    throw new Error("VaultReleased recipient does not match the vault beneficiary.")
  }

  return foundEvent
}

/**
 * Submits the confirmed transaction hash to the hardened POST /api/drip-vaults endpoint.
 * This operation is purely idempotent and never creates another on-chain vault.
 */
export async function syncConfirmedVaultWithApi(
  txHash: `0x${string}`,
  vaultId?: bigint,
  blockNumber?: bigint
): Promise<SyncDripVaultResult> {
  try {
    const res = await fetch("/api/drip-vaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        status: "ON_CHAIN_SUCCESS_DATABASE_SYNC_PENDING",
        txHash,
        vaultId,
        blockNumber,
        error: data.error || `HTTP ${res.status}: Failed to synchronize with database`,
        canRetrySync: true,
      }
    }

    return {
      status: "ON_CHAIN_SUCCESS_DATABASE_SYNCED",
      txHash,
      vaultId,
      blockNumber,
      databaseVault: data.vault,
      idempotent: Boolean(data.idempotent),
      canRetrySync: false,
    }
  } catch (netErr) {
    return {
      status: "ON_CHAIN_SUCCESS_DATABASE_SYNC_PENDING",
      txHash,
      vaultId,
      blockNumber,
      error: netErr instanceof Error ? netErr.message : "Network error contacting database API",
      canRetrySync: true,
    }
  }
}
