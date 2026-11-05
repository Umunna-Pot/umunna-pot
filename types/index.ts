export type RoqquDataSource = "ras-live" | "roqqu-public" | "demo-fallback"

export interface RoqquFiatRate {
  symbol: string
  title: string
  rate: number
  icon: string
  minTradeable: number
  maxTradeable: number
  minWithdraw: number
  maxWithdraw: number
}

export interface RoqquTokenQuote {
  symbol: string
  usdPrice: number
  ngnPrice: number
  change24h: number
}

export interface RoqquTreasuryBalances {
  email?: string
  usdt: number
  btc: number
  eth: number
  trx: number
  sol: number
  bnb: number
  xrp: number
  totalEstimatedUsd: number
  totalEstimatedNgn: number
}

export interface RoqquRatesSnapshot {
  ngnPerUsd: number
  fiatRates: Record<string, RoqquFiatRate>
  prices: Record<string, RoqquTokenQuote>
  treasury: RoqquTreasuryBalances
  mode: "staging" | "live"
  source: RoqquDataSource
  cached: boolean
  updatedAt: string
}

export interface RoqquSupportedNetwork {
  network: string
  currency: string
}

export interface RoqquPaymentLinkResult {
  paymentReference: string
  checkoutUrl: string
  amountNgn: number
  wallets?: Record<string, unknown>
  raw: Record<string, unknown>
}

export interface RoqquCheckoutResult {
  rail: "payment_link" | "crypto_wallet"
  paymentReference: string
  communityId: number
  contributorName: string
  amountNgn: number
  estimatedUsdc: number
  ngnPerUsd: number
  checkoutUrl?: string
  depositAddress?: string
  depositNetwork?: string
  source: "ras-live" | "demo-simulated"
}

export interface RoqquWebhookResult {
  status: "credited" | "duplicate"
  paymentReference: string
  communityId: number
  usdcCredited: number
  contributorTag: string
  relayerTxHash: `0x${string}`
  relayerMode: "onchain" | "simulated"
  autoConvertedToken?: string
}

export interface SettlementReceipt {
  receiptId: string
  payoutId: number
  communityId: number
  amountUsdc: number
  amountNgn: number
  ngnPerUsd: number
  settlementRail: string
  recipient: string
  onchainTxHash: `0x${string}`
  txVerifiedOnchain: boolean
  roqquStatus: "settled-ras" | "settled-simulated"
  settledAt: string
}

export interface ContributionItem {
  sender: `0x${string}`
  amount: bigint
  timestamp: bigint
  contributorTag: string
}

export interface CommunitySummary {
  id: bigint
  name: string
  creator: `0x${string}`
  signers: readonly `0x${string}`[]
  threshold: bigint
  balance: bigint
  totalContributed: bigint
  totalDisbursed: bigint
  createdAt: bigint
  exists: boolean
}

export interface PayoutProposal {
  id: bigint
  communityId: bigint
  proposer: `0x${string}`
  recipient: `0x${string}`
  amount: bigint
  reason: string
  settlementRail: string
  approvalCount: bigint
  executed: boolean
  createdAt: bigint
  exists: boolean
}

export interface DripVaultSummary {
  id: bigint
  depositor: `0x${string}`
  beneficiary: `0x${string}`
  guardian: `0x${string}`
  totalAmount: bigint
  remainingAmount: bigint
  installmentAmount: bigint
  intervalSeconds: bigint
  nextReleaseAt: bigint
  earlyExitRequested: boolean
  active: boolean
  exists: boolean
}
