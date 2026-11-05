"use client"

import {
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { formatNgn, formatUsd, shortenAddress } from "@/lib/format"
import type { SettlementReceipt } from "@/types"

interface SettlementReceiptDialogProps {
  receipt: SettlementReceipt | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettlementReceiptDialog({
  receipt,
  open,
  onOpenChange,
}: SettlementReceiptDialogProps) {
  if (!receipt) return null

  const basescanUrl = `https://sepolia.basescan.org/tx/${receipt.onchainTxHash}`

  const handleCopySummary = () => {
    const summary = [
      `Umunna Pot × Roqqu RAS Settlement Receipt`,
      `Receipt ID: ${receipt.receiptId}`,
      `Amount: ${formatNgn(receipt.amountNgn)} (${receipt.amountUsdc.toFixed(2)} USDC)`,
      `Rail: ${receipt.settlementRail}`,
      `Recipient: ${receipt.recipient}`,
      `Base Sepolia Tx: ${receipt.onchainTxHash}`,
    ].join("\n")
    void navigator.clipboard.writeText(summary)
    toast.success("Settlement receipt copied!")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center justify-between">
            <Badge className="bg-primary/15 text-primary">
              <CheckCircle2Icon className="mr-1 size-3.5" />
              Disbursement Settled
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              #{receipt.receiptId}
            </span>
          </div>
          <DialogTitle className="font-display text-xl">
            Roqqu &times; Base Settlement Receipt
          </DialogTitle>
          <DialogDescription>
            Quorum verified and funds settled across hybrid rails.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Total Disbursed Value
          </p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums">
            {formatNgn(receipt.amountNgn)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-primary tabular-nums">
            {formatUsd(receipt.amountUsdc)} USDC @ {formatNgn(receipt.ngnPerUsd)}/USD
          </p>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Settlement Rail</span>
            <span className="font-mono font-medium">
              {receipt.settlementRail}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Beneficiary</span>
            <span className="font-mono">{shortenAddress(receipt.recipient, 6)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Roqqu RAS Status</span>
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <ShieldCheckIcon className="size-3.5" />
              {receipt.roqquStatus === "settled-ras"
                ? "RAS Live Settled"
                : "Verified Staging Settlement"}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Base Sepolia Proof</span>
            <a
              href={basescanUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
            >
              {shortenAddress(receipt.onchainTxHash, 5)}
              <ExternalLinkIcon className="size-3" />
            </a>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCopySummary}
            className="rounded-full"
          >
            <CopyIcon className="size-3.5" />
            Copy Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
