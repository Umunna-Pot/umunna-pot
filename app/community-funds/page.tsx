"use client"

import { UsersIcon, WalletIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn } from "@/lib/format"

export default function CommunityFundsPage() {
  const { data } = useRoqquRates()

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Community Funds
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pooled multi-sig treasuries accepting both Base Sepolia USDC and
            Roqqu NGN / multi-chain deposits.
          </p>
        </div>
        <Badge variant="secondary">Phase 2 Module Ready</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UsersIcon className="size-4 text-primary" />
              <CardTitle>On-Chain Multi-Sig Pots</CardTitle>
            </div>
            <CardDescription>
              Backed by <code className="font-mono">UmunnaPot.sol</code>{" "}
              (<code className="font-mono">createCommunity</code> &amp;{" "}
              <code className="font-mono">contribute</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Signers, M-of-N approval thresholds, and contributor tags are
            verified and unit-tested in Foundry. Interactive pot creation and
            dual-rail contribution modals unlock in Phase 2.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <WalletIcon className="size-4 text-primary" />
              <CardTitle>Roqqu RAS Fiat &amp; Crypto Inflow</CardTitle>
            </div>
            <CardDescription>
              Live conversion benchmark:{" "}
              {data ? `1 USDT = ${formatNgn(data.ngnPerUsd)}` : "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Contributors without a Web3 wallet will pay via Roqqu Payment Links
            or generated deposit wallets while the Treasury Relayer credits the
            community pot on Base Sepolia.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

