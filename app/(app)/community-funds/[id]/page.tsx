"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeftIcon,
  LinkIcon,
  ShieldCheckIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

import { ContributeModal } from "@/components/community/ContributeModal"
import { PayoutCard } from "@/components/community/PayoutCard"
import { ProposePayoutModal } from "@/components/community/ProposePayoutModal"
import { ShareContributionLink } from "@/components/community/ShareContributionLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useCommunityContributions,
  useCommunityPots,
} from "@/hooks/useCommunityPots"
import {
  useCommunitiesQuery,
  useContributionsQuery,
} from "@/hooks/useDashboardData"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn, formatUsdc, shortenAddress, usdcToNgn } from "@/lib/format"

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  const potId = Number(params.id ?? 0)
  const { data: ratesData } = useRoqquRates()
  const {
    communities,
    payouts,
    isLoading: onChainLoading,
    liveContract,
  } = useCommunityPots()
  const {
    data: dbCommunities = [],
    isLoading: dbLoading,
  } = useCommunitiesQuery()
  const {
    data: dbContributions = [],
    isLoading: loadingDbContribs,
  } = useContributionsQuery(potId)
  const {
    contributions: onChainContribs,
    isLoading: loadingOnChainContribs,
  } = useCommunityContributions(potId)

  const ngnPerUsd = ratesData?.ngnPerUsd ?? 1375

  const isLoading = onChainLoading || dbLoading
  const loadingContribs = loadingDbContribs || loadingOnChainContribs

  // Match the on-chain pot with its MongoDB registration
  const dbCommunity = React.useMemo(() => {
    return dbCommunities.find((c) => Number(c.onChainPotId) === potId)
  }, [dbCommunities, potId])

  const onChainCommunity = communities.find((c) => Number(c.id) === potId)

  // In live mode, only recognize pots registered in the active database
  const isRegistered = !liveContract || Boolean(dbCommunity)

  const community = React.useMemo(() => {
    if (!onChainCommunity || !isRegistered) return null
    return {
      ...onChainCommunity,
      category: dbCommunity?.category,
      description: dbCommunity?.description,
      targetAmountNgn: dbCommunity?.targetAmountNgn,
      targetAmountUsdc: dbCommunity?.targetAmountUsdc,
    }
  }, [onChainCommunity, isRegistered, dbCommunity])

  const potPayouts = payouts.filter((p) => Number(p.communityId) === potId)

  // Merge contributions: prioritize confirmed DB records (Roqqu bank transfers and Web3)
  const displayContributions = React.useMemo(() => {
    if (dbContributions && dbContributions.length > 0) {
      return dbContributions.map((item) => {
        const isRoqqu = Boolean(
          item.paymentMethod?.toLowerCase().includes("roqqu") ||
            item.paymentReference?.startsWith("UMUNNA-")
        )
        return {
          id: item._id,
          contributorTag:
            item.contributorName ||
            (isRoqqu ? "Roqqu NGN Donor" : "Base USDC Donor"),
          sender: item.txHash
            ? shortenAddress(item.txHash, 4)
            : item.paymentReference
              ? `Ref: ${item.paymentReference.slice(0, 10)}`
              : "Verified Inflow",
          amountUsdc: item.amountUsdc,
          amountNgn: item.amountNgn || item.amountUsdc * ngnPerUsd,
          viaRoqqu: isRoqqu,
          createdAt: item.createdAt,
        }
      })
    }
    return onChainContribs.map((item, idx) => {
      const isRoqqu = item.contributorTag.toLowerCase().includes("roqqu")
      const usdcVal = Number(item.amount) / 1e6
      return {
        id: `onchain-${idx}`,
        contributorTag: item.contributorTag,
        sender: shortenAddress(item.sender, 4),
        amountUsdc: usdcVal,
        amountNgn: usdcToNgn(item.amount, ngnPerUsd),
        viaRoqqu: isRoqqu,
        createdAt: undefined,
      }
    })
  }, [dbContributions, onChainContribs, ngnPerUsd])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    )
  }

  if (!community) {
    return (
      <Card className="rounded-3xl py-12 text-center">
        <CardContent className="space-y-3">
          <p className="font-display text-lg font-semibold">
            Community Pot #{potId} Not Found
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            render={<Link href="/community-funds" />}
          >
            <ArrowLeftIcon className="size-4" />
            Back to Community Funds
          </Button>
        </CardContent>
      </Card>
    )
  }

  const targetAmountNgn = community.targetAmountNgn ?? 0
  const targetAmountUsdc =
    community.targetAmountUsdc ?? (targetAmountNgn > 0 ? targetAmountNgn / ngnPerUsd : 0)
  const contributedNgn = usdcToNgn(community.totalContributed, ngnPerUsd)
  const rawProgress = targetAmountNgn > 0 ? (contributedNgn / targetAmountNgn) * 100 : 0
  const progressPct = Math.min(100, Math.round(rawProgress * 10) / 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          render={<Link href="/community-funds" />}
        >
          <ArrowLeftIcon className="size-4" />
          All Community Pots
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <ShareContributionLink
            communityId={potId}
            communityName={community.name}
          />
          <ContributeModal
            communityId={potId}
            communityName={community.name}
            ngnPerUsd={ngnPerUsd}
            currentBalanceUsdc={Number(community.balance) / 1e6}
          />
          <ProposePayoutModal
            defaultCommunityId={potId}
            ngnPerUsd={ngnPerUsd}
          />
        </div>
      </div>

      {/* Hero Treasury Summary */}
      <div className="glass-ink rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/20 font-mono text-primary">
              <ShieldCheckIcon className="mr-1 size-3.5" />
              {Number(community.threshold)}-of-{community.signers.length} Multi-Sig
              Quorum
            </Badge>
            {community.category && (
              <Badge
                variant="outline"
                className="border-surface-ink-border font-mono text-xs capitalize text-surface-ink-foreground"
              >
                {community.category}
              </Badge>
            )}
          </div>
          <span className="font-mono text-xs text-surface-ink-muted">
            Pot #{potId} &middot; Created by{" "}
            {shortenAddress(community.creator, 4)}
          </span>
        </div>

        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {community.name}
        </h1>

        {community.description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-surface-ink-muted">
            {community.description}
          </p>
        )}

        {targetAmountNgn > 0 && (
          <div className="mt-5 space-y-2 rounded-2xl border border-surface-ink-border bg-surface-ink/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-surface-ink-muted">
                Fundraising Target:{" "}
                <strong className="font-mono text-surface-ink-foreground">
                  {formatNgn(targetAmountNgn)}
                </strong>{" "}
                (≈ {formatUsdc(BigInt(Math.round(targetAmountUsdc * 1e6)))} USDC)
              </span>
              <span className="font-mono font-bold text-primary">
                {progressPct}% Funded
              </span>
            </div>
            <Progress value={progressPct} className="h-2 bg-surface-ink-border" />
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-surface-ink-border bg-surface-ink/55 p-4">
            <p className="text-xs text-surface-ink-muted">Available Balance</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">
              {formatNgn(usdcToNgn(community.balance, ngnPerUsd))}
            </p>
            <p className="font-mono text-xs text-primary tabular-nums">
              {formatUsdc(community.balance)} USDC
            </p>
          </div>

          <div className="rounded-2xl border border-surface-ink-border bg-surface-ink/55 p-4">
            <p className="text-xs text-surface-ink-muted">Total Contributed</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">
              {formatUsdc(community.totalContributed)} USDC
            </p>
            <p className="font-mono text-xs tabular-nums text-surface-ink-muted">
              {formatNgn(usdcToNgn(community.totalContributed, ngnPerUsd))}
            </p>
          </div>

          <div className="rounded-2xl border border-surface-ink-border bg-surface-ink/55 p-4">
            <p className="text-xs text-surface-ink-muted">Total Disbursed</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">
              {formatUsdc(community.totalDisbursed)} USDC
            </p>
            <p className="font-mono text-xs tabular-nums text-accent-warm">
              {formatNgn(usdcToNgn(community.totalDisbursed, ngnPerUsd))}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-surface-ink-muted">
            <UsersIcon className="size-3.5" />
            Authorized Signers:
          </span>
          {community.signers.map((signer) => (
            <Badge
              key={signer}
              variant="outline"
              className="border-surface-ink-border font-mono text-[11px] text-surface-ink-foreground"
            >
              {shortenAddress(signer, 5)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Tagged Hybrid Contributions Ledger */}
        <Card className="rounded-3xl lg:col-span-6">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Hybrid Contribution Ledger
            </CardTitle>
            <CardDescription>
              Every Web3 deposit and Roqqu NGN payment link inflow is tagged
              transparently.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingContribs ? (
              <>
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </>
            ) : displayContributions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No contributions recorded yet. Use &ldquo;Contribute&rdquo; to
                test Web3 or Roqqu NGN inflow!
              </p>
            ) : (
              displayContributions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                        item.viaRoqqu
                          ? "bg-accent-warm/15 text-accent-warm"
                          : "bg-primary/12 text-primary"
                      }`}
                    >
                      {item.viaRoqqu ? (
                        <LinkIcon className="size-4" />
                      ) : (
                        <WalletIcon className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {item.contributorTag}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {item.sender}
                        {item.createdAt && (
                          <span className="ml-1.5 opacity-75">
                            &middot;{" "}
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-primary tabular-nums">
                      +{item.amountUsdc.toFixed(2)} USDC
                    </p>
                    <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatNgn(item.amountNgn)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pot Disbursement Proposals */}
        <div className="space-y-4 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              Disbursement Proposals ({potPayouts.length})
            </h2>
          </div>

          {potPayouts.length === 0 ? (
            <Card className="rounded-3xl border-dashed py-10 text-center">
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  No disbursement proposals for this pot yet.
                </p>
                <ProposePayoutModal
                  defaultCommunityId={potId}
                  ngnPerUsd={ngnPerUsd}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {potPayouts.map((proposal) => (
                <PayoutCard
                  key={String(proposal.id)}
                  payout={proposal}
                  community={community}
                  ngnPerUsd={ngnPerUsd}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
