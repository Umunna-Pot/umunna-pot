"use client"

import * as React from "react"
import { useAccount, usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi"
import {
  MOCK_USDC_ABI, MOCK_USDC_ADDRESS, UMUNNA_POT_ABI, UMUNNA_POT_ADDRESS, isContractConfigured,
} from "@/lib/contracts"
import {
  approveDemoPayout, claimDemoUsdcFaucet, createDemoCommunity, executeDemoPayout,
  getDemoSnapshot, proposeDemoPayout, recordDemoContribution, subscribeDemoStore,
} from "@/lib/demoStore"
import { parseUsdc } from "@/lib/format"
import { resolveNewCommunityId } from "@/lib/communityEvents"
import type { CommunitySummary, ContributionItem, PayoutProposal } from "@/types"

const FALLBACK_SENDER =
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as `0x${string}`

export function useCommunityPots() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const liveContract = isContractConfigured()

  const demoState = React.useSyncExternalStore(
    subscribeDemoStore,
    getDemoSnapshot,
    getDemoSnapshot
  )

  const usdcBalanceRead = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: liveContract && Boolean(address) },
  })

  const communityCountRead = useReadContract({
    address: UMUNNA_POT_ADDRESS,
    abi: UMUNNA_POT_ABI,
    functionName: "communityCount",
    query: { enabled: liveContract },
  })

  const payoutCountRead = useReadContract({
    address: UMUNNA_POT_ADDRESS,
    abi: UMUNNA_POT_ABI,
    functionName: "payoutCount",
    query: { enabled: liveContract },
  })

  const totalCommunities = Number(communityCountRead.data ?? BigInt(0))
  const totalPayouts = Number(payoutCountRead.data ?? BigInt(0))

  const communityCalls = React.useMemo(
    () =>
      Array.from({ length: totalCommunities }, (_, i) => ({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "getCommunity" as const,
        args: [BigInt(i + 1)] as const,
      })),
    [totalCommunities]
  )

  const payoutCalls = React.useMemo(
    () =>
      Array.from({ length: totalPayouts }, (_, i) => ({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "getPayout" as const,
        args: [BigInt(i + 1)] as const,
      })),
    [totalPayouts]
  )

  const communitiesBatch = useReadContracts({
    contracts: communityCalls,
    query: { enabled: liveContract && totalCommunities > 0 },
  })

  const payoutsBatch = useReadContracts({
    contracts: payoutCalls,
    query: { enabled: liveContract && totalPayouts > 0 },
  })

  const communities: CommunitySummary[] = React.useMemo(() => {
    if (
      !liveContract ||
      !communitiesBatch.data ||
      communitiesBatch.data.length === 0
    ) {
      return liveContract ? [] : demoState.communities
    }

    return communitiesBatch.data
      .map((item, idx): CommunitySummary | null => {
        if (item.status !== "success" || !item.result) return null
        const [
          name,
          creator,
          threshold,
          balance,
          totalContributed,
          createdAt,
          signers,
        ] = item.result
        const disbursed =
          totalContributed > balance ? totalContributed - balance : BigInt(0)
        return {
          id: BigInt(idx + 1),
          name,
          creator,
          signers,
          threshold: BigInt(threshold),
          balance,
          totalContributed,
          totalDisbursed: disbursed,
          createdAt: BigInt(createdAt),
          exists: true,
        }
      })
      .filter((item): item is CommunitySummary => item !== null)
      .reverse()
  }, [liveContract, demoState.communities, communitiesBatch.data])

  const payouts: PayoutProposal[] = React.useMemo(() => {
    if (liveContract) {
      if (!payoutsBatch.data || payoutsBatch.data.length === 0) {
        return []
      }
      return payoutsBatch.data
        .map((item, idx): PayoutProposal | null => {
          if (item.status !== "success" || !item.result) return null
          const p = item.result
          if (!p.exists) return null
          return {
            id: BigInt(idx + 1),
            communityId: p.communityId,
            proposer: p.proposer,
            recipient: p.recipient,
            amount: p.amount,
            reason: p.reason,
            settlementRail: p.settlementRail,
            approvalCount: BigInt(p.approvalCount),
            executed: p.executed,
            createdAt: BigInt(p.createdAt),
            exists: p.exists,
          }
        })
        .filter((item): item is PayoutProposal => item !== null)
        .reverse()
    }

    return demoState.payouts
  }, [liveContract, demoState.payouts, payoutsBatch.data])

  const refetchAll = React.useCallback(async () => {
    if (!liveContract) return
    await Promise.all([
      usdcBalanceRead.refetch(),
      communityCountRead.refetch(),
      payoutCountRead.refetch(),
      communitiesBatch.refetch(),
      payoutsBatch.refetch(),
    ])
  }, [
    liveContract,
    usdcBalanceRead,
    communityCountRead,
    payoutCountRead,
    communitiesBatch,
    payoutsBatch,
  ])

  const claimFaucet = React.useCallback(async (): Promise<`0x${string}` | null> => {
    if (!liveContract) {
      claimDemoUsdcFaucet()
      return null
    }
    const hash = await writeContractAsync({
      address: MOCK_USDC_ADDRESS,
      abi: MOCK_USDC_ABI,
      functionName: "claimDemoFaucet",
    })
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash })
    }
    await refetchAll()
    return hash
  }, [liveContract, writeContractAsync, publicClient, refetchAll])

  const createCommunity = React.useCallback(
    async (params: {
      name: string
      signers: `0x${string}`[]
      threshold: number
    }) => {
      if (!liveContract) {
        createDemoCommunity({
          ...params,
          creator: address ?? FALLBACK_SENDER,
        })
        return { txHash: null }
      }
      const hash = await writeContractAsync({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "createCommunity",
        args: [params.name, params.signers, params.threshold],
      })
      let onChainPotId: number | undefined
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        onChainPotId = await resolveNewCommunityId({
          logs: receipt.logs,
          contractAddress: UMUNNA_POT_ADDRESS,
          readCommunityCount: () =>
            publicClient.readContract({
              address: UMUNNA_POT_ADDRESS,
              abi: UMUNNA_POT_ABI,
              functionName: "communityCount",
            }),
        })
      }
      await refetchAll()
      return { txHash: hash, onChainPotId }
    },
    [liveContract, address, writeContractAsync, publicClient, refetchAll]
  )

  const contributeUsdc = React.useCallback(
    async (params: {
      communityId: number
      amountUsdc: string
      contributorTag: string
    }) => {
      const rawAmount = parseUsdc(params.amountUsdc)
      if (!liveContract) {
        recordDemoContribution({
          communityId: params.communityId,
          sender: address ?? FALLBACK_SENDER,
          amountRaw: rawAmount,
          contributorTag: params.contributorTag,
          deductWalletBalance: true,
        })
        return null
      }

      if (!address || !publicClient) {
        throw new Error("Connect your Base Sepolia wallet first.")
      }

      const currentAllowance = await publicClient.readContract({
        address: MOCK_USDC_ADDRESS,
        abi: MOCK_USDC_ABI,
        functionName: "allowance",
        args: [address, UMUNNA_POT_ADDRESS],
      })

      if (currentAllowance < rawAmount) {
        const approveHash = await writeContractAsync({
          address: MOCK_USDC_ADDRESS,
          abi: MOCK_USDC_ABI,
          functionName: "approve",
          args: [UMUNNA_POT_ADDRESS, rawAmount],
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      const contributeHash = await writeContractAsync({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "contribute",
        args: [BigInt(params.communityId), rawAmount, params.contributorTag],
      })
      await publicClient.waitForTransactionReceipt({ hash: contributeHash })
      await refetchAll()
      return contributeHash
    },
    [liveContract, address, publicClient, writeContractAsync, refetchAll]
  )

  const applyRoqquWebhookCredit = React.useCallback(
    async (params: {
      communityId: number
      usdcCredited: number
      contributorTag: string
    }) => {
      if (!liveContract) {
        recordDemoContribution({
          communityId: params.communityId,
          sender: FALLBACK_SENDER,
          amountRaw: parseUsdc(params.usdcCredited.toFixed(2)),
          contributorTag: params.contributorTag,
          deductWalletBalance: false,
        })
        return
      }
      await refetchAll()
    },
    [liveContract, refetchAll]
  )

  const proposePayout = React.useCallback(
    async (params: {
      communityId: number
      recipient: `0x${string}`
      amountUsdc: string
      reason: string
      settlementRail: string
    }) => {
      const rawAmount = parseUsdc(params.amountUsdc)
      if (!liveContract) {
        proposeDemoPayout({
          communityId: params.communityId,
          proposer: address ?? FALLBACK_SENDER,
          recipient: params.recipient,
          amountRaw: rawAmount,
          reason: params.reason,
          settlementRail: params.settlementRail,
        })
        return null
      }
      const hash = await writeContractAsync({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "proposePayout",
        args: [
          BigInt(params.communityId),
          params.recipient,
          rawAmount,
          params.reason,
          params.settlementRail,
        ],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      await refetchAll()
      return hash
    },
    [liveContract, address, writeContractAsync, publicClient, refetchAll]
  )

  const approvePayout = React.useCallback(
    async (payoutId: number) => {
      if (!liveContract) {
        approveDemoPayout(payoutId, address ?? "0xdemo-second-signer")
        return null
      }
      const hash = await writeContractAsync({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "approvePayout",
        args: [BigInt(payoutId)],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      await refetchAll()
      return hash
    },
    [liveContract, address, writeContractAsync, publicClient, refetchAll]
  )

  const executePayout = React.useCallback(
    async (payoutId: number): Promise<`0x${string}`> => {
      if (!liveContract) {
        return executeDemoPayout(payoutId)
      }
      const hash = await writeContractAsync({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "executePayout",
        args: [BigInt(payoutId)],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      await refetchAll()
      return hash
    },
    [liveContract, writeContractAsync, publicClient, refetchAll]
  )

  return {
    liveContract,
    usdcBalance: liveContract
      ? (usdcBalanceRead.data ?? BigInt(0))
      : demoState.demoUsdcBalance,
    communities,
    payouts,
    demoContributionsByPot: demoState.contributionsByPot,
    isLoading:
      liveContract &&
      (communityCountRead.isLoading || communitiesBatch.isLoading),
    isError:
      liveContract && (communityCountRead.isError || communitiesBatch.isError),
    refetchAll,
    claimFaucet,
    createCommunity,
    contributeUsdc,
    applyRoqquWebhookCredit,
    proposePayout,
    approvePayout,
    executePayout,
  }
}

export function useCommunityContributions(communityId: number) {
  const liveContract = isContractConfigured()
  const demoState = React.useSyncExternalStore(
    subscribeDemoStore,
    getDemoSnapshot,
    getDemoSnapshot
  )

  const contractRead = useReadContract({
    address: UMUNNA_POT_ADDRESS,
    abi: UMUNNA_POT_ABI,
    functionName: "getCommunityContributions",
    args: [BigInt(communityId)],
    query: { enabled: liveContract && communityId >= 0 },
  })

  const contributions: ContributionItem[] = React.useMemo(() => {
    if (!liveContract) {
      return demoState.contributionsByPot[String(communityId)] ?? []
    }
    if (!contractRead.data) return []
    return [...contractRead.data]
      .map((item) => ({
        sender: item.sender,
        amount: item.amount,
        timestamp: BigInt(item.timestamp),
        contributorTag: item.contributorTag,
      }))
      .reverse()
  }, [liveContract, demoState.contributionsByPot, communityId, contractRead.data])

  return {
    contributions,
    isLoading: liveContract && contractRead.isLoading,
    refetch: contractRead.refetch,
  }
}
