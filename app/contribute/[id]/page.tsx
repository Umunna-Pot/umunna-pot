"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ShieldCheckIcon, UsersIcon } from "lucide-react"

import { ContributeModal } from "@/components/community/ContributeModal"
import { ShareContributionLink } from "@/components/community/ShareContributionLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useCommunityPots } from "@/hooks/useCommunityPots"
import { useCommunitiesQuery } from "@/hooks/useDashboardData"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn, formatUsdc, usdcToNgn } from "@/lib/format"

/**
 * Public, shareable contribution page: /contribute/[id]
 * Lives outside the (app) shell so supporters see only the pot and a pay button.
 * No wallet is needed for the Roqqu NGN bank-transfer rail.
 */
export default function PublicContributePage() {
  const params = useParams<{ id: string }>()
  const potId = Number(params.id ?? 0)

  const { data: ratesData } = useRoqquRates()
  const { communities, isLoading: onChainLoading, liveContract } = useCommunityPots()
  const { data: dbCommunities = [], isLoading: dbLoading } = useCommunitiesQuery()

  const ngnPerUsd = ratesData?.ngnPerUsd ?? 1375
  const isLoading = onChainLoading || dbLoading

  const dbCommunity = React.useMemo(
    () => dbCommunities.find((c) => Number(c.onChainPotId) === potId),
    [dbCommunities, potId]
  )
  const onChainCommunity = communities.find((c) => Number(c.id) === potId)
  const isRegistered = !liveContract || Boolean(dbCommunity)
  const community = onChainCommunity && isRegistered ? onChainCommunity : null

  const targetAmountNgn = dbCommunity?.targetAmountNgn ?? 0
  const raisedNgn = community ? usdcToNgn(community.totalContributed, ngnPerUsd) : 0
  const progressPct =
    targetAmountNgn > 0
      ? Math.min(100, Math.round((raisedNgn / targetAmountNgn) * 1000) / 10)
      : 0

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-5 px-4 py-10">
      <Link
        href="/"
        className="text-center font-display text-sm font-bold tracking-tight text-primary"
      >
        Umunna Pot
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      ) : !community ? (
        <Card className="rounded-3xl py-10 text-center">
          <CardContent className="space-y-3">
            <p className="font-display text-lg font-semibold">
              This contribution link is not valid
            </p>
            <p className="text-xs text-muted-foreground">
              Pot #{potId} could not be found. Ask the organizer to share the
              link again.
            </p>
            <Button variant="outline" className="rounded-full" render={<Link href="/" />}>
              Go to Umunna Pot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="glass-ink rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/20 font-mono text-primary">
                <ShieldCheckIcon className="mr-1 size-3.5" />
                {Number(community.threshold)}-of-{community.signers.length} Multi-Sig
                Protected
              </Badge>
              {dbCommunity?.category && (
                <Badge
                  variant="outline"
                  className="border-surface-ink-border font-mono text-xs capitalize text-surface-ink-foreground"
                >
                  {dbCommunity.category}
                </Badge>
              )}
            </div>

            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {community.name}
            </h1>
            {dbCommunity?.description && (
              <p className="mt-2 text-sm leading-relaxed text-surface-ink-muted">
                {dbCommunity.description}
              </p>
            )}

            <div className="mt-5 rounded-2xl border border-surface-ink-border bg-surface-ink/55 p-4">
              <p className="text-xs text-surface-ink-muted">Raised so far</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                {formatNgn(raisedNgn)}
              </p>
              <p className="font-mono text-xs text-primary tabular-nums">
                {formatUsdc(community.totalContributed)} USDC
              </p>
              {targetAmountNgn > 0 && (
                <div className="mt-3 space-y-1.5">
                  <Progress value={progressPct} className="h-2 bg-surface-ink-border" />
                  <div className="flex justify-between text-[11px] text-surface-ink-muted">
                    <span>{progressPct}% funded</span>
                    <span>Goal {formatNgn(targetAmountNgn)}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-surface-ink-muted">
              <UsersIcon className="size-3.5" />
              Funds are held in a smart contract. Payouts need{" "}
              {Number(community.threshold)} of {community.signers.length} signers to
              approve.
            </p>
          </div>

          <ContributeModal
            communityId={potId}
            communityName={community.name}
            ngnPerUsd={ngnPerUsd}
            targetAmountNgn={dbCommunity?.targetAmountNgn}
            currentBalanceUsdc={Number(community.balance) / 1e6}
            defaultOpen
            triggerClassName="w-full rounded-full"
          />

          <ShareContributionLink
            communityId={potId}
            communityName={community.name}
            variant="ghost"
            className="mx-auto rounded-full"
            label="Share this link with others"
          />

          <p className="text-center text-[11px] text-muted-foreground">
            Pay in Naira by bank transfer or with a crypto wallet. No account
            needed.
          </p>
        </>
      )}
    </main>
  )
}

