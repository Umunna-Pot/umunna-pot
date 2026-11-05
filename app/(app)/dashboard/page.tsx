"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangleIcon, ArrowUpRightIcon, CoinsIcon, CreditCardIcon,
  ExternalLinkIcon, RefreshCwIcon, ShieldCheckIcon, UsersIcon, WalletIcon,
} from "lucide-react"
import { useAccount, useChainId } from "wagmi"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { PotCardSkeleton, ActivityRowSkeleton } from "@/components/shared/ContentSkeletons"
import { ContributeModal } from "@/components/community/ContributeModal"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import {
  useCommunitiesQuery,
  useContributionsQuery,
  useProposalsQuery,
} from "@/hooks/useDashboardData"
import {
  BASE_SEPOLIA_CHAIN_ID,
  UMUNNA_POT_ADDRESS,
  isContractConfigured,
} from "@/lib/contracts"
import {
  formatNgn,
  shortenAddress,
} from "@/lib/format"

export default function DashboardPage() {
  const chainId = useChainId()
  const { data: ratesData, isLoading: ratesLoading, refetch: refetchRates, isFetching: ratesFetching } = useRoqquRates()
  const { data: dbCommunities = [], isLoading: commsLoading, refetch: refetchComms, isFetching: commsFetching } = useCommunitiesQuery()
  const { data: dbContributions = [], isLoading: contribsLoading, refetch: refetchContribs, isFetching: contribsFetching } = useContributionsQuery()
  const { data: dbProposals = [], isLoading: propsLoading, refetch: refetchProps, isFetching: propsFetching } = useProposalsQuery()

  const loadingData = commsLoading || contribsLoading || propsLoading
  const isRefreshing = commsFetching || contribsFetching || propsFetching || ratesFetching

  const refetchAll = React.useCallback(() => {
    void refetchRates()
    void refetchComms()
    void refetchContribs()
    void refetchProps()
  }, [refetchRates, refetchComms, refetchContribs, refetchProps])

  const ngnPerUsd = ratesData?.ngnPerUsd ?? 1375
  const contractReady = isContractConfigured()

  const totalVaultBalanceUsdc = dbCommunities.reduce(
    (acc, curr) => acc + (curr.currentBalanceUsdc || 0),
    0
  )
  const totalVaultBalanceNgn = totalVaultBalanceUsdc * ngnPerUsd
  const pendingProposals = dbProposals.filter((p) => p.status === "proposed")

  return (
    <div className="space-y-8 pb-12">
      {/* Top Bar Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              Treasury Overview
            </h1>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs">
              Base Sepolia Live
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-sig community funds bridging Roqqu Bank Transfers into Ethereum smart contracts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAll()}
            disabled={isRefreshing}
            className="gap-2 rounded-full"
          >
            <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync Ledger
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Total Treasury */}
        <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Total Governed Treasury</span>
              <ShieldCheckIcon className="size-4 text-primary" />
            </div>
            {loadingData ? (
              <Skeleton className="my-1 h-9 w-44 rounded-xl" />
            ) : (
              <CardTitle className="font-display text-3xl font-black tracking-tight tabular-nums">
                {formatNgn(totalVaultBalanceNgn)}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {loadingData ? (
                <>
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </>
              ) : (
                <>
                  <span className="font-semibold text-primary">
                    ${totalVaultBalanceUsdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                  </span>
                  <span>{dbCommunities.length} Active Pots</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roqqu Benchmark Rate */}
        <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Roqqu NGN Benchmark</span>
              <CoinsIcon className="size-4 text-accent-warm" />
            </div>
            {ratesLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <CardTitle className="font-display text-3xl font-black tracking-tight tabular-nums">
                {formatNgn(ngnPerUsd)}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1 USD Benchmark</span>
              <span className="text-emerald-500 font-medium">Instant Bank Settlement</span>
            </div>
          </CardContent>
        </Card>

        {/* Quorum Governance Status */}
        <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Quorum Governance</span>
              <UsersIcon className="size-4 text-muted-foreground" />
            </div>
            {loadingData ? (
              <Skeleton className="my-1 h-9 w-28 rounded-xl" />
            ) : (
              <CardTitle className="font-display text-3xl font-black tracking-tight">
                {pendingProposals.length > 0 ? `${pendingProposals.length} Pending` : "All Clear"}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Multi-sig M-of-N rules</span>
              <span className="font-mono">{contractReady ? shortenAddress(UMUNNA_POT_ADDRESS, 4) : "Contracts active"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Proposal Banner (If any) */}
      {pendingProposals.length > 0 && (
        <Card className="rounded-3xl border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 rounded-2xl bg-amber-500/10 p-2.5 text-amber-500">
                <AlertTriangleIcon className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                    Quorum Vote Required
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    Pot #{pendingProposals[0]?.onChainPotId}
                  </span>
                </div>
                <h4 className="mt-1 font-display text-base font-bold text-foreground">
                  {pendingProposals[0]?.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Disbursement request:{" "}
                  <strong className="text-foreground">
                    {formatNgn(pendingProposals[0]?.amountNgn || 0)}
                  </strong>{" "}
                  (${pendingProposals[0]?.amountUsdc} USDC) · {pendingProposals[0]?.approvals.length} of 2 signatures collected
                </p>
              </div>
            </div>

            <Link href="/disbursements">
              <Button size="sm" className="gap-2 rounded-full font-semibold shadow-sm">
                Review &amp; Sign
                <ArrowUpRightIcon className="size-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Active Community Pots Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Active Community Pots</h2>
            <p className="text-xs text-muted-foreground">
              Multi-signature group vaults governed on Base Sepolia.
            </p>
          </div>
          <Link href="/community-funds">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
              View All <ArrowUpRightIcon className="size-3" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {loadingData ? (
            <>
              <PotCardSkeleton />
              <PotCardSkeleton />
            </>
          ) : dbCommunities.length === 0 ? (
            <Card className="col-span-full rounded-3xl border-dashed border-border/60 bg-card/40 p-8 text-center text-xs text-muted-foreground">
              No community pots found.
            </Card>
          ) : (
            dbCommunities.map((pot) => {
              const currentNgn = (pot.currentBalanceUsdc || 0) * ngnPerUsd
              const targetNgn = pot.targetAmountNgn || 1
              const rawPct = (currentNgn / targetNgn) * 100
              const pct = Math.min(Number(rawPct.toFixed(1)), 100)

              return (
                <Card key={pot._id} className="flex flex-col justify-between rounded-3xl border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-border hover:shadow-md">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                            {pot.category}
                          </Badge>
                          {pct >= 100 && (
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] font-semibold text-primary">
                              Goal Reached
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-display text-lg font-bold">{pot.name}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {pot.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {formatNgn(currentNgn)}{" "}
                          <span className="text-muted-foreground">/ {formatNgn(targetNgn)}</span>
                        </span>
                        <span className="font-semibold text-primary">
                          {pct % 1 === 0 ? pct.toFixed(0) : pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                      <span>Quorum Rule: <strong>{pot.quorumThreshold}-of-{pot.signers.length} Signers</strong></span>
                      <span>{pot.contributorCount ?? 1} Contributors</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-2">
                    <ContributeModal
                      communityId={pot.onChainPotId}
                      communityName={pot.name}
                      ngnPerUsd={ngnPerUsd}
                      targetAmountNgn={pot.targetAmountNgn}
                      currentBalanceUsdc={pot.currentBalanceUsdc}
                    />
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Real-Time Verified Activity Feed */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Recent Verified Activity</h2>
          <p className="text-xs text-muted-foreground">
            Both Roqqu Bank Transfers and Web3 deposits automatically confirmed on Base Sepolia.
          </p>
        </div>

        <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm backdrop-blur-sm overflow-hidden">
          <div className="divide-y divide-border/40">
            {loadingData ? (
              <>
                <ActivityRowSkeleton />
                <ActivityRowSkeleton />
                <ActivityRowSkeleton />
              </>
            ) : dbContributions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No contributions recorded yet. Be the first to contribute!
              </div>
            ) : (
              dbContributions.slice(0, 6).map((item) => (
                <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                      {item.paymentMethod === "roqqu_fiat" ? (
                        <CreditCardIcon className="size-4" />
                      ) : (
                        <WalletIcon className="size-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">
                          {item.contributorName}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.paymentMethod === "roqqu_fiat" ? "Roqqu Bank Transfer" : "Base Sepolia USDC"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Pot #{item.onChainPotId} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="font-display font-bold text-sm text-foreground tabular-nums">
                        {formatNgn(item.amountNgn)}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        +${item.amountUsdc.toFixed(2)} USDC
                      </div>
                    </div>

                    {item.txHash && (
                      <a
                        href={`https://sepolia.basescan.org/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-border/60 bg-background/50 p-2 text-muted-foreground hover:text-foreground transition-colors"
                        title="View on BaseScan"
                      >
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
