"use client"

import Link from "next/link"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CoinsIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TimerIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import { useAccount, useChainId } from "wagmi"

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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import {
  BASE_SEPOLIA_CHAIN_ID,
  UMUNNA_POT_ADDRESS,
  isContractConfigured,
} from "@/lib/contracts"
import { formatNgn, formatUsd, shortenAddress } from "@/lib/format"

const SPOT_SYMBOLS = ["usdt", "btc", "eth", "trx", "sol", "bnb"] as const

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data, isLoading, isError, error, refetch, isFetching } =
    useRoqquRates()

  const contractReady = isContractConfigured()
  const onBaseSepolia = chainId === BASE_SEPOLIA_CHAIN_ID

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Treasury Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hybrid programmable finance bridging Roqqu NGN &amp; multi-chain
            rails into Base Sepolia smart vaults.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon
            className={isFetching ? "size-3.5 animate-spin" : "size-3.5"}
          />
          Refresh RAS Feed
        </Button>
      </div>

      {isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-start justify-between gap-3 pt-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>
                {error instanceof Error
                  ? error.message
                  : "Unable to reach Roqqu API Services."}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>Roqqu NGN Benchmark</CardDescription>
              <CoinsIcon className="size-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-1 h-8 w-36" />
            ) : (
              <CardTitle className="text-2xl font-semibold">
                {data ? formatNgn(data.ngnPerUsd) : "—"}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : data ? (
              <div className="flex items-center justify-between">
                <span>1 USDT / USD Reference</span>
                <Badge variant="secondary">
                  {data.source === "ras-live"
                    ? `RAS ${data.mode}`
                    : data.source}
                </Badge>
              </div>
            ) : (
              <span>Awaiting live rate snapshot</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>RAS Merchant Liquidity</CardDescription>
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-1 h-8 w-44" />
            ) : (
              <CardTitle className="text-2xl font-semibold">
                {data ? formatNgn(data.treasury.totalEstimatedNgn) : "—"}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : data ? (
              <div className="flex items-center justify-between">
                <span>
                  {formatUsd(data.treasury.totalEstimatedUsd)} total reserve
                </span>
                <span className="font-mono">
                  {data.treasury.usdt.toLocaleString()} USDT
                </span>
              </div>
            ) : (
              <span>Staging liquidity pool</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>Wallet &amp; Chain Status</CardDescription>
              <WalletIcon className="size-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl font-semibold">
              {isConnected ? shortenAddress(address, 5) : "Wallet Disconnected"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={onBaseSepolia ? "secondary" : "destructive"}>
              {onBaseSepolia ? "Base Sepolia (84532)" : `Chain #${chainId}`}
            </Badge>
            <Badge variant="outline">
              {contractReady
                ? `Vault ${shortenAddress(UMUNNA_POT_ADDRESS, 3)}`
                : "Local / Ready to Deploy"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Roqqu Multi-Asset Treasury &amp; Spot Feed</CardTitle>
              <CardDescription>
                Live conversion rates and RAS sandbox balances powering instant
                USDT auto-settlement.
              </CardDescription>
            </div>
            {data && (
              <Badge variant="outline" className="w-fit font-mono text-[11px]">
                Updated {new Date(data.updatedAt).toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SPOT_SYMBOLS.map((sym) => (
                <Skeleton key={sym} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SPOT_SYMBOLS.map((sym) => {
                const quote = data.prices[sym]
                const balanceValue =
                  data.treasury[sym as keyof typeof data.treasury]
                const numericBalance =
                  typeof balanceValue === "number" ? balanceValue : 0

                return (
                  <div
                    key={sym}
                    className="flex flex-col justify-between rounded-xl border border-border bg-muted/30 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold tracking-tight uppercase">
                        {sym}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        Bal: {numericBalance.toLocaleString()}
                      </Badge>
                    </div>
                    <Separator className="my-2.5" />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {quote ? formatNgn(quote.ngnPrice) : "—"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {quote ? formatUsd(quote.usdPrice) : "—"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <UsersIcon className="size-4" />
            </div>
            <CardTitle>Community Funds</CardTitle>
            <CardDescription>
              Create M-of-N multi-sig pots for diaspora groups, alumni, and Ajo
              collectives with Roqqu NGN &amp; Web3 deposits.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              render={<Link href="/community-funds" />}
            >
              Open Community Pots
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <CheckCircle2Icon className="size-4" />
            </div>
            <CardTitle>Governed Disbursements</CardTitle>
            <CardDescription>
              Propose expenses, collect on-chain signer approvals, and settle
              via Base USDC or Roqqu off-ramp rails.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              render={<Link href="/disbursements" />}
            >
              Review Proposals
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <TimerIcon className="size-4" />
            </div>
            <CardTitle>Freelancer Drip Vault</CardTitle>
            <CardDescription>
              Lock lump-sum income into automated time-released installments
              protected by an accountability guardian.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              render={<Link href="/drip-vault" />}
            >
              Configure Drip Vault
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

