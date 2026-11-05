"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"

export interface MongoCommunity {
  _id: string
  onChainPotId: number
  name: string
  description: string
  targetAmountNgn: number
  targetAmountUsdc: number
  currentBalanceUsdc: number
  quorumThreshold: number
  signers: string[]
  creatorAddress: string
  category: string
  status: string
  contributorCount?: number
}

export interface MongoContribution {
  _id: string
  onChainPotId: number
  contributorName: string
  amountNgn: number
  amountUsdc: number
  paymentMethod: string
  paymentReference: string
  status: string
  txHash?: string
  createdAt: string
}

export interface MongoProposal {
  _id: string
  onChainPotId: number
  title: string
  amountNgn: number
  amountUsdc: number
  approvals: string[]
  status: string
}

export function useCommunitiesQuery() {
  return useQuery({
    queryKey: ["communities"],
    queryFn: async (): Promise<MongoCommunity[]> => {
      const res = await fetch("/api/communities")
      if (!res.ok) throw new Error("Failed to fetch communities")
      const data = await res.json()
      return data.communities || []
    },
    refetchInterval: 6_000,
    staleTime: 3_000,
  })
}

export function useContributionsQuery(potId?: number) {
  return useQuery({
    queryKey: ["contributions", potId],
    queryFn: async (): Promise<MongoContribution[]> => {
      const url =
        potId !== undefined
          ? `/api/contributions?potId=${potId}`
          : "/api/contributions"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch contributions")
      const data = await res.json()
      return data.contributions || []
    },
    refetchInterval: 6_000,
    staleTime: 3_000,
  })
}

export function useProposalsQuery() {
  return useQuery({
    queryKey: ["proposals"],
    queryFn: async (): Promise<MongoProposal[]> => {
      const res = await fetch("/api/payouts")
      if (!res.ok) throw new Error("Failed to fetch payouts")
      const data = await res.json()
      return data.proposals || []
    },
    refetchInterval: 8_000,
    staleTime: 4_000,
  })
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["communities"] })
    void queryClient.invalidateQueries({ queryKey: ["contributions"] })
    void queryClient.invalidateQueries({ queryKey: ["proposals"] })
  }
}

