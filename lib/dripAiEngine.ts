import { getOpenRouterConfig } from "./openrouter"
import {
  DripPlanRequest,
  DripPlanResponse,
  rawAiRecommendationSchema,
  RawAiRecommendation,
  FREQUENCY_INTERVAL_SECONDS,
  SupportedFrequency,
} from "./aiSchemas"
import { calculateDripSchedule } from "./dripScheduleCalculator"

const CONTRACT_NOTICE =
  "Smart contract enforcement: UmunnaPot.sol enforces intervalSeconds >= 30. All releases are executed via on-chain timelock. Beneficiary or funder must trigger release on-chain once intervals pass."
const USER_REVIEW_NOTICE =
  "Advisory notice: This schedule was generated with AI assistance. The funder retains absolute custody and must verify all parameters prior to signing transaction approvals or vault creation."

/**
 * Deterministic fallback generator used when OpenRouter is unreachable, rate limited,
 * unconfigured, or returns unparseable content.
 */
export function generateFallbackDripPlan(
  request: DripPlanRequest,
  fallbackReason: string
): DripPlanResponse {
  // If user specified targetInstallments, use that. Otherwise default:
  // daily -> 30, weekly -> 4, monthly -> 3, custom -> 4
  let count = request.targetInstallments
  if (!count) {
    if (request.frequency === "daily") count = 30
    else if (request.frequency === "weekly") count = 4
    else if (request.frequency === "monthly") count = 3
    else count = 4
  }

  const calc = calculateDripSchedule({
    totalAmountUsdc: request.totalAmountUsdc,
    installmentCount: count,
    frequency: request.frequency,
    customIntervalSeconds: request.customIntervalSeconds,
    firstReleaseDelaySeconds: request.firstReleaseDelaySeconds,
  })

  return {
    recommendationSource: "deterministic_fallback",
    fallbackReason,
    totalAmountBaseUnits: calc.totalAmountBaseUnits,
    totalAmountUsdc: calc.totalAmountUsdc,
    installmentAmountBaseUnits: calc.installmentAmountBaseUnits,
    installmentAmountUsdc: calc.installmentAmountUsdc,
    installmentCount: calc.installmentCount,
    intervalSeconds: calc.intervalSeconds,
    firstReleaseDelaySeconds: calc.firstReleaseDelaySeconds,
    frequency: request.frequency,
    schedule: calc.schedule,
    remainderBaseUnits: calc.remainderBaseUnits,
    reasoning: `Deterministic fallback applied (${fallbackReason}). Funds are distributed in ${calc.installmentCount} equal tranches on a ${request.frequency} basis with exact 6-decimal micro-unit precision.`,
    assumptions: [
      `Even distribution across ${calc.installmentCount} installments based strictly on user-supplied parameters.`,
      `Fallback used without AI inference due to: ${fallbackReason}.`,
      "Zero floating point rounding errors; remainder placed in final installment.",
    ],
    contractNotice: CONTRACT_NOTICE,
    userReviewNotice: USER_REVIEW_NOTICE,
  }
}

/**
 * Builds the prompt for OpenRouter AI recommendation.
 */
function buildSystemPrompt(): string {
  return `You are the Umunna Pot Advisory Scheduling Engine for Freelancer Drip Vaults on Base Sepolia.
Your role is strictly advisory: recommending the best payment cadence (frequency, installment count, and interval) based on the user's project context, milestones, and funding amount.

CRITICAL FINANCIAL & SECURITY CONSTRAINTS:
1. You do NOT calculate or alter financial amounts in base units. Application code handles all BigInt calculations.
2. You NEVER sign transactions, hold private keys, or interact with blockchains.
3. The underlying smart contract (UmunnaPot.sol) enforces:
   - intervalSeconds must be an integer >= 30.
   - Frequency options: "daily" (86400s), "weekly" (604800s), "monthly" (2592000s = 30 fixed days), "custom".
4. You MUST respond with ONLY a valid, raw JSON object matching this schema:
{
  "recommendedInstallmentCount": <positive integer between 1 and 100>,
  "recommendedFrequency": <"daily" | "weekly" | "monthly" | "custom">,
  "recommendedIntervalSeconds": <integer >= 30>,
  "reasoning": <concise string 10-1000 characters explaining the schedule fit>,
  "assumptions": <array of strings up to 10 items describing assumptions>,
  "notesOnContractCompatibility": <optional string>
}
Do NOT include markdown formatting, backticks, or explanatory text outside the JSON object.`
}

function buildUserPrompt(request: DripPlanRequest): string {
  return JSON.stringify({
    totalAmountUsdc: request.totalAmountUsdc,
    preferredFrequency: request.frequency,
    targetInstallments: request.targetInstallments || null,
    purpose: request.purpose || "Freelance project milestone compensation",
    beneficiaryContext: request.beneficiaryContext || "General independent contractor",
    firstReleaseDelaySeconds: request.firstReleaseDelaySeconds || 0,
    customIntervalSeconds: request.customIntervalSeconds || null,
  })
}

/**
 * Calls OpenRouter AI to generate an intelligent schedule recommendation,
 * then validates it and runs it through deterministic financial calculation.
 */
export async function generateAiDripPlan(request: DripPlanRequest): Promise<DripPlanResponse> {
  const config = getOpenRouterConfig()

  if (!config.apiKey || config.apiKey.includes("YOUR_") || config.apiKey.includes("your_")) {
    return generateFallbackDripPlan(request, "OPENROUTER_API_KEY is not configured")
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APPLICATION_URL ||
      "https://umunna-pot.vercel.app"

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appUrl,
        "X-Title": "Umunna Pot - AI Drip Vault Engine",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(request) },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      return generateFallbackDripPlan(
        request,
        `OpenRouter HTTP ${response.status}: ${errText.slice(0, 100)}`
      )
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      model?: string
    }

    const rawContent = payload.choices?.[0]?.message?.content
    if (!rawContent) {
      return generateFallbackDripPlan(request, "Empty response from OpenRouter")
    }

    // Clean potential markdown code fence wrappers
    let cleanJson = rawContent.trim()
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.slice(7).trim()
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.slice(3).trim()
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.slice(0, -3).trim()
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(cleanJson)
    } catch {
      return generateFallbackDripPlan(request, "Malformed JSON from OpenRouter")
    }

    const parseResult = rawAiRecommendationSchema.safeParse(parsedJson)
    if (!parseResult.success) {
      return generateFallbackDripPlan(
        request,
        `AI schema validation error: ${parseResult.error.issues[0]?.message || "Invalid structure"}`
      )
    }

    const aiRec: RawAiRecommendation = parseResult.data

    // If user explicitly requested custom frequency and provided customIntervalSeconds, prioritize user
    let chosenFrequency: SupportedFrequency = aiRec.recommendedFrequency
    let chosenInterval = aiRec.recommendedIntervalSeconds

    if (request.frequency === "custom" && request.customIntervalSeconds) {
      chosenFrequency = "custom"
      chosenInterval = request.customIntervalSeconds
    } else if (chosenFrequency !== "custom" && FREQUENCY_INTERVAL_SECONDS[chosenFrequency]) {
      chosenInterval = Number(FREQUENCY_INTERVAL_SECONDS[chosenFrequency])
    }

    if (chosenInterval < 30) {
      chosenInterval = 30
    }

    // If user specified targetInstallments, adhere to user preference
    const finalInstallments = request.targetInstallments || aiRec.recommendedInstallmentCount

    // Deterministically calculate the exact financial breakdown
    const calc = calculateDripSchedule({
      totalAmountUsdc: request.totalAmountUsdc,
      installmentCount: Math.min(Math.max(finalInstallments, 1), 100),
      frequency: chosenFrequency,
      customIntervalSeconds: chosenInterval,
      firstReleaseDelaySeconds: request.firstReleaseDelaySeconds,
    })

    return {
      recommendationSource: "openrouter_ai",
      modelUsed: payload.model || config.model,
      totalAmountBaseUnits: calc.totalAmountBaseUnits,
      totalAmountUsdc: calc.totalAmountUsdc,
      installmentAmountBaseUnits: calc.installmentAmountBaseUnits,
      installmentAmountUsdc: calc.installmentAmountUsdc,
      installmentCount: calc.installmentCount,
      intervalSeconds: calc.intervalSeconds,
      firstReleaseDelaySeconds: calc.firstReleaseDelaySeconds,
      frequency: chosenFrequency,
      schedule: calc.schedule,
      remainderBaseUnits: calc.remainderBaseUnits,
      reasoning: aiRec.reasoning,
      assumptions: aiRec.assumptions,
      contractNotice: CONTRACT_NOTICE,
      userReviewNotice: USER_REVIEW_NOTICE,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error"
    return generateFallbackDripPlan(request, `Exception during AI inference: ${message}`)
  } finally {
    clearTimeout(timeoutId)
  }
}
