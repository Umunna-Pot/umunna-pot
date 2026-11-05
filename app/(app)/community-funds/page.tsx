"use client"

import {
  AlertCircleIcon,
  RefreshCwIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"

import { CommunityCard } from "@/components/community/CommunityCard"
import { CreateFundModal } from "@/components/community/CreateFundModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PotCardSkeleton } from "@/components/shared/ContentSkeletons"
import { useCommunityPots } from "@/hooks/useCommunityPots"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn, formatUsdc, usdcToNgn } from "@/lib/format"

export default function CommunityFundsPage() {
  const { data: ratesData } = useRoqquRates()
  const { communities, isLoading, isError, refetchAll, liveContract } =
    useCommunityPots()

  const ngnPerUsd = ratesData?.ngnPerUsd ?? 1375
  const totalBalance = communities.reduce((acc, c) => acc + c.balance, BigInt(0))

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Community Funds
            </h1>
            {!liveContract && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                <SparklesIcon className="mr-1 size-3 text-accent-warm" />
                Interactive Showcase
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pooled M-of-N multi-sig treasuries accepting both Base USDC and
            direct bank transfer / crypto deposits.
          </p>
        </div>

        <CreateFundModal />
      </div>

      {/* Summary Banner */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
        <div>
          <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            Combined Community Treasury
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">
              {formatNgn(usdcToNgn(totalBalance, ngnPerUsd))}
            </span>
            <span className="font-mono text-sm font-medium text-primary tabular-nums">
              {formatUsdc(totalBalance)} USDC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Live Roqqu Rate:{" "}
            <strong className="font-mono text-foreground">
              1 USDT = {formatNgn(ngnPerUsd)}
            </strong>
          </span>
        </div>
      </div>

      {isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>Failed to load on-chain community pots.</span>
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
          <PotCardSkeleton />
          <PotCardSkeleton />
        </div>
      ) : communities.length === 0 ? (
        <Card className="rounded-3xl border-dashed py-12 text-center">
          <CardContent className="mx-auto flex max-w-md flex-col items-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <UsersIcon className="size-6" />
            </div>
            <h2 className="font-display text-lg font-semibold">
              No Community Pots Yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Launch your first M-of-N multi-sig pot for your family health
              drive, alumni group, or Ajo circle.
            </p>
            <CreateFundModal />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {communities.map((community) => (
            <CommunityCard
              key={String(community.id)}
              community={community}
              ngnPerUsd={ngnPerUsd}
            />
          ))}
        </div>
      )}
    </div>
  )
}
