import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { calculateDripSchedule } from "../lib/dripScheduleCalculator"
import { dripPlanRequestSchema, rawAiRecommendationSchema } from "../lib/aiSchemas"
import { generateFallbackDripPlan } from "../lib/dripAiEngine"

describe("Phase 3.5: AI Drip Vault Schedule Engine & Financial Precision", () => {
  describe("Deterministic Financial Calculations (lib/dripScheduleCalculator.ts)", () => {
    test("Calculates exact 6-decimal base units without floating point inaccuracy", () => {
      const result = calculateDripSchedule({
        totalAmountUsdc: 1000,
        installmentCount: 4,
        frequency: "weekly",
      })

      assert.equal(result.totalAmountBaseUnits, "1000000000") // 1000 * 10^6
      assert.equal(result.installmentAmountBaseUnits, "250000000") // 250 * 10^6
      assert.equal(result.remainderBaseUnits, "0")
      assert.equal(result.installmentCount, 4)
      assert.equal(result.intervalSeconds, 604800) // 7 days
      assert.equal(result.schedule.length, 4)

      // Verify every schedule item
      const sum = result.schedule.reduce(
        (acc, item) => acc + BigInt(item.amountBaseUnits),
        0n
      )
      assert.equal(sum, BigInt(result.totalAmountBaseUnits))
    })

    test("Properly distributes remainder into the final installment", () => {
      // 100 USDC divided by 3 = 33.333333 each + 0.000001 remainder
      // 100,000,000 micro-units / 3 = 33,333,333 remainder 1
      const result = calculateDripSchedule({
        totalAmountUsdc: 100,
        installmentCount: 3,
        frequency: "daily",
      })

      assert.equal(result.totalAmountBaseUnits, "100000000")
      assert.equal(result.installmentAmountBaseUnits, "33333333")
      assert.equal(result.remainderBaseUnits, "1")
      assert.equal(result.intervalSeconds, 86400) // 1 day

      assert.equal(result.schedule[0].amountBaseUnits, "33333333")
      assert.equal(result.schedule[0].isRemainder, false)
      assert.equal(result.schedule[1].amountBaseUnits, "33333333")
      assert.equal(result.schedule[1].isRemainder, false)
      assert.equal(result.schedule[2].amountBaseUnits, "33333334") // base + remainder
      assert.equal(result.schedule[2].isRemainder, true)

      // Sum strictly equals total
      const sum = result.schedule.reduce(
        (acc, item) => acc + BigInt(item.amountBaseUnits),
        0n
      )
      assert.equal(sum, 100000000n)
    })

    test("Calculates correct fixed monthly interval (2,592,000 seconds)", () => {
      const result = calculateDripSchedule({
        totalAmountUsdc: 3000,
        installmentCount: 3,
        frequency: "monthly",
      })

      assert.equal(result.intervalSeconds, 2592000) // 30 fixed days
      assert.equal(result.schedule[0].scheduledOffsetSeconds, 2592000)
      assert.equal(result.schedule[1].scheduledOffsetSeconds, 5184000)
      assert.equal(result.schedule[2].scheduledOffsetSeconds, 7776000)
    })

    test("Rejects custom interval below smart contract minimum (30 seconds)", () => {
      assert.throws(
        () => {
          calculateDripSchedule({
            totalAmountUsdc: 500,
            installmentCount: 2,
            frequency: "custom",
            customIntervalSeconds: 29, // Less than 30
          })
        },
        /customIntervalSeconds >= 30/
      )
    })

    test("Rejects non-positive or zero amount", () => {
      assert.throws(
        () => {
          calculateDripSchedule({
            totalAmountUsdc: 0,
            installmentCount: 2,
            frequency: "weekly",
          })
        },
        /Total amount must be greater than zero/
      )
    })

    test("Rejects more installments than total base units", () => {
      assert.throws(
        () => {
          calculateDripSchedule({
            totalAmountUsdc: 0.000001, // 1 base unit
            installmentCount: 2, // 2 installments
            frequency: "weekly",
          })
        },
        /cannot be split/
      )
    })
  })

  describe("Zod Request and AI Schema Validation (lib/aiSchemas.ts)", () => {
    test("Validates valid drip plan request inputs", () => {
      const valid = {
        totalAmountUsdc: 2500,
        frequency: "weekly",
        targetInstallments: 5,
        purpose: "Full stack milestone completion",
      }
      const parsed = dripPlanRequestSchema.safeParse(valid)
      assert.equal(parsed.success, true)
    })

    test("Rejects negative or zero amount in request schema", () => {
      const invalid = {
        totalAmountUsdc: -100,
        frequency: "weekly",
      }
      const parsed = dripPlanRequestSchema.safeParse(invalid)
      assert.equal(parsed.success, false)
    })

    test("Rejects invalid frequency in request schema", () => {
      const invalid = {
        totalAmountUsdc: 100,
        frequency: "hourly", // Unsupported
      }
      const parsed = dripPlanRequestSchema.safeParse(invalid)
      assert.equal(parsed.success, false)
    })

    test("Validates AI structured JSON schema", () => {
      const validAiOutput = {
        recommendedInstallmentCount: 4,
        recommendedFrequency: "weekly",
        recommendedIntervalSeconds: 604800,
        reasoning: "A four-week schedule matches typical sprint delivery cadence.",
        assumptions: ["Work is delivered weekly", "Client reviews within 48h"],
      }
      const parsed = rawAiRecommendationSchema.safeParse(validAiOutput)
      assert.equal(parsed.success, true)
    })

    test("Rejects AI output with interval below 30s", () => {
      const invalidAiOutput = {
        recommendedInstallmentCount: 4,
        recommendedFrequency: "weekly",
        recommendedIntervalSeconds: 10, // Invalid
        reasoning: "Too fast",
        assumptions: [],
      }
      const parsed = rawAiRecommendationSchema.safeParse(invalidAiOutput)
      assert.equal(parsed.success, false)
    })
  })

  describe("Deterministic Fallback Generation (lib/dripAiEngine.ts)", () => {
    test("Generates complete, verified fallback plan when AI is bypassed or fails", () => {
      const fallback = generateFallbackDripPlan(
        {
          totalAmountUsdc: 1200,
          frequency: "monthly",
        },
        "Test simulation fallback"
      )

      assert.equal(fallback.recommendationSource, "deterministic_fallback")
      assert.equal(fallback.fallbackReason, "Test simulation fallback")
      assert.equal(fallback.totalAmountBaseUnits, "1200000000")
      assert.equal(fallback.installmentCount, 3)
      assert.equal(fallback.installmentAmountBaseUnits, "400000000")
      assert.equal(fallback.intervalSeconds, 2592000)
      assert.equal(fallback.schedule.length, 3)
      assert.match(fallback.reasoning, /Deterministic fallback applied/)
      assert.match(fallback.contractNotice, /UmunnaPot.sol enforces intervalSeconds >= 30/)
      assert.match(fallback.userReviewNotice, /funder retains absolute custody/)
    })
  })
})
