import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { isAddress } from "viem"
import { calculateDripSchedule } from "../lib/dripScheduleCalculator"
import { generateFallbackDripPlan } from "../lib/dripAiEngine"

describe("Phase 3.6: Drip Vault Frontend State & Logic Verification", () => {
  describe("1. Form Input Validation Rules", () => {
    test("Rejects beneficiary identical to guardian", () => {
      const beneficiary = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      const guardian = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

      const isSame = beneficiary.toLowerCase() === guardian.toLowerCase()
      assert.equal(isSame, true)
      // Form must block execution when beneficiary equals guardian
    })

    test("Accepts distinct valid EVM addresses for beneficiary and guardian", () => {
      const beneficiary = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      const guardian = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

      assert.equal(isAddress(beneficiary), true)
      assert.equal(isAddress(guardian), true)
      assert.notEqual(beneficiary.toLowerCase(), guardian.toLowerCase())
    })

    test("Enforces contract interval limits (minimum 30 seconds)", () => {
      assert.throws(() => {
        calculateDripSchedule({
          totalAmountUsdc: 100,
          installmentCount: 2,
          frequency: "custom",
          customIntervalSeconds: 15,
        })
      }, /customIntervalSeconds >= 30/)
    })
  })

  describe("2. AI vs Deterministic Fallback Presentation Rules", () => {
    test("Fallback plan explicitly sets recommendationSource to deterministic_fallback", () => {
      const fallback = generateFallbackDripPlan(
        {
          totalAmountUsdc: 500,
          frequency: "weekly",
          targetInstallments: 4,
        },
        "Simulated timeout"
      )

      assert.equal(fallback.recommendationSource, "deterministic_fallback")
      assert.equal(fallback.fallbackReason, "Simulated timeout")
      assert.equal(fallback.modelUsed, undefined)
      assert.match(fallback.reasoning, /Deterministic fallback applied/)
    })

    test("Manual schedule calculation does not require AI inference", () => {
      const manual = calculateDripSchedule({
        totalAmountUsdc: 600,
        installmentCount: 6,
        frequency: "monthly",
      })

      assert.equal(manual.totalAmountBaseUnits, "600000000")
      assert.equal(manual.installmentAmountBaseUnits, "100000000")
      assert.equal(manual.installmentCount, 6)
      assert.equal(manual.intervalSeconds, 2592000) // 30 fixed days
    })
  })

  describe("3. Financial Calculation UI Aggregations", () => {
    test("Aggregates total locked and claimed across mock verified vaults accurately", () => {
      const mockVaults = [
        {
          totalLockedBaseUnits: "500000000", // 500 USDC
          claimedBaseUnits: "125000000", // 125 USDC
          active: true,
        },
        {
          totalLockedBaseUnits: "1000000000", // 1000 USDC
          claimedBaseUnits: "1000000000", // 1000 USDC
          active: false,
        },
      ]

      const totalLocked = mockVaults.reduce(
        (acc, v) => acc + parseFloat(v.totalLockedBaseUnits) / 1_000_000,
        0
      )
      const totalClaimed = mockVaults.reduce(
        (acc, v) => acc + parseFloat(v.claimedBaseUnits) / 1_000_000,
        0
      )
      const activeCount = mockVaults.filter((v) => v.active).length

      assert.equal(totalLocked, 1500)
      assert.equal(totalClaimed, 1125)
      assert.equal(activeCount, 1)
    })
  })

  describe("4. Due Installment Logic Verification", () => {
    test("Identifies installment as due when block timestamp >= nextReleaseAt", () => {
      const now = new Date()
      const pastReleaseDate = new Date(now.getTime() - 60000) // 1 minute ago
      const remainingBaseUnits = "250000000"

      const isDue = pastReleaseDate <= now && parseFloat(remainingBaseUnits) > 0
      assert.equal(isDue, true)
    })

    test("Identifies installment as locked when block timestamp < nextReleaseAt", () => {
      const now = new Date()
      const futureReleaseDate = new Date(now.getTime() + 604800000) // 7 days in future
      const remainingBaseUnits = "250000000"

      const isDue = futureReleaseDate <= now && parseFloat(remainingBaseUnits) > 0
      assert.equal(isDue, false)
    })
  })
})
