"use client"

import * as React from "react"
import { useAccount, useChainId, useSwitchChain } from "wagmi"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CoinsIcon,
  LockIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  TimerIcon,
  WalletIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PotCardSkeleton } from "@/components/shared/ContentSkeletons"
import { CreateDripVaultModal } from "@/components/drip/CreateDripVaultModal"
import { DripVaultCard } from "@/components/drip/DripVaultCard"
import { useDripVault } from "@/hooks/useDripVault"
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/contracts"
import { type IDripVault } from "@/models/DripVault"

export default function DripVaultPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const isCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID

  const {
    refetchAll: refetchOnChain,
  } = useDripVault()

  const [fetchedVaults, setFetchedVaults] = React.useState<IDripVault[]>([])
  const [loading, setLoading] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const vaults = isConnected && address ? fetchedVaults : []

  const fetchVerifiedVaults = React.useCallback(async (userAddress: string) => {
    try {
      const res = await fetch(`/api/drip-vaults?address=${userAddress}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load verified vaults.`)
      }
      const data = await res.json()
      setFetchedVaults(data.vaults || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching vaults")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let ignore = false
    if (address && isConnected) {
      fetch(`/api/drip-vaults?address=${address}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load verified vaults.`)
          return res.json()
        })
        .then((data) => {
          if (!ignore) {
            setFetchedVaults(data.vaults || [])
            setError(null)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (!ignore) {
            setError(err instanceof Error ? err.message : "Error fetching vaults")
            setLoading(false)
          }
        })
    }

    return () => {
      ignore = true
    }
  }, [address, isConnected])

  const handleRefresh = async () => {
    if (!address) return
    setRefreshing(true)
    await Promise.all([refetchOnChain(), fetchVerifiedVaults(address)])
    setRefreshing(false)
  }

  // Calculate aggregated stats across user's verified vaults
  const totalLockedUsdc = vaults.reduce((acc, v) => {
    return acc + parseFloat(v.totalLockedBaseUnits || "0") / 1_000_000
  }, 0)

  const totalClaimedUsdc = vaults.reduce((acc, v) => {
    return acc + parseFloat(v.claimedBaseUnits || "0") / 1_000_000
  }, 0)

  const activeStreamsCount = vaults.filter((v) => v.active).length

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              Freelancer Drip Vaults
            </h1>
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-primary text-xs"
            >
              Base Sepolia Live
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Programmable payment streams on Base Sepolia. Lock income and disburse predictable tranches with emergency guardian unlocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || !isConnected}
            className="gap-2 rounded-full"
          >
            <RefreshCwIcon className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Sync Ledger
          </Button>

          <CreateDripVaultModal onSuccess={handleRefresh} />
        </div>
      </div>

      {/* Network Alert if on wrong chain */}
      {isConnected && !isCorrectChain && (
        <div className="flex items-center justify-between rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="size-4 shrink-0" />
            <span>
              Connected to unsupported chain. Please switch to <strong>Base Sepolia (84532)</strong> to interact with Drip Vaults.
            </span>
          </div>
          {switchChain && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID })}
              className="rounded-full text-xs"
            >
              Switch Network
            </Button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Total Locked */}
        <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Your Governed Timelocks</span>
              <LockIcon className="size-4 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl font-bold tracking-tight">
              {totalLockedUsdc.toFixed(2)}{" "}
              <span className="font-mono text-sm font-normal text-primary">mUSDC</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Total principal secured across all your active and historic vaults.
          </CardContent>
        </Card>

        {/* Total Claimed */}
        <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Disbursed to Date</span>
              <CoinsIcon className="size-4 text-emerald-500" />
            </div>
            <CardTitle className="font-display text-2xl font-bold tracking-tight">
              {totalClaimedUsdc.toFixed(2)}{" "}
              <span className="font-mono text-sm font-normal text-emerald-600 dark:text-emerald-400">
                mUSDC
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Installments successfully released on-chain according to schedule.
          </CardContent>
        </Card>

        {/* Active Streams */}
        <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Active Streams</span>
              <TimerIcon className="size-4 text-amber-500" />
            </div>
            <CardTitle className="font-display text-2xl font-bold tracking-tight">
              {activeStreamsCount}{" "}
              <span className="font-mono text-xs font-normal text-muted-foreground">
                of {vaults.length} vaults
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Ongoing payment schedules running on Base Sepolia timelocks.
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Your Drip Vaults
            </h2>
            <p className="text-xs text-muted-foreground">
              Smart contract streams where you are a funder, beneficiary, or guardian.
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {vaults.length} Verified {vaults.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {/* Disconnected State */}
        {!isConnected ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center rounded-3xl border-dashed">
            <WalletIcon className="size-10 text-muted-foreground mb-3" />
            <CardTitle className="font-display text-lg">Connect Your Wallet</CardTitle>
            <CardDescription className="max-w-md mt-1 text-xs">
              Connect your Ethereum wallet to Base Sepolia to inspect your active drip streams, create automated payroll locks, or claim due installments.
            </CardDescription>
          </Card>
        ) : loading ? (
          /* Loading State */
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <PotCardSkeleton />
            <PotCardSkeleton />
            <PotCardSkeleton />
          </div>
        ) : error ? (
          /* Error State */
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-start gap-2">
            <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load verified vaults</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        ) : vaults.length === 0 ? (
          /* Empty State */
          <Card className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-dashed">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <TimerIcon className="size-6 text-primary" />
            </div>
            <CardTitle className="font-display text-lg">No Drip Vaults Found</CardTitle>
            <CardDescription className="max-w-md mt-1 text-xs text-muted-foreground leading-relaxed">
              You haven&apos;t created or participated in any Drip Vaults yet. Lock funds into your first timelock stream with guardian co-signing to prevent premature spending.
            </CardDescription>
            <div className="mt-5">
              <CreateDripVaultModal onSuccess={handleRefresh} />
            </div>
          </Card>
        ) : (
          /* Grid of Vaults */
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {vaults.map((vault) => (
              <DripVaultCard
                key={String(vault.onChainVaultId || vault._id)}
                vault={vault}
                onReleaseSuccess={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Feature Explainer Callouts */}
      <div className="grid gap-5 md:grid-cols-2 pt-4">
        <Card className="rounded-3xl border-border/80 bg-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TimerIcon className="size-4 text-primary" />
              <CardTitle className="font-display text-base">
                Deterministic Timelocks
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Automated smart contract releases on Base Sepolia.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Every installment is enforced directly by the UmunnaPot smart contract.
            Neither Umunna Pot servers nor AI agents can alter scheduled release times or bypass timelocks.
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/80 bg-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="size-4 text-accent-warm" />
              <CardTitle className="font-display text-base">
                Guardian Emergency Co-Signing
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Designated accountability partner protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            In genuine emergency situations, beneficiaries can request an early unlock on-chain.
            Funds are released only when the designated guardian approves the transaction.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
