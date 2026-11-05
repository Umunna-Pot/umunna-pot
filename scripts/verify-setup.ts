/**
 * Umunna Pot — Phase 3 Stage 0 Verification Diagnostic Suite
 * Runs read-only checks across:
 * 1. Server Environment Configuration & Sanitation
 * 2. OpenRouter AI Integration
 * 3. Base Sepolia RPC & Bytecode Checks
 * 4. Roqqu API Services (RAS) Read-Only Rates & Balances
 * 
 * Safe for local & CI execution. Never performs token transfers or deployments.
 */

// Load .env.local if present
try {
  process.loadEnvFile(".env.local")
  console.log("✔ Loaded .env.local")
} catch {
  console.log("ℹ No .env.local found or already in environment")
}

import { validateEnvironment } from "@/lib/env"
import { verifyOpenRouterConnectivity } from "@/lib/openrouter"
import { verifyBlockchainConnectivity } from "@/lib/blockchain"
import { verifyRoqquConnectivity } from "@/lib/roqquClient"

async function main() {
  console.log("==================================================")
  console.log("UMUNNA POT — PHASE 3 STAGE 0 INTEGRATION VERIFICATION")
  console.log("==================================================\n")

  // 1. Environment Validation
  console.log("--- 1. Environment Configuration ---")
  const envReport = validateEnvironment()
  console.log(`Status: ${envReport.isValid ? "READY" : "BLOCKED"}`)
  console.log(`Configured Keys: ${envReport.configuredKeys.length}`)
  if (Object.keys(envReport.errors).length > 0) {
    console.log("Validation Errors:", envReport.errors)
  } else {
    console.log("Validation Errors: None (All required schema fields valid)")
  }
  if (Object.keys(envReport.warnings).length > 0) {
    console.log("Warnings:", envReport.warnings)
  }
  console.log(`Missing Optional Keys: ${envReport.missingOptionalKeys.join(", ") || "None"}`)
  console.log("")

  // 2. OpenRouter AI Verification
  console.log("--- 2. OpenRouter AI Integration (Read-Only) ---")
  const openrouter = await verifyOpenRouterConnectivity()
  console.log(`Status: ${openrouter.status}`)
  console.log(`Authenticated: ${openrouter.authenticated}`)
  console.log(`Base URL: ${openrouter.baseUrl}`)
  console.log(`Configured Model: ${openrouter.model}`)
  if (openrouter.latencyMs !== undefined) {
    console.log(`Latency: ${openrouter.latencyMs} ms`)
  }
  if (openrouter.availableModelsCount !== undefined) {
    console.log(`Available OpenRouter Models: ${openrouter.availableModelsCount}`)
  }
  if (openrouter.selectedModelFound !== undefined) {
    console.log(`Selected Model Found in Catalog: ${openrouter.selectedModelFound}`)
  }
  if (openrouter.error) {
    console.log(`Diagnostic Detail: ${openrouter.error}`)
  }
  console.log("")

  // 3. Blockchain (Base Sepolia) Verification
  console.log("--- 3. Base Sepolia Blockchain (Read-Only) ---")
  const blockchain = await verifyBlockchainConnectivity()
  console.log(`Overall Status: ${blockchain.status}`)
  console.log(`RPC Endpoint: ${blockchain.rpcUrl}`)
  console.log(`Expected Chain ID: ${blockchain.expectedChainId}`)
  console.log(`Actual Chain ID: ${blockchain.actualChainId ?? "N/A"}`)
  console.log(`Chain ID Matches: ${blockchain.chainIdMatches}`)
  if (blockchain.blockNumber) {
    console.log(`Current Block Height: ${blockchain.blockNumber.toString()}`)
  }
  if (blockchain.latencyMs !== undefined) {
    console.log(`RPC Latency: ${blockchain.latencyMs} ms`)
  }
  console.log("Contract UmunnaPot:", {
    address: blockchain.contracts.umunnaPot.address,
    status: blockchain.contracts.umunnaPot.status,
    hasBytecode: blockchain.contracts.umunnaPot.hasBytecode,
    details: blockchain.contracts.umunnaPot.details,
  })
  console.log("Contract MockUSDC:", {
    address: blockchain.contracts.mockUsdc.address,
    status: blockchain.contracts.mockUsdc.status,
    hasBytecode: blockchain.contracts.mockUsdc.hasBytecode,
    details: blockchain.contracts.mockUsdc.details,
  })
  if (blockchain.error) {
    console.log(`Diagnostic Detail: ${blockchain.error}`)
  }
  console.log("")

  // 4. Roqqu API Services Verification
  console.log("--- 4. Roqqu API Services (RAS) ---")
  const roqqu = await verifyRoqquConnectivity()
  console.log(`Status: ${roqqu.status}`)
  console.log(`Mode: ${roqqu.mode}`)
  console.log(`Base URL: ${roqqu.baseUrl}`)
  console.log(`Public Market Rates Reachable: ${roqqu.publicApiReachable}`)
  console.log(`Authenticated Balance Verification: ${roqqu.authenticated}`)
  if (roqqu.latencyMs !== undefined) {
    console.log(`Latency: ${roqqu.latencyMs} ms`)
  }
  if (roqqu.error) {
    console.log(`Diagnostic Detail: ${roqqu.error}`)
  }
  console.log("")

  console.log("==================================================")
  console.log("VERIFICATION COMPLETE")
  console.log("==================================================")
}

main().catch((err) => {
  console.error("Diagnostic execution error:", err)
  process.exit(1)
})
