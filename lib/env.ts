import { z } from "zod"

/**
 * Server-only Environment Configuration and Validation module.
 * Never import this in client-side components.
 */
if (typeof window !== "undefined") {
  throw new Error("lib/env.ts must only be imported on the server.")
}

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/
const privateKeyRegex = /^(0x)?[a-fA-F0-9]{64}$/

export const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
  APPLICATION_URL: z.string().url().optional(),

  // OpenRouter (AI Integration — Mandatory for Phase 3)
  OPENROUTER_API_KEY: z
    .string()
    .min(1, "OPENROUTER_API_KEY is required for Phase 3 AI features"),
  OPENROUTER_BASE_URL: z
    .string()
    .url("OPENROUTER_BASE_URL must be a valid URL")
    .default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z
    .string()
    .min(1, "OPENROUTER_MODEL must be specified")
    .default("anthropic/claude-sonnet-5.5"),
  OPENROUTER_FALLBACK_MODEL: z.string().optional(),
  OPENROUTER_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60),

  // Base Sepolia Blockchain Configuration
  NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: z
    .string()
    .url("NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL must be a valid URL")
    .default("https://sepolia.base.org"),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().default(84532),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),

  // Smart Contract Addresses (Base Sepolia)
  NEXT_PUBLIC_MOCK_USDC_ADDRESS: z
    .string()
    .regex(evmAddressRegex, "NEXT_PUBLIC_MOCK_USDC_ADDRESS must be a valid 0x EVM address")
    .default("0x0000000000000000000000000000000000000000"),
  NEXT_PUBLIC_UMUNNA_POT_ADDRESS: z
    .string()
    .regex(evmAddressRegex, "NEXT_PUBLIC_UMUNNA_POT_ADDRESS must be a valid 0x EVM address")
    .default("0x0000000000000000000000000000000000000000"),

  // Roqqu API Services (RAS) — Server-Only Credentials
  ROQQU_BASE_URL: z
    .string()
    .url("ROQQU_BASE_URL must be a valid URL")
    .default("https://service.roqqu.com/v1"),
  ROQQU_MODE: z.enum(["staging", "live"]).default("staging"),
  ROQQU_SECRET_KEY: z
    .string()
    .min(1, "ROQQU_SECRET_KEY is required for Roqqu operations"),
  ROQQU_PUBLIC_KEY: z.string().optional(),

  // Server-only Relayer & Signer Private Keys (Optional for current stage)
  RELAYER_PRIVATE_KEY: z
    .string()
    .refine((val) => !val || privateKeyRegex.test(val), {
      message: "RELAYER_PRIVATE_KEY must be a 64-hex character string",
    })
    .optional(),
  KEEPER_WALLET_PRIVATE_KEY: z
    .string()
    .refine((val) => !val || privateKeyRegex.test(val), {
      message: "KEEPER_WALLET_PRIVATE_KEY must be a 64-hex character string",
    })
    .optional(),
  DEPLOYER_PRIVATE_KEY: z
    .string()
    .refine((val) => !val || privateKeyRegex.test(val), {
      message: "DEPLOYER_PRIVATE_KEY must be a 64-hex character string",
    })
    .optional(),
})

export type ServerEnv = z.infer<typeof envSchema>

export interface EnvValidationReport {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
  configuredKeys: string[]
  missingOptionalKeys: string[]
}

/**
 * Validates environment variables safely without leaking secret values.
 */
export function validateEnvironment(): EnvValidationReport {
  const rawEnv = {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || process.env.APPLICATION_URL,
    APPLICATION_URL: process.env.APPLICATION_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_FALLBACK_MODEL: process.env.OPENROUTER_FALLBACK_MODEL,
    OPENROUTER_TIMEOUT_SECONDS: process.env.OPENROUTER_TIMEOUT_SECONDS,
    NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL:
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_MOCK_USDC_ADDRESS: process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS,
    NEXT_PUBLIC_UMUNNA_POT_ADDRESS: process.env.NEXT_PUBLIC_UMUNNA_POT_ADDRESS,
    ROQQU_BASE_URL: process.env.ROQQU_BASE_URL,
    ROQQU_MODE: process.env.ROQQU_MODE,
    ROQQU_SECRET_KEY: process.env.ROQQU_SECRET_KEY,
    ROQQU_PUBLIC_KEY: process.env.ROQQU_PUBLIC_KEY,
    RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY,
    KEEPER_WALLET_PRIVATE_KEY: process.env.KEEPER_WALLET_PRIVATE_KEY,
    DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY,
  }

  const result = envSchema.safeParse(rawEnv)
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}
  const configuredKeys: string[] = []
  const missingOptionalKeys: string[] = []

  // Check known keys
  for (const [key, val] of Object.entries(rawEnv)) {
    if (val && typeof val === "string" && val.trim().length > 0) {
      configuredKeys.push(key)
    }
  }

  if (!result.success) {
    const issues = result.error.issues
    for (const issue of issues) {
      const field = issue.path.join(".")
      // Ensure no raw secret values in error messages
      errors[field] = issue.message
    }
  }

  // Contract deployment warnings if placeholder zero address
  const zeroAddress = "0x0000000000000000000000000000000000000000"
  if (
    !rawEnv.NEXT_PUBLIC_UMUNNA_POT_ADDRESS ||
    rawEnv.NEXT_PUBLIC_UMUNNA_POT_ADDRESS.toLowerCase() === zeroAddress
  ) {
    warnings["NEXT_PUBLIC_UMUNNA_POT_ADDRESS"] =
      "Configured as zero address placeholder (contract not yet deployed or linked)."
  }
  if (
    !rawEnv.NEXT_PUBLIC_MOCK_USDC_ADDRESS ||
    rawEnv.NEXT_PUBLIC_MOCK_USDC_ADDRESS.toLowerCase() === zeroAddress
  ) {
    warnings["NEXT_PUBLIC_MOCK_USDC_ADDRESS"] =
      "Configured as zero address placeholder (USDC token contract not yet deployed or linked)."
  }

  const optionalKeys = [
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
    "OPENROUTER_FALLBACK_MODEL",
    "RELAYER_PRIVATE_KEY",
    "KEEPER_WALLET_PRIVATE_KEY",
    "DEPLOYER_PRIVATE_KEY",
    "ROQQU_PUBLIC_KEY",
  ]

  for (const opt of optionalKeys) {
    if (!configuredKeys.includes(opt)) {
      missingOptionalKeys.push(opt)
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    configuredKeys,
    missingOptionalKeys,
  }
}

/**
 * Returns parsed and typed server environment or throws a sanitized error.
 */
export function getServerEnv(): ServerEnv {
  const report = validateEnvironment()
  if (!report.isValid) {
    const errorSummary = Object.entries(report.errors)
      .map(([key, msg]) => `  - ${key}: ${msg}`)
      .join("\n")
    throw new Error(
      `Server environment validation failed:\n${errorSummary}`
    )
  }

  return envSchema.parse({
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || process.env.APPLICATION_URL,
    APPLICATION_URL: process.env.APPLICATION_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_FALLBACK_MODEL: process.env.OPENROUTER_FALLBACK_MODEL,
    OPENROUTER_TIMEOUT_SECONDS: process.env.OPENROUTER_TIMEOUT_SECONDS,
    NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL:
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_MOCK_USDC_ADDRESS: process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS,
    NEXT_PUBLIC_UMUNNA_POT_ADDRESS: process.env.NEXT_PUBLIC_UMUNNA_POT_ADDRESS,
    ROQQU_BASE_URL: process.env.ROQQU_BASE_URL,
    ROQQU_MODE: process.env.ROQQU_MODE,
    ROQQU_SECRET_KEY: process.env.ROQQU_SECRET_KEY,
    ROQQU_PUBLIC_KEY: process.env.ROQQU_PUBLIC_KEY,
    RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY,
    KEEPER_WALLET_PRIVATE_KEY: process.env.KEEPER_WALLET_PRIVATE_KEY,
    DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY,
  })
}
