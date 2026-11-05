import { z } from "zod"

/**
 * Standard frequency cadences compatible with the deployed UmunnaPot smart contract.
 * The contract enforces fixed intervalSeconds (minimum 30 seconds).
 */
export const SUPPORTED_FREQUENCIES = ["daily", "weekly", "monthly", "custom"] as const
export type SupportedFrequency = (typeof SUPPORTED_FREQUENCIES)[number]

export const FREQUENCY_INTERVAL_SECONDS: Record<Exclude<SupportedFrequency, "custom">, bigint> = {
  daily: 86400n, // 1 day
  weekly: 604800n, // 7 days
  monthly: 2592000n, // 30 fixed days (non-calendar-aware)
}

/**
 * Input schema for POST /api/ai/drip-plan
 */
export const dripPlanRequestSchema = z.object({
  totalAmountUsdc: z
    .coerce
    .number()
    .positive("Total amount must be greater than zero.")
    .max(10_000_000, "Maximum recommendation limit is 10,000,000 USDC"),
  frequency: z.enum(SUPPORTED_FREQUENCIES).default("weekly"),
  targetInstallments: z.coerce.number().int().positive().max(100).optional(),
  purpose: z.string().trim().max(500).optional(),
  beneficiaryContext: z.string().trim().max(500).optional(),
  firstReleaseDelaySeconds: z.coerce.number().int().nonnegative().max(31536000).optional(), // Up to 1 year
  customIntervalSeconds: z.coerce.number().int().min(30, "Minimum contract interval is 30 seconds").max(31536000).optional(),
})

export type DripPlanRequest = z.infer<typeof dripPlanRequestSchema>

/**
 * Structured schema that the OpenRouter model must adhere to.
 */
export const rawAiRecommendationSchema = z.object({
  recommendedInstallmentCount: z.number().int().positive(),
  recommendedFrequency: z.enum(SUPPORTED_FREQUENCIES),
  recommendedIntervalSeconds: z.number().int().min(30),
  reasoning: z.string().trim().min(10).max(1000),
  assumptions: z.array(z.string().trim().max(300)).max(10),
  notesOnContractCompatibility: z.string().trim().max(500).optional(),
})

export type RawAiRecommendation = z.infer<typeof rawAiRecommendationSchema>

/**
 * Verified, deterministic release schedule item calculated by application code using BigInt.
 */
export interface ScheduleItem {
  releaseIndex: number
  amountBaseUnits: string
  amountUsdc: number
  scheduledOffsetSeconds: number
  isRemainder: boolean
}

/**
 * Final response schema returned to clients by POST /api/ai/drip-plan
 */
export interface DripPlanResponse {
  recommendationSource: "openrouter_ai" | "deterministic_fallback"
  fallbackReason?: string
  modelUsed?: string
  totalAmountBaseUnits: string
  totalAmountUsdc: number
  installmentAmountBaseUnits: string
  installmentAmountUsdc: number
  installmentCount: number
  intervalSeconds: number
  firstReleaseDelaySeconds: number
  frequency: SupportedFrequency
  schedule: ScheduleItem[]
  remainderBaseUnits: string
  reasoning: string
  assumptions: string[]
  contractNotice: string
  userReviewNotice: string
}
