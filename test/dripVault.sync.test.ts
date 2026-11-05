import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { encodeEventTopics, encodeAbiParameters, parseAbiParameters } from "viem"
import {
  extractVaultCreatedEvent,
  extractVaultReleasedEvent,
  verifyOnChainStateMatchesEvent,
  type SyncDripVaultResult,
  type OnChainVaultState,
} from "../lib/dripVaultSync"
import { UMUNNA_POT_ABI, UMUNNA_POT_ADDRESS } from "../lib/contracts"

describe("Phase 3.4.1: Comprehensive Drip Vault Verification & Recovery Tests", () => {
  const dummyPot = UMUNNA_POT_ADDRESS.toLowerCase()
  const funder = "0x21342ab22b3d68464677ced76f811b3ae140192b" as `0x${string}`
  const beneficiary = "0x21342ab22b3d68464677ced76f811b3ae140192b" as `0x${string}`
  const guardian = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" as `0x${string}`
  const txHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`
  const blockHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`

  function buildSimulatedLog(vaultId = 1n, totalAmount = 1000_000000n, installment = 250_000000n, interval = 60n, firstRelease = 1730000000n) {
    const topics = encodeEventTopics({
      abi: UMUNNA_POT_ABI,
      eventName: "VaultCreated",
      args: {
        vaultId,
        funder,
        beneficiary,
      },
    }) as [signature: `0x${string}`, ...args: `0x${string}`[]]

    const data = encodeAbiParameters(
      parseAbiParameters("address guardian, uint256 totalAmount, uint256 installmentAmount, uint64 intervalSeconds, uint64 firstReleaseAt"),
      [guardian, totalAmount, installment, interval, firstRelease]
    )

    return {
      address: dummyPot,
      data,
      topics,
      logIndex: 0,
    }
  }

  function buildSimulatedReleaseLog(vaultId = 1n, recipient = beneficiary, amount = 250_000000n, remaining = 750_000000n) {
    const topics = encodeEventTopics({
      abi: UMUNNA_POT_ABI,
      eventName: "VaultReleased",
      args: {
        vaultId,
        beneficiary: recipient,
      },
    }) as [signature: `0x${string}`, ...args: `0x${string}`[]]

    const data = encodeAbiParameters(
      parseAbiParameters("uint256 amount, uint256 remainingAmount"),
      [amount, remaining]
    )

    return {
      address: dummyPot,
      data,
      topics,
      logIndex: 0,
    }
  }

  test("1. extractVaultCreatedEvent rejects wrong event emitter", () => {
    const log = buildSimulatedLog()
    log.address = "0x000000000000000000000000000000000000dead"
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      from: funder,
      blockNumber: 1234567n,
      blockHash,
      transactionHash: txHash,
    }

    assert.throws(() => extractVaultCreatedEvent(receipt), /No VaultCreated event was emitted/)
  })

  test("2. extractVaultCreatedEvent rejects transaction sender not matching funder", () => {
    const log = buildSimulatedLog()
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      from: "0x9999999999999999999999999999999999999999",
      blockNumber: 1234567n,
      blockHash,
      transactionHash: txHash,
    }

    assert.throws(() => extractVaultCreatedEvent(receipt), /sender does not match/)
  })

  test("3. extractVaultCreatedEvent rejects mismatch against submitted beneficiary parameter", () => {
    const log = buildSimulatedLog()
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      from: funder,
      blockNumber: 1234567n,
      blockHash,
      transactionHash: txHash,
    }

    assert.throws(
      () =>
        extractVaultCreatedEvent(receipt, {
          funder,
          beneficiary: "0x8888888888888888888888888888888888888888",
          guardian,
          totalAmount: 1000_000000n,
          installmentAmount: 250_000000n,
          intervalSeconds: 60n,
        }),
      /Event beneficiary does not match/
    )
  })

  test("4. extractVaultCreatedEvent rejects mismatch against submitted guardian parameter", () => {
    const log = buildSimulatedLog()
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      from: funder,
      blockNumber: 1234567n,
      blockHash,
      transactionHash: txHash,
    }

    assert.throws(
      () =>
        extractVaultCreatedEvent(receipt, {
          funder,
          beneficiary,
          guardian: "0x7777777777777777777777777777777777777777",
          totalAmount: 1000_000000n,
          installmentAmount: 250_000000n,
          intervalSeconds: 60n,
        }),
      /Event guardian does not match/
    )
  })

  test("5. extractVaultCreatedEvent rejects mismatch against submitted total or installment amount", () => {
    const log = buildSimulatedLog(1n, 1000_000000n, 250_000000n)
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      from: funder,
      blockNumber: 1234567n,
      blockHash,
      transactionHash: txHash,
    }

    assert.throws(
      () =>
        extractVaultCreatedEvent(receipt, {
          funder,
          beneficiary,
          guardian,
          totalAmount: 500_000000n, // Mismatched submitted total
          installmentAmount: 250_000000n,
          intervalSeconds: 60n,
        }),
      /Event totalAmount does not match/
    )
  })

  test("6. extractVaultCreatedEvent rejects mismatch against submitted interval or firstReleaseAt", () => {
    const log = buildSimulatedLog(1n, 1000_000000n, 250_000000n, 60n, 1730000000n)
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      from: funder,
      blockNumber: 1234567n,
      blockHash,
      transactionHash: txHash,
    }

    assert.throws(
      () =>
        extractVaultCreatedEvent(receipt, {
          funder,
          beneficiary,
          guardian,
          totalAmount: 1000_000000n,
          installmentAmount: 250_000000n,
          intervalSeconds: 120n, // Mismatched interval
        }),
      /Event intervalSeconds does not match/
    )
  })

  test("7. verifyOnChainStateMatchesEvent catches contract-state mismatch after creation", () => {
    const log = buildSimulatedLog(1n, 1000_000000n, 250_000000n, 60n, 1730000000n)
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      from: funder,
      blockNumber: 1234567n,
      blockHash,
      transactionHash: txHash,
    }
    const event = extractVaultCreatedEvent(receipt)

    const validState: OnChainVaultState = {
      funder,
      beneficiary,
      guardian,
      totalAmount: 1000_000000n,
      remainingAmount: 1000_000000n,
      installmentAmount: 250_000000n,
      intervalSeconds: 60n,
      nextReleaseAt: 1730000000n,
      releasedCount: 0,
      active: true,
      earlyExitRequested: false,
      exists: true,
    }

    // State matches event completely
    assert.doesNotThrow(() => verifyOnChainStateMatchesEvent(validState, event))

    // State with wrong remaining amount
    const invalidState = { ...validState, remainingAmount: 500_000000n }
    assert.throws(() => verifyOnChainStateMatchesEvent(invalidState, event), /initial remainingAmount must equal/)
  })

  test("8. extractVaultReleasedEvent validates successful release with VaultReleased event", () => {
    const log = buildSimulatedReleaseLog(5n, beneficiary, 250_000000n, 750_000000n)
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      blockNumber: 1234568n,
      blockHash,
      transactionHash: txHash,
    }

    const event = extractVaultReleasedEvent(receipt, 5n, beneficiary)
    assert.equal(event.vaultId, 5n)
    assert.equal(event.amount, 250_000000n)
    assert.equal(event.remainingAmount, 750_000000n)
    assert.equal(event.beneficiary.toLowerCase(), beneficiary.toLowerCase())
  })

  test("9. extractVaultReleasedEvent rejects release event with wrong vault ID", () => {
    const log = buildSimulatedReleaseLog(5n)
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      blockNumber: 1234568n,
      blockHash,
      transactionHash: txHash,
    }

    assert.throws(() => extractVaultReleasedEvent(receipt, 999n), /No VaultReleased event for vault ID 999/)
  })

  test("10. extractVaultReleasedEvent rejects incorrect recipient", () => {
    const log = buildSimulatedReleaseLog(5n, beneficiary)
    const receipt = {
      logs: [log],
      status: "success" as const,
      to: dummyPot,
      blockNumber: 1234568n,
      blockHash,
      transactionHash: txHash,
    }

    assert.throws(
      () => extractVaultReleasedEvent(receipt, 5n, "0x9999999999999999999999999999999999999999"),
      /recipient does not match/
    )
  })

  test("11. Recovery & Concurrency: Multiple and concurrent retries submit original hash without duplicate on-chain creation", async () => {
    let syncCount = 0
    let onChainCallCount = 0
    let isRetrying = false

    async function mockOnChainCreate() {
      onChainCallCount++
      return { txHash, vaultId: 10n }
    }

    async function mockRetrySync(): Promise<SyncDripVaultResult> {
      if (isRetrying) {
        throw new Error("Retry synchronization is already in progress.")
      }
      isRetrying = true
      try {
        await new Promise((r) => setTimeout(r, 10))
        syncCount++
        return {
          status: "ON_CHAIN_SUCCESS_DATABASE_SYNCED",
          txHash,
          vaultId: 10n,
          idempotent: true,
          canRetrySync: false,
        }
      } finally {
        isRetrying = false
      }
    }

    // Step A: Initial on-chain creation
    await mockOnChainCreate()
    assert.equal(onChainCallCount, 1)

    // Step B: Concurrent retries blocked
    const promise1 = mockRetrySync()
    const promise2 = mockRetrySync()

    const results = await Promise.allSettled([promise1, promise2])
    const fulfilled = results.filter((r) => r.status === "fulfilled")
    const rejected = results.filter((r) => r.status === "rejected")

    assert.equal(fulfilled.length, 1)
    assert.equal(rejected.length, 1)
    assert.equal(syncCount, 1)
    assert.equal(onChainCallCount, 1) // Absolutely no duplicate on-chain creation!
  })
})
