/**
 * Server-only OpenRouter AI Client for Umunna Pot.
 * Phase 3 AI Engine Integration.
 * 
 * Never import or execute this module in client components.
 */

if (typeof window !== "undefined") {
  throw new Error("lib/openrouter.ts must only be imported on the server.")
}

export interface OpenRouterConfig {
  apiKey: string
  baseUrl: string
  model: string
  fallbackModel?: string
  timeoutMs: number
}

export interface OpenRouterVerificationResult {
  status: "READY" | "CONFIGURED BUT NOT VERIFIED" | "MISSING CONFIGURATION" | "BLOCKED"
  authenticated: boolean
  model: string
  baseUrl: string
  availableModelsCount?: number
  selectedModelFound?: boolean
  error?: string
  latencyMs?: number
}

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5"

export function getOpenRouterConfig(): OpenRouterConfig {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim()
  const rawBaseUrl = process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL
  const baseUrl = rawBaseUrl.replace(/\/+$/, "")
  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL
  const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL?.trim()
  const timeoutSec = parseInt(process.env.OPENROUTER_TIMEOUT_SECONDS || "60", 10)
  const timeoutMs = (!isNaN(timeoutSec) && timeoutSec > 0 ? timeoutSec : 60) * 1000

  return {
    apiKey,
    baseUrl,
    model,
    fallbackModel,
    timeoutMs,
  }
}

/**
 * Builds standard OpenRouter headers without leaking credentials to logs.
 */
function buildOpenRouterHeaders(apiKey: string): Record<string, string> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APPLICATION_URL ||
    "https://umunna-pot.vercel.app"

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": appUrl,
    "X-Title": "Umunna Pot - AI Drip Vault Engine",
  }
}

/**
 * Executes a server-side read-only connectivity check to OpenRouter.
 * Uses the authenticated GET /models endpoint.
 * DOES NOT execute any paid model inference or token consumption.
 */
export async function verifyOpenRouterConnectivity(): Promise<OpenRouterVerificationResult> {
  const config = getOpenRouterConfig()

  if (!config.apiKey || config.apiKey.includes("YOUR_") || config.apiKey.includes("your_")) {
    return {
      status: "MISSING CONFIGURATION",
      authenticated: false,
      model: config.model,
      baseUrl: config.baseUrl,
      error: "OPENROUTER_API_KEY is not configured or contains placeholder text.",
    }
  }

  const startTime = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      method: "GET",
      headers: buildOpenRouterHeaders(config.apiKey),
      signal: controller.signal,
      cache: "no-store",
    })

    const latencyMs = Date.now() - startTime

    if (response.status === 401 || response.status === 403) {
      return {
        status: "BLOCKED",
        authenticated: false,
        model: config.model,
        baseUrl: config.baseUrl,
        latencyMs,
        error: "OpenRouter authentication failed (401/403). Check your OPENROUTER_API_KEY.",
      }
    }

    if (response.status === 429) {
      return {
        status: "BLOCKED",
        authenticated: true,
        model: config.model,
        baseUrl: config.baseUrl,
        latencyMs,
        error: "OpenRouter rate limit exceeded (HTTP 429).",
      }
    }

    if (!response.ok) {
      return {
        status: "BLOCKED",
        authenticated: false,
        model: config.model,
        baseUrl: config.baseUrl,
        latencyMs,
        error: `OpenRouter returned unexpected HTTP status: ${response.status}`,
      }
    }

    const payload = (await response.json()) as { data?: Array<{ id: string }> }
    const modelsList = Array.isArray(payload?.data) ? payload.data : []
    const selectedModelFound = modelsList.some(
      (m) => m.id.toLowerCase() === config.model.toLowerCase()
    )

    return {
      status: "READY",
      authenticated: true,
      model: config.model,
      baseUrl: config.baseUrl,
      availableModelsCount: modelsList.length,
      selectedModelFound,
      latencyMs,
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: "BLOCKED",
        authenticated: false,
        model: config.model,
        baseUrl: config.baseUrl,
        latencyMs,
        error: `OpenRouter connection timed out after ${config.timeoutMs / 1000}s.`,
      }
    }

    const message = error instanceof Error ? error.message : "Unknown network error"
    return {
      status: "CONFIGURED BUT NOT VERIFIED",
      authenticated: false,
      model: config.model,
      baseUrl: config.baseUrl,
      latencyMs,
      error: `Network error connecting to OpenRouter: ${message}`,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
