"use client"

import * as React from "react"
import { formatUnits } from "viem"
import {
  ClockIcon,
  CoinsIcon,
  ExternalLinkIcon,
  Loader2Icon,
  LockIcon,
  TimerIcon,
  UserIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { Progress } from "@/components/ui/progress"
import { shortenAddress } from "@/lib/format"
import { type IDripVault } from "@/models/DripVault"
import { useDripVault } from "@/hooks/useDripVault"

interface DripVaultCardProps {
  vault: IDripVault | (Record<string, unknown> & {
    onChainVaultId?: string
    totalLockedBaseUnits?: string
    remainingBaseUnits?: string
    claimedBaseUnits?: string
    installmentAmountBaseUnits?: string
    intervalSeconds?: number
    nextReleaseAt?: string | Date
    active?: boolean
    earlyExitRequested?: boolean
    beneficiaryAddress: string
    guardianAddress: string
    transactionHash: string
    releasedCount?: number
  })
  onReleaseSuccess?: () => void
}

export function DripVaultCard({ vault, onReleaseSuccess }: DripVaultCardProps) {
  const { releaseDue, isSubmitting } = useDripVault()
  const [releasing, setReleasing] = React.useState(false)

  // Financial values from 6-decimal base units
  const totalLocked = parseFloat(formatUnits(BigInt(vault.totalLockedBaseUnits || "0"), 6))
  const remaining = parseFloat(formatUnits(BigInt(vault.remainingBaseUnits || "0"), 6))
  const claimed = parseFloat(formatUnits(BigInt(vault.claimedBaseUnits || "0"), 6))
  const installment = parseFloat(formatUnits(BigInt(vault.installmentAmountBaseUnits || "0"), 6))

  const progressPercent = totalLocked > 0 ? Math.min(100, Math.round((claimed / totalLocked) * 100)) : 0

  // Format date and time
  const nextReleaseDate = vault.nextReleaseAt ? new Date(vault.nextReleaseAt) : null
  const now = new Date()
  const isDue = vault.active && nextReleaseDate && now >= nextReleaseDate && remaining > 0

  const handleRelease = async () => {
    if (!vault.onChainVaultId) return
    setReleasing(true)
    try {
      const res = await releaseDue(BigInt(vault.onChainVaultId))
      toast.success(
        `Installment successfully released! Received ${parseFloat(
          formatUnits(res.releasedAmount, 6)
        ).toFixed(2)} mUSDC.`
      )
      onReleaseSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to release installment")
    } finally {
      setReleasing(false)
    }
  }

  // Frequency description
  let frequencyLabel = `${vault.intervalSeconds}s`
  if (vault.intervalSeconds === 604800) frequencyLabel = "Weekly"
  else if (vault.intervalSeconds === 86400) frequencyLabel = "Daily"
  else if (vault.intervalSeconds === 2592000) frequencyLabel = "Monthly"

  return (
    <Card className="group flex flex-col justify-between rounded-3xl transition-all hover:border-primary/40 hover:shadow-md">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-[11px]">
              <TimerIcon className="mr-1 size-3 text-primary" />
              Vault #{vault.onChainVaultId}
            </Badge>

            {vault.active ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                Streaming Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px] font-mono">
                Completed
              </Badge>
            )}

            {vault.earlyExitRequested && (
              <Badge variant="destructive" className="text-[10px] font-mono">
                Early Unlock Pending
              </Badge>
            )}
          </div>

          <span className="font-mono text-[11px] text-muted-foreground">
            Cadence: {frequencyLabel}
          </span>
        </div>

        <div>
          <CardTitle className="font-display text-lg tracking-tight">
            Self-Payroll Timelock Stream
          </CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 text-xs">
            <UserIcon className="size-3.5 text-muted-foreground" />
            <span>
              Beneficiary: {shortenAddress(vault.beneficiaryAddress, 4)} &middot; Guardian: {shortenAddress(vault.guardianAddress, 4)}
            </span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Treasury Balances */}
        <div className="rounded-2xl border border-border bg-muted/30 p-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Locked
              </p>
              <p className="mt-0.5 font-display text-xl font-bold tabular-nums">
                {totalLocked.toFixed(2)}{" "}
                <span className="font-mono text-xs font-normal text-primary">mUSDC</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Remaining Balance
              </p>
              <p className="mt-0.5 font-display text-xl font-bold tabular-nums">
                {remaining.toFixed(2)}{" "}
                <span className="font-mono text-xs font-normal text-muted-foreground">mUSDC</span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>Claimed: {claimed.toFixed(2)} mUSDC</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </div>

        {/* Schedule & Release Information */}
        <div className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Installment Size:</span>
            <span className="font-mono font-semibold text-foreground">
              {installment.toFixed(2)} mUSDC
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Releases Completed:</span>
            <span className="font-mono font-semibold text-foreground">
              {vault.releasedCount || 0}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Next Release:</span>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <ClockIcon className="size-3 text-primary" />
              <span>
                {nextReleaseDate
                  ? nextReleaseDate.toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "N/A"}
              </span>
            </div>
          </div>

          {/* Verified transaction reference */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
            <span className="text-muted-foreground">Transaction:</span>
            <a
              href={`https://sepolia.basescan.org/tx/${vault.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-mono text-primary hover:underline"
            >
              <span>{shortenAddress(vault.transactionHash, 5)}</span>
              <ExternalLinkIcon className="size-2.5" />
            </a>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          onClick={handleRelease}
          disabled={!isDue || releasing || isSubmitting}
          className="w-full rounded-full gap-2 text-xs"
          variant={isDue ? "default" : "outline"}
        >
          {releasing ? (
            <>
              <Loader2Icon className="size-3.5 animate-spin" />
              Releasing Installment...
            </>
          ) : isDue ? (
            <>
              <CoinsIcon className="size-3.5" />
              Claim Due Installment ({installment.toFixed(2)} mUSDC)
            </>
          ) : (
            <>
              <LockIcon className="size-3.5 text-muted-foreground" />
              Next Release Pending
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
