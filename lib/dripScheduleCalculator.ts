import { parseUnits, formatUnits } from "viem"
import {
  FREQUENCY_INTERVAL_SECONDS,
  ScheduleItem,
  SupportedFrequency,
} from "./aiSchemas"

export interface CalculationInput {
  totalAmountUsdc: number
  installmentCount: number
  frequency: SupportedFrequency
  customIntervalSeconds?: number
  firstReleaseDelaySeconds?: number
}

export interface CalculationResult {
  totalAmountBaseUnits: string
  totalAmountUsdc: number
  installmentAmountBaseUnits: string
  installmentAmountUsdc: number
  installmentCount: number
  intervalSeconds: number
  firstReleaseDelaySeconds: number
  remainderBaseUnits: string
  schedule: ScheduleItem[]
}

/**
 * Deterministically computes financial values and schedules using BigInt base units (6 decimals).
 *
 * Rules:
 * 1. Financial calculation is strictly deterministic, never delegated to an LLM.
 * 2. 1 USDC = 1,000,000 base units (6 decimals).
 * 3. Base units = parseUnits(totalAmountUsdc.toFixed(6), 6).
 * 4. Contract enforces intervalSeconds >= 30.
 * 5. Remainder from integer division is placed in the final installment so that:
 *    sum(schedule.map(s => BigInt(s.amountBaseUnits))) === BigInt(totalAmountBaseUnits)
 */
export function calculateDripSchedule(input: CalculationInput): CalculationResult {
  const { totalAmountUsdc, installmentCount, frequency, customIntervalSeconds, firstReleaseDelaySeconds = 0 } = input

  if (totalAmountUsdc <= 0) {
    throw new Error("Total amount must be greater than zero.")
  }

  if (!Number.isInteger(installmentCount) || installmentCount <= 0) {
    throw new Error("Installment count must be a positive integer.")
  }

  // Determine interval seconds
  let intervalSeconds: number
  if (frequency === "custom") {
    if (!customIntervalSeconds || customIntervalSeconds < 30) {
      throw new Error("Custom frequency requires customIntervalSeconds >= 30.")
    }
    intervalSeconds = customIntervalSeconds
  } else {
    intervalSeconds = Number(FREQUENCY_INTERVAL_SECONDS[frequency])
  }

  if (intervalSeconds < 30) {
    throw new Error("Interval seconds cannot be less than contract minimum (30 seconds).")
  }

  if (firstReleaseDelaySeconds < 0) {
    throw new Error("First release delay seconds cannot be negative.")
  }

  // Parse total USDC with exact 6 decimal precision
  // Format to 6 decimal string first to avoid floating point anomalies
  const totalUsdcFormatted = totalAmountUsdc.toFixed(6)
  const totalBaseUnits = parseUnits(totalUsdcFormatted, 6)

  if (totalBaseUnits === 0n) {
    throw new Error("Total amount in base units must be greater than 0.")
  }

  const countBig = BigInt(installmentCount)
  if (totalBaseUnits < countBig) {
    throw new Error(`Total amount ${totalAmountUsdc} USDC (${totalBaseUnits} micro-units) cannot be split across ${installmentCount} installments (minimum 1 micro-unit per installment).`)
  }

  const basePerInstallment = totalBaseUnits / countBig
  const remainder = totalBaseUnits % countBig

  const schedule: ScheduleItem[] = []
  let accumulated = 0n

  for (let i = 1; i <= installmentCount; i++) {
    // Offset calculation:
    // First release happens after firstReleaseDelaySeconds (or firstReleaseDelaySeconds + intervalSeconds if delay is 0).
    // In UmunnaPot.sol:
    // vault.startTime = block.timestamp
    // vault.lastDripTime = block.timestamp
    // vault.nextDripTime = block.timestamp + intervalSeconds
    // So the standard first release is at +intervalSeconds (plus any initial delay offset).
    const scheduledOffsetSeconds = firstReleaseDelaySeconds + (i * intervalSeconds)

    const isLast = i === installmentCount
    const amountBig = isLast ? basePerInstallment + remainder : basePerInstallment
    accumulated += amountBig

    schedule.push({
      releaseIndex: i,
      amountBaseUnits: amountBig.toString(),
      amountUsdc: Number(formatUnits(amountBig, 6)),
      scheduledOffsetSeconds,
      isRemainder: isLast && remainder > 0n,
    })
  }

  // Self-verification check
  if (accumulated !== totalBaseUnits) {
    throw new Error(`Schedule calculation integrity failure: total ${totalBaseUnits} != accumulated ${accumulated}`)
  }

  return {
    totalAmountBaseUnits: totalBaseUnits.toString(),
    totalAmountUsdc: Number(formatUnits(totalBaseUnits, 6)),
    installmentAmountBaseUnits: basePerInstallment.toString(),
    installmentAmountUsdc: Number(formatUnits(basePerInstallment, 6)),
    installmentCount,
    intervalSeconds,
    firstReleaseDelaySeconds,
    remainderBaseUnits: remainder.toString(),
    schedule,
  }
}
