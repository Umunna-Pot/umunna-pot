"use client"

import * as React from "react"
import { AlertCircleIcon, PlusCircleIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { PayoutCard } from "@/components/community/PayoutCard"
import { ProposePayoutModal } from "@/components/community/ProposePayoutModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ProposalCardSkeleton } from "@/components/shared/ContentSkeletons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCommunityPots } from "@/hooks/useCommunityPots"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { MOCK_USDC_ADDRESS } from "@/lib/contracts"

type FilterTab = "all" | "pending" | "ready" | "executed"

export default function DisbursementsPage() {
  const { data: ratesData } = useRoqquRates()
  const { communities, payouts, isLoading, isError, refetchAll } =
    useCommunityPots()
  const [filter, setFilter] = React.useState<FilterTab>("all")

  const ngnPerUsd = ratesData?.ngnPerUsd ?? 1375

  const communityMap = React.useMemo(() => {
    const map = new Map<number, (typeof communities)[number]>()
    communities.forEach((c) => map.set(Number(c.id), c))
    return map
  }, [communities])

  const filteredPayouts = React.useMemo(() => {
    return payouts.filter((p) => {
      const pot = communityMap.get(Number(p.communityId))
      const threshold = Number(pot?.threshold ?? BigInt(2))
      const quorumMet = Number(p.approvalCount) >= threshold

      if (filter === "executed") return p.executed
      if (filter === "ready") return !p.executed && quorumMet
      if (filter === "pending") return !p.executed && !quorumMet
      return true
    })
  }, [payouts, communityMap, filter])

  const addUsdcToMetaMask = React.useCallback(async () => {
    try {
      const eth =
        typeof window !== "undefined"
          ? (
              window as unknown as {
                ethereum?: { request: (args: unknown) => Promise<boolean> }
              }
            ).ethereum
          : undefined
      if (eth) {
        await eth.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: MOCK_USDC_ADDRESS,
              symbol: "USDC",
              decimals: 6,
            },
          },
        })
        toast.success("USDC token requested in MetaMask!")
      } else {
        toast.info(`USDC Token Contract: ${MOCK_USDC_ADDRESS}`, {
          description: "Paste this contract into MetaMask > Import Tokens",
          duration: 8000,
        })
      }
    } catch {
      toast.error("Could not import token to MetaMask.")
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Governed Disbursements
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enforce M-of-N signer consensus and settle hospital, vendor, or
            family payouts via Roqqu RAS &amp; Base Sepolia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void addUsdcToMetaMask()}
            className="rounded-full text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            title="Add USDC token to MetaMask"
          >
            <PlusCircleIcon className="size-3.5" />
            Import USDC to Wallet
          </Button>
          <ProposePayoutModal ngnPerUsd={ngnPerUsd} />
        </div>
      </div>

      <Tabs
        value={filter}
        onValueChange={(val) => setFilter(val as FilterTab)}
      >
        <TabsList>
          <TabsTrigger value="all">All ({payouts.length})</TabsTrigger>
          <TabsTrigger value="ready">Quorum Met</TabsTrigger>
          <TabsTrigger value="pending">Awaiting Signers</TabsTrigger>
          <TabsTrigger value="executed">Executed</TabsTrigger>
        </TabsList>
      </Tabs>

      {isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>Failed to load disbursement proposals.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetchAll()}
            >
              <RefreshCwIcon className="size-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          <ProposalCardSkeleton />
          <ProposalCardSkeleton />
        </div>
      ) : filteredPayouts.length === 0 ? (
        <Card className="rounded-3xl border-dashed py-12 text-center">
          <CardContent className="mx-auto flex max-w-md flex-col items-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <ShieldCheckIcon className="size-6" />
            </div>
            <h2 className="font-display text-lg font-semibold">
              No Proposals Match This Filter
            </h2>
            <p className="text-sm text-muted-foreground">
              Propose an expense in Naira or USDC to start collecting multi-sig
              approvals.
            </p>
            <ProposePayoutModal ngnPerUsd={ngnPerUsd} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredPayouts.map((payout) => (
            <PayoutCard
              key={String(payout.id)}
              payout={payout}
              community={communityMap.get(Number(payout.communityId))}
              ngnPerUsd={ngnPerUsd}
            />
          ))}
        </div>
      )}
    </div>
  )
}
