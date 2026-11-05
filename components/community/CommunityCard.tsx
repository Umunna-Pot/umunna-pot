"use client"

import Link from "next/link"
import { ArrowRightIcon, ShieldCheckIcon, UsersIcon } from "lucide-react"

import { ContributeModal } from "@/components/community/ContributeModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatNgn, formatUsdc, shortenAddress, usdcToNgn } from "@/lib/format"
import type { CommunitySummary } from "@/types"

interface CommunityCardProps {
  community: CommunitySummary
  ngnPerUsd: number
}

export function CommunityCard({ community, ngnPerUsd }: CommunityCardProps) {
  const balanceNgn = usdcToNgn(community.balance, ngnPerUsd)
  const contributedNgn = usdcToNgn(community.totalContributed, ngnPerUsd)
  const potId = Number(community.id)

  return (
    <Card className="group flex flex-col justify-between rounded-3xl transition-all hover:border-primary/40 hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="font-mono text-[11px]">
            <ShieldCheckIcon className="mr-1 size-3 text-primary" />
            {Number(community.threshold)}-of-{community.signers.length} Quorum
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">
            Pot #{potId}
          </span>
        </div>

        <div>
          <CardTitle className="font-display text-lg tracking-tight">
            {community.name}
          </CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1.5 text-xs">
            <UsersIcon className="size-3.5 text-muted-foreground" />
            <span>
              Created by {shortenAddress(community.creator, 4)} &middot;{" "}
              {community.signers.length} signers
            </span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border bg-muted/35 p-4">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Available Treasury Balance
          </p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums">
            {formatNgn(balanceNgn)}
          </p>
          <p className="mt-0.5 font-mono text-xs font-medium text-primary tabular-nums">
            {formatUsdc(community.balance)} USDC
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Total Pooled</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatUsdc(community.totalContributed)} USDC ({formatNgn(contributedNgn)})
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-2 pt-2">
        <ContributeModal
          communityId={potId}
          communityName={community.name}
          ngnPerUsd={ngnPerUsd}
          currentBalanceUsdc={Number(community.balance) / 1e6}
        />
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-full"
          render={<Link href={`/community-funds/${potId}`} />}
        >
          Manage Pot
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}
