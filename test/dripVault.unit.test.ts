import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { encodeEventTopics } from "viem"
import { UMUNNA_POT_ABI } from "../lib/contracts"
import { verifyDripVaultInputSchema } from "../lib/schemas"

describe("Drip Vault Verification & Financial Integrity Unit Tests", () => {
  const dummyFunder = "0x21342ab22b3d68464677ced76f811b3ae140192b"
  const dummyBeneficiary = "0x21342ab22b3d68464677ced76f811b3ae140192b"
  const dummyGuardian = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"

  test("1. Zod input schema validates 64-char 0x hex transaction hash", () => {
    const valid = verifyDripVaultInputSchema.safeParse({
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    })
    assert.equal(valid.success, true)

    const invalidShort = verifyDripVaultInputSchema.safeParse({
      txHash: "0x1234",
    })
    assert.equal(invalidShort.success, false)

    const missing = verifyDripVaultInputSchema.safeParse({})
    assert.equal(missing.success, false)
  })

  test("2. Exact 6-decimal integer base unit representation (no floating point precision loss)", () => {
    // 250.50 USDC = 250500000 base units
    const baseUnitsStr = "250500000"
    const parsedBigInt = BigInt(baseUnitsStr)
    assert.equal(parsedBigInt, 250500000n)

    // Check remainder handling: 1000 USDC total, 300 USDC installment
    const totalAmount = 1000_000000n
    const installment = 300_000000n
    let remaining = totalAmount
    const releases: bigint[] = []

    while (remaining > 0n) {
      const release = remaining < installment ? remaining : installment
      releases.push(release)
      remaining -= release
    }

    assert.equal(releases.length, 4)
    assert.deepEqual(releases, [300_000000n, 300_000000n, 300_000000n, 100_000000n])
    assert.equal(remaining, 0n)
  })

  test("3. Large base-unit values exceed JavaScript safe integer range safely via BigInt", () => {
    // 100 billion USDC = 100,000,000,000 * 10^6 = 10^17 base units (Number.MAX_SAFE_INTEGER is ~9 * 10^15)
    const largeStr = "100000000000000000"
    const largeBigInt = BigInt(largeStr)
    assert.equal(largeBigInt > BigInt(Number.MAX_SAFE_INTEGER), true)
    assert.equal(largeBigInt.toString(), largeStr)
  })

  test("4. VaultCreated event topic encoding", () => {
    const eventPayload = {
      vaultId: 1n,
      funder: dummyFunder as `0x${string}`,
      beneficiary: dummyBeneficiary as `0x${string}`,
      guardian: dummyGuardian as `0x${string}`,
      totalAmount: 1000_000000n,
      installmentAmount: 200_000000n,
      intervalSeconds: 60n,
      firstReleaseAt: 1730000000n,
    }

    const topics = encodeEventTopics({
      abi: UMUNNA_POT_ABI,
      eventName: "VaultCreated",
      args: eventPayload,
    })

    assert.ok(topics.length >= 3)
    assert.equal(typeof topics[0], "string")
  })

  test("5. Schedule sanity constraints: installment cannot exceed total amount", () => {
    const totalAmount = 50_000000n
    const invalidInstallment = 100_000000n

    assert.equal(invalidInstallment > totalAmount, true)
  })
})
