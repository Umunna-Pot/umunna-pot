import { createPublicClient, http, isAddress } from "viem"
import { baseSepolia } from "viem/chains"
import {
  BASE_SEPOLIA_CHAIN_ID,
  MOCK_USDC_ADDRESS,
  UMUNNA_POT_ADDRESS,
  ZERO_ADDRESS,
} from "./contracts"

/**
 * Server/Client Blockchain Utility for Base Sepolia Verification.
 * Purely read-only diagnostics — never signs or executes transactions.
 */

export interface ContractBytecodeCheck {
  label: string
  address: string
  isZeroAddress: boolean
  isValidAddress: boolean
  hasBytecode: boolean
  bytecodeLengthBytes: number
  status: "READY" | "CONFIGURED BUT NOT VERIFIED" | "MISSING CONFIGURATION" | "BLOCKED"
  details: string
}

export interface BlockchainVerificationResult {
  status: "READY" | "CONFIGURED BUT NOT VERIFIED" | "MISSING CONFIGURATION" | "BLOCKED"
  rpcUrl: string
  expectedChainId: number
  actualChainId?: number
  chainIdMatches: boolean
  blockNumber?: bigint
  latencyMs?: number
  contracts: {
    umunnaPot: ContractBytecodeCheck
    mockUsdc: ContractBytecodeCheck
  }
  error?: string
}

export function getBaseSepoliaPublicClient(customRpcUrl?: string) {
  const rpcUrl =
    customRpcUrl ||
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL?.trim() ||
    "https://sepolia.base.org"

  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl, {
      timeout: 15_000,
    }),
  })
}

/**
 * Checks bytecode at a specific address without state alteration.
 */
async function checkContractAddress(
  client: ReturnType<typeof getBaseSepoliaPublicClient>,
  label: string,
  rawAddress: string
): Promise<ContractBytecodeCheck> {
  const address = rawAddress.trim()
  const isZero = address.toLowerCase() === ZERO_ADDRESS.toLowerCase() || address === ""
  const isValid = isAddress(address)

  if (!isValid) {
    return {
      label,
      address,
      isZeroAddress: isZero,
      isValidAddress: false,
      hasBytecode: false,
      bytecodeLengthBytes: 0,
      status: "BLOCKED",
      details: "Invalid EVM address format (expected 0x followed by 40 hex characters).",
    }
  }

  if (isZero) {
    return {
      label,
      address,
      isZeroAddress: true,
      isValidAddress: true,
      hasBytecode: false,
      bytecodeLengthBytes: 0,
      status: "MISSING CONFIGURATION",
      details: "Configured with zero-address placeholder. Smart contract deployment required.",
    }
  }

  try {
    const bytecode = await client.getBytecode({
      address: address as `0x${string}`,
    })

    if (bytecode && bytecode !== "0x") {
      const lengthBytes = (bytecode.length - 2) / 2
      return {
        label,
        address,
        isZeroAddress: false,
        isValidAddress: true,
        hasBytecode: true,
        bytecodeLengthBytes: lengthBytes,
        status: "READY",
        details: `Verified deployed bytecode present (${lengthBytes} bytes).`,
      }
    } else {
      return {
        label,
        address,
        isZeroAddress: false,
        isValidAddress: true,
        hasBytecode: false,
        bytecodeLengthBytes: 0,
        status: "CONFIGURED BUT NOT VERIFIED",
        details: "Address is valid, but no bytecode was found at this address on Base Sepolia (EOA or un-deployed).",
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "RPC bytecode check failed"
    return {
      label,
      address,
      isZeroAddress: false,
      isValidAddress: true,
      hasBytecode: false,
      bytecodeLengthBytes: 0,
      status: "BLOCKED",
      details: `Failed to inspect bytecode: ${msg}`,
    }
  }
}

/**
 * Runs a comprehensive read-only Base Sepolia RPC and contract diagnostic check.
 */
export async function verifyBlockchainConnectivity(): Promise<BlockchainVerificationResult> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL?.trim() ||
    "https://sepolia.base.org"

  const client = getBaseSepoliaPublicClient(rpcUrl)
  const startTime = Date.now()

  try {
    const [actualChainId, blockNumber] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
    ])

    const latencyMs = Date.now() - startTime
    const chainIdMatches = actualChainId === BASE_SEPOLIA_CHAIN_ID

    const [umunnaPotCheck, mockUsdcCheck] = await Promise.all([
      checkContractAddress(client, "UmunnaPot Core Contract", UMUNNA_POT_ADDRESS),
      checkContractAddress(client, "MockUSDC Token Contract", MOCK_USDC_ADDRESS),
    ])

    const bothContractsReady =
      umunnaPotCheck.status === "READY" && mockUsdcCheck.status === "READY"

    let overallStatus: BlockchainVerificationResult["status"] = "READY"
    if (!chainIdMatches) {
      overallStatus = "BLOCKED"
    } else if (!bothContractsReady) {
      if (
        umunnaPotCheck.status === "MISSING CONFIGURATION" ||
        mockUsdcCheck.status === "MISSING CONFIGURATION"
      ) {
        overallStatus = "CONFIGURED BUT NOT VERIFIED"
      } else {
        overallStatus = "CONFIGURED BUT NOT VERIFIED"
      }
    }

    return {
      status: overallStatus,
      rpcUrl,
      expectedChainId: BASE_SEPOLIA_CHAIN_ID,
      actualChainId,
      chainIdMatches,
      blockNumber,
      latencyMs,
      contracts: {
        umunnaPot: umunnaPotCheck,
        mockUsdc: mockUsdcCheck,
      },
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime
    const message = err instanceof Error ? err.message : "RPC connectivity failed"

    return {
      status: "BLOCKED",
      rpcUrl,
      expectedChainId: BASE_SEPOLIA_CHAIN_ID,
      chainIdMatches: false,
      latencyMs,
      contracts: {
        umunnaPot: {
          label: "UmunnaPot Core Contract",
          address: UMUNNA_POT_ADDRESS,
          isZeroAddress: UMUNNA_POT_ADDRESS.toLowerCase() === ZERO_ADDRESS.toLowerCase(),
          isValidAddress: isAddress(UMUNNA_POT_ADDRESS),
          hasBytecode: false,
          bytecodeLengthBytes: 0,
          status: "BLOCKED",
          details: "Could not verify due to RPC failure",
        },
        mockUsdc: {
          label: "MockUSDC Token Contract",
          address: MOCK_USDC_ADDRESS,
          isZeroAddress: MOCK_USDC_ADDRESS.toLowerCase() === ZERO_ADDRESS.toLowerCase(),
          isValidAddress: isAddress(MOCK_USDC_ADDRESS),
          hasBytecode: false,
          bytecodeLengthBytes: 0,
          status: "BLOCKED",
          details: "Could not verify due to RPC failure",
        },
      },
      error: `Failed to connect to Base Sepolia RPC at ${rpcUrl}: ${message}`,
    }
  }
}
