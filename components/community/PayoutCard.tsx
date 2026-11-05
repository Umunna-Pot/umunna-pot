"use client"

import * as React from "react"
import {
  BanknoteIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  LockIcon,
  ShieldCheckIcon,
  ThumbsUpIcon,
} from "lucide-react"
import { toast } from "sonner"
import { formatUnits } from "viem"
import { useAccount } from "wagmi"
import { useConnectModal } from "@rainbow-me/rainbowkit"

import { SettlementReceiptDialog } from "@/components/community/SettlementReceiptDialog"
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
import { MOCK_USDC_ADDRESS } from "@/lib/contracts"
import { useCommunityPots } from "@/hooks/useCommunityPots"
import {
  USDC_DECIMALS,
  formatNgn,
  formatUsdc,
  shortenAddress,
  usdcToNgn,
} from "@/lib/format"
import type {
  CommunitySummary,
  PayoutProposal,
  SettlementReceipt,
} from "@/types"

interface PayoutCardProps {
  payout: PayoutProposal
  community?: CommunitySummary
  ngnPerUsd: number
}

export function PayoutCard({ payout, community, ngnPerUsd }: PayoutCardProps) {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { approvePayout, executePayout } = useCommunityPots()
  const [approving, setApproving] = React.useState(false)
  const [executing, setExecuting] = React.useState(false)
  const [receipt, setReceipt] = React.useState<SettlementReceipt | null>(null)
  const [receiptOpen, setReceiptOpen] = React.useState(false)

  const threshold = Number(community?.threshold ?? BigInt(2))
  const approvals = Number(payout.approvalCount)
  const quorumMet = approvals >= threshold
  const progressPct = Math.min(Math.round((approvals / Math.max(threshold, 1)) * 100), 100)
  const amountNgn = usdcToNgn(payout.amount, ngnPerUsd)
  const isRoqquRail = payout.settlementRail.startsWith("ROQQU_")

  const handleApprove = async () => {
    if (!isConnected || !address) {
      if (openConnectModal) {
        openConnectModal()
      } else {
        toast.error("Please connect your Base Sepolia wallet first.")
      }
      return
    }
    setApproving(true)
    try {
      const txHash = await approvePayout(Number(payout.id))
      toast.success(`Approved Proposal #${Number(payout.id)}`, {
        description: txHash ? `Tx: ${txHash.slice(0, 12)}...` : "Signer approval recorded",
      })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve proposal."
      )
    } finally {
      setApproving(false)
    }
  }

  const handleExecuteAndSettle = async () => {
    if (!isConnected || !address) {
      if (openConnectModal) {
        openConnectModal()
      } else {
        toast.error("Please connect your Base Sepolia wallet first.")
      }
      return
    }
    setExecuting(true)
    try {
      const txHash = await executePayout(Number(payout.id))
      const amountUsdcNumeric = Number(formatUnits(payout.amount, USDC_DECIMALS))

      if (isRoqquRail) {
        const res = await fetch("/api/roqqu/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payoutId: Number(payout.id),
            communityId: Number(payout.communityId),
            txHash,
            amountUsdc: amountUsdcNumeric,
            recipient: payout.recipient,
            settlementRail: payout.settlementRail,
          }),
        })
        const settleData = (await res.json()) as SettlementReceipt & {
          message?: string
        }
        if (!res.ok) {
          throw new Error(settleData.message || "Roqqu settlement failed.")
        }
        setReceipt(settleData)
        setReceiptOpen(true)
        toast.success("Quorum executed & settled via Roqqu RAS!")
      } else {
        toast.success("Disbursement executed on Base Sepolia!", {
          description: `Tx: ${txHash.slice(0, 12)}...`,
        })
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to execute disbursement."
      )
    } finally {
      setExecuting(false)
    }
  }

  return (
    <>
      <Card className="flex flex-col justify-between rounded-3xl">
        <CardHeader className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  payout.executed
                    ? "secondary"
                    : quorumMet
                      ? "default"
                      : "outline"
                }
                className="font-mono text-[11px]"
              >
                {payout.executed ? (
                  <>
                    <CheckCircle2Icon className="mr-1 size-3" />
                    Executed
                  </>
                ) : quorumMet ? (
                  <>
                    <ShieldCheckIcon className="mr-1 size-3" />
                    Quorum Met ({approvals}/{threshold})
                  </>
                ) : (
                  <>
                    <LockIcon className="mr-1 size-3" />
                    {approvals}/{threshold} Approvals
                  </>
                )}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                {payout.settlementRail}
              </Badge>
            </div>

            <span className="font-mono text-[11px] text-muted-foreground">
              Proposal #{Number(payout.id)}
            </span>
          </div>

          <CardTitle className="font-display text-base leading-snug">
            {payout.reason}
          </CardTitle>
          <CardDescription className="text-xs">
            {community ? community.name : `Pot #${Number(payout.communityId)}`} &middot;{" "}
            To{" "}
            <a
              href={`https://sepolia.basescan.org/address/${payout.recipient}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-primary hover:underline inline-flex items-center gap-0.5"
              title="View recipient on BaseScan"
            >
              {shortenAddress(payout.recipient, 4)}
              <ExternalLinkIcon className="size-2.5" />
            </a>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between rounded-2xl border border-border bg-muted/35 px-4 py-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Payout Amount</p>
              <p className="font-display text-xl font-bold tabular-nums">
                {formatNgn(amountNgn)}
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-primary tabular-nums">
              {formatUsdc(payout.amount)} USDC
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Multi-Sig Consensus</span>
              <span className="font-mono font-medium tabular-nums">
                {approvals} of {threshold} signers
              </span>
            </div>
            <Progress value={progressPct} />
          </div>
        </CardContent>

        <CardFooter className="flex items-center gap-2 pt-1">
          {!payout.executed ? (
            <>
              {!quorumMet && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleApprove()}
                  disabled={approving}
                  className="flex-1 rounded-full"
                >
                  {approving ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <ThumbsUpIcon className="size-3.5" />
                  )}
                  Approve
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => void handleExecuteAndSettle()}
                disabled={!quorumMet || executing}
                className="flex-1 rounded-full"
              >
                {executing ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <BanknoteIcon className="size-3.5" />
                )}
                {isRoqquRail ? "Execute & Settle via Roqqu" : "Execute Payout"}
              </Button>
            </>
          ) : (
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                <CheckCircle2Icon className="size-3.5" />
                Disbursed &amp; Verified
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://sepolia.basescan.org/token/${MOCK_USDC_ADDRESS}?a=${payout.recipient}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-primary hover:underline rounded-md bg-primary/10 px-2.5 py-1 transition-colors hover:bg-primary/20"
                  title="View token transfer on BaseScan"
                >
                  View on BaseScan
                  <ExternalLinkIcon className="size-3" />
                </a>
                {receipt && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setReceiptOpen(true)}
                  >
                    View Receipt
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      <SettlementReceiptDialog
        receipt={receipt}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </>
  )
}
