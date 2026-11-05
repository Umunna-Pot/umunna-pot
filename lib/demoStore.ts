import type {
  CommunitySummary,
  ContributionItem,
  PayoutProposal,
} from "@/types"

interface DemoStoreState {
  demoUsdcBalance: bigint
  communities: CommunitySummary[]
  contributionsByPot: Record<string, ContributionItem[]>
  payouts: PayoutProposal[]
  approvalsByPayout: Record<string, string[]>
}

const SIGNER_ADAOBI = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const
const SIGNER_OKAFOR = "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as const
const SIGNER_CHIMA = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" as const
const HOSPITAL_VENDOR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const

const nowSec = BigInt(Math.floor(Date.now() / 1000))

let state: DemoStoreState = {
  demoUsdcBalance: BigInt(850_000_000),
  communities: [
    {
      id: BigInt(0),
      name: "Enugu Town Union Health Pot",
      creator: SIGNER_ADAOBI,
      signers: [SIGNER_ADAOBI, SIGNER_OKAFOR, SIGNER_CHIMA],
      threshold: BigInt(2),
      balance: BigInt(1_250_000_000),
      totalContributed: BigInt(1_650_000_000),
      totalDisbursed: BigInt(400_000_000),
      createdAt: nowSec - BigInt(86_400 * 5),
      exists: true,
    },
    {
      id: BigInt(1),
      name: "UNN '19 Lab Solar Upgrade Pot",
      creator: SIGNER_OKAFOR,
      signers: [SIGNER_OKAFOR, SIGNER_ADAOBI],
      threshold: BigInt(2),
      balance: BigInt(640_000_000),
      totalContributed: BigInt(640_000_000),
      totalDisbursed: BigInt(0),
      createdAt: nowSec - BigInt(86_400 * 2),
      exists: true,
    },
  ],
  contributionsByPot: {
    "0": [
      {
        sender: SIGNER_ADAOBI,
        amount: BigInt(600_000_000),
        timestamp: nowSec - BigInt(86_400 * 4),
        contributorTag: "Adaobi (Diaspora Lead · Base USDC)",
      },
      {
        sender: SIGNER_OKAFOR,
        amount: BigInt(650_000_000),
        timestamp: nowSec - BigInt(86_400 * 2),
        contributorTag: "Uncle Chidi via Roqqu [UP09A4F1]",
      },
      {
        sender: SIGNER_CHIMA,
        amount: BigInt(400_000_000),
        timestamp: nowSec - BigInt(43_200),
        contributorTag: "Chief Nnamdi via Roqqu [UP07C2E9]",
      },
    ],
    "1": [
      {
        sender: SIGNER_OKAFOR,
        amount: BigInt(400_000_000),
        timestamp: nowSec - BigInt(86_400),
        contributorTag: "Kelechi (Lagos Chapter · Base USDC)",
      },
      {
        sender: SIGNER_ADAOBI,
        amount: BigInt(240_000_000),
        timestamp: nowSec - BigInt(18_000),
        contributorTag: "Amaka via Roqqu [UP14B8D2]",
      },
    ],
  },
  payouts: [
    {
      id: BigInt(0),
      communityId: BigInt(0),
      proposer: SIGNER_ADAOBI,
      recipient: HOSPITAL_VENDOR,
      amount: BigInt(320_000_000),
      reason: "St. Mary Clinic Solar Inverter & Battery Deposit",
      settlementRail: "ROQQU_OFFRAMP:NGN",
      approvalCount: BigInt(2),
      executed: false,
      createdAt: nowSec - BigInt(14_400),
      exists: true,
    },
    {
      id: BigInt(1),
      communityId: BigInt(0),
      proposer: SIGNER_CHIMA,
      recipient: HOSPITAL_VENDOR,
      amount: BigInt(180_000_000),
      reason: "Emergency Paediatric Ward Medication Batch",
      settlementRail: "ROQQU_SEND:USDT",
      approvalCount: BigInt(1),
      executed: false,
      createdAt: nowSec - BigInt(7_200),
      exists: true,
    },
    {
      id: BigInt(2),
      communityId: BigInt(1),
      proposer: SIGNER_OKAFOR,
      recipient: SIGNER_CHIMA,
      amount: BigInt(250_000_000),
      reason: "Mikano LiFePO4 Rack Supplier Milestone #1",
      settlementRail: "ONCHAIN",
      approvalCount: BigInt(1),
      executed: false,
      createdAt: nowSec - BigInt(3_600),
      exists: true,
    },
  ],
  approvalsByPayout: {
    "0": [SIGNER_ADAOBI.toLowerCase(), SIGNER_OKAFOR.toLowerCase()],
    "1": [SIGNER_CHIMA.toLowerCase()],
    "2": [SIGNER_OKAFOR.toLowerCase()],
  },
}

const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

export function subscribeDemoStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getDemoSnapshot(): DemoStoreState {
  return state
}

export function claimDemoUsdcFaucet(): void {
  state = {
    ...state,
    demoUsdcBalance: state.demoUsdcBalance + BigInt(500_000_000),
  }
  emitChange()
}

export function createDemoCommunity(params: {
  name: string
  creator: `0x${string}`
  signers: `0x${string}`[]
  threshold: number
}): bigint {
  const nextId = BigInt(state.communities.length)
  const created: CommunitySummary = {
    id: nextId,
    name: params.name,
    creator: params.creator,
    signers: params.signers,
    threshold: BigInt(params.threshold),
    balance: BigInt(0),
    totalContributed: BigInt(0),
    totalDisbursed: BigInt(0),
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
    exists: true,
  }
  state = {
    ...state,
    communities: [created, ...state.communities],
    contributionsByPot: {
      ...state.contributionsByPot,
      [nextId.toString()]: [],
    },
  }
  emitChange()
  return nextId
}

export function recordDemoContribution(params: {
  communityId: number
  sender: `0x${string}`
  amountRaw: bigint
  contributorTag: string
  deductWalletBalance?: boolean
}): void {
  const key = String(params.communityId)
  const nextBalance = params.deductWalletBalance
    ? state.demoUsdcBalance > params.amountRaw
      ? state.demoUsdcBalance - params.amountRaw
      : BigInt(0)
    : state.demoUsdcBalance

  const entry: ContributionItem = {
    sender: params.sender,
    amount: params.amountRaw,
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
    contributorTag: params.contributorTag,
  }

  state = {
    ...state,
    demoUsdcBalance: nextBalance,
    communities: state.communities.map((c) =>
      Number(c.id) === params.communityId
        ? {
            ...c,
            balance: c.balance + params.amountRaw,
            totalContributed: c.totalContributed + params.amountRaw,
          }
        : c
    ),
    contributionsByPot: {
      ...state.contributionsByPot,
      [key]: [entry, ...(state.contributionsByPot[key] ?? [])],
    },
  }
  emitChange()
}

export function proposeDemoPayout(params: {
  communityId: number
  proposer: `0x${string}`
  recipient: `0x${string}`
  amountRaw: bigint
  reason: string
  settlementRail: string
}): bigint {
  const nextId = BigInt(state.payouts.length)
  const proposal: PayoutProposal = {
    id: nextId,
    communityId: BigInt(params.communityId),
    proposer: params.proposer,
    recipient: params.recipient,
    amount: params.amountRaw,
    reason: params.reason,
    settlementRail: params.settlementRail,
    approvalCount: BigInt(1),
    executed: false,
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
    exists: true,
  }

  state = {
    ...state,
    payouts: [proposal, ...state.payouts],
    approvalsByPayout: {
      ...state.approvalsByPayout,
      [nextId.toString()]: [params.proposer.toLowerCase()],
    },
  }
  emitChange()
  return nextId
}

export function approveDemoPayout(payoutId: number, signer: string): void {
  const key = String(payoutId)
  const normalized = signer.toLowerCase()
  const existing = state.approvalsByPayout[key] ?? []
  if (existing.includes(normalized)) return

  state = {
    ...state,
    payouts: state.payouts.map((p) =>
      Number(p.id) === payoutId
        ? { ...p, approvalCount: p.approvalCount + BigInt(1) }
        : p
    ),
    approvalsByPayout: {
      ...state.approvalsByPayout,
      [key]: [...existing, normalized],
    },
  }
  emitChange()
}

export function executeDemoPayout(payoutId: number): `0x${string}` {
  const target = state.payouts.find((p) => Number(p.id) === payoutId)
  if (!target || target.executed) {
    return "0x98b5f8c30a1e44d2a790e2b918c44d15f220e7b11a0c98e4b621a97f33c401a2"
  }

  state = {
    ...state,
    payouts: state.payouts.map((p) =>
      Number(p.id) === payoutId ? { ...p, executed: true } : p
    ),
    communities: state.communities.map((c) =>
      c.id === target.communityId
        ? {
            ...c,
            balance: c.balance >= target.amount ? c.balance - target.amount : BigInt(0),
            totalDisbursed: c.totalDisbursed + target.amount,
          }
        : c
    ),
  }
  emitChange()

  const hexSuffix = payoutId.toString(16).padStart(8, "0")
  return `0x64e2a9c1f08b47d391e5a0c82b74d6f139a0e4b2c71d85f0a3e912b4${hexSuffix}`
}
