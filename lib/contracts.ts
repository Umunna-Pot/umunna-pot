export const BASE_SEPOLIA_CHAIN_ID = 84532

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const

export const MOCK_USDC_ADDRESS = ((
  process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS?.trim() ||
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS?.trim() ||
  process.env.USDC_CONTRACT_ADDRESS?.trim() ||
  ZERO_ADDRESS
) as `0x${string}`)

export const UMUNNA_POT_ADDRESS = ((
  process.env.NEXT_PUBLIC_UMUNNA_POT_ADDRESS?.trim() ||
  process.env.NEXT_PUBLIC_POT_CONTRACT_ADDRESS?.trim() ||
  process.env.UMUNNA_POT_CONTRACT_ADDRESS?.trim() ||
  ZERO_ADDRESS
) as `0x${string}`)

export function isContractConfigured(): boolean {
  return (
    UMUNNA_POT_ADDRESS.toLowerCase() !== ZERO_ADDRESS &&
    MOCK_USDC_ADDRESS.toLowerCase() !== ZERO_ADDRESS
  )
}

export const MOCK_USDC_ABI = [
  {
    type: "function",
    name: "DEMO_FAUCET_AMOUNT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimDemoFaucet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const

export const UMUNNA_POT_ABI = [
  {
    type: "function",
    name: "MIN_INTERVAL_SECONDS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "communityCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "payoutCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "vaultCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isCommunitySigner",
    stateMutability: "view",
    inputs: [
      { name: "communityId", type: "uint256" },
      { name: "signer", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "hasApproved",
    stateMutability: "view",
    inputs: [
      { name: "payoutId", type: "uint256" },
      { name: "signer", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "createCommunity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "signers", type: "address[]" },
      { name: "threshold", type: "uint8" },
    ],
    outputs: [{ name: "communityId", type: "uint256" }],
  },
  {
    type: "function",
    name: "contribute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "communityId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "contributorTag", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "proposePayout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "communityId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
      { name: "settlementRail", type: "string" },
    ],
    outputs: [{ name: "payoutId", type: "uint256" }],
  },
  {
    type: "function",
    name: "approvePayout",
    stateMutability: "nonpayable",
    inputs: [{ name: "payoutId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "executePayout",
    stateMutability: "nonpayable",
    inputs: [{ name: "payoutId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "createDripVault",
    stateMutability: "nonpayable",
    inputs: [
      { name: "totalAmount", type: "uint256" },
      { name: "installmentAmount", type: "uint256" },
      { name: "intervalSeconds", type: "uint64" },
      { name: "firstReleaseAt", type: "uint64" },
      { name: "beneficiary", type: "address" },
      { name: "guardian", type: "address" },
    ],
    outputs: [{ name: "vaultId", type: "uint256" }],
  },
  {
    type: "function",
    name: "releaseDue",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "requestEarlyExit",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "approveEarlyExit",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getCommunity",
    stateMutability: "view",
    inputs: [{ name: "communityId", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "creator", type: "address" },
      { name: "threshold", type: "uint8" },
      { name: "balance", type: "uint256" },
      { name: "totalContributed", type: "uint256" },
      { name: "createdAt", type: "uint64" },
      { name: "signers", type: "address[]" },
    ],
  },
  {
    type: "function",
    name: "getCommunityContributions",
    stateMutability: "view",
    inputs: [{ name: "communityId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "sender", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint64" },
          { name: "contributorTag", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getCommunityPayoutIds",
    stateMutability: "view",
    inputs: [{ name: "communityId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getPayout",
    stateMutability: "view",
    inputs: [{ name: "payoutId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "communityId", type: "uint256" },
          { name: "proposer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "approvalCount", type: "uint8" },
          { name: "executed", type: "bool" },
          { name: "createdAt", type: "uint64" },
          { name: "reason", type: "string" },
          { name: "settlementRail", type: "string" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getDripVault",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "funder", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "guardian", type: "address" },
          { name: "totalAmount", type: "uint256" },
          { name: "remainingAmount", type: "uint256" },
          { name: "installmentAmount", type: "uint256" },
          { name: "intervalSeconds", type: "uint64" },
          { name: "nextReleaseAt", type: "uint64" },
          { name: "releasedCount", type: "uint32" },
          { name: "active", type: "bool" },
          { name: "earlyExitRequested", type: "bool" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getUserVaultIds",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getDueVaultIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "dueIds", type: "uint256[]" }],
  },
] as const

