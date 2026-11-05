"use client"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useCommunityContributions,
  useCommunityPots,
} from "@/hooks/useCommunityPots"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn, formatUsdc, shortenAddress, usdcToNgn } from "@/lib/format"

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  const potId = Number(params.id ?? 0)
  const { data: ratesData } = useRoqquRates()
  const { communities, payouts, isLoading } = useCommunityPots()
  const { contributions, isLoading: loadingContribs } =
    useCommunityContributions(potId)

  const ngnPerUsd = ratesData?.ngnPerUsd ?? 1375
  const community = communities.find((c) => Number(c.id) === potId)
  const potPayouts = payouts.filter((p) => Number(p.communityId) === potId)

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

        <div className="flex items-center gap-2">
          <ContributeModal
            communityId={potId}
            communityName={community.name}
            ngnPerUsd={ngnPerUsd}
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
          <Badge className="bg-primary/20 font-mono text-primary">
            <ShieldCheckIcon className="mr-1 size-3.5" />
            {Number(community.threshold)}-of-{community.signers.length} Multi-Sig
            Quorum
          </Badge>
          <span className="font-mono text-xs text-surface-ink-muted">
            Pot #{potId} &middot; Created by{" "}
            {shortenAddress(community.creator, 4)}
          </span>
        </div>

        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {community.name}
        </h1>

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
            <p className="font-mono text-xs text-surface-ink-muted tabular-nums">
              {formatNgn(usdcToNgn(community.totalContributed, ngnPerUsd))}
            </p>
          </div>

          <div className="rounded-2xl border border-surface-ink-border bg-surface-ink/55 p-4">
            <p className="text-xs text-surface-ink-muted">Total Disbursed</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">
              {formatUsdc(community.totalDisbursed)} USDC
            </p>
            <p className="font-mono text-xs text-accent-warm tabular-nums">
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
            ) : contributions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No contributions recorded yet. Use &ldquo;Contribute&rdquo; to
                test Web3 or Roqqu NGN inflow!
              </p>
            ) : (
              contributions.map((item, idx) => {
                const viaRoqqu = item.contributorTag
                  .toLowerCase()
                  .includes("roqqu")
                return (
                  <div
                    key={`${item.contributorTag}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                          viaRoqqu
                            ? "bg-accent-warm/15 text-accent-warm"
                            : "bg-primary/12 text-primary"
                        }`}
                      >
                        {viaRoqqu ? (
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
                          {shortenAddress(item.sender, 4)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-xs font-semibold text-primary tabular-nums">
                        +{formatUsdc(item.amount)} USDC
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {formatNgn(usdcToNgn(item.amount, ngnPerUsd))}
                      </p>
                    </div>
                  </div>
                )
              })
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
