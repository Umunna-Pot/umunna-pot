"use client"

import * as React from "react"
import { AlertTriangleIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { shortenAddress } from "@/lib/format"
import { type SyncStatus, type SyncDripVaultResult } from "@/lib/dripVaultSync"

interface SyncRecoveryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  txHash: `0x${string}` | null
  vaultId: bigint | null
  syncStatus: SyncStatus
  isRetryingSync: boolean
  onRetrySync: () => Promise<SyncDripVaultResult>
  onSuccess: () => void
}

export function SyncRecoveryDialog({
  open,
  onOpenChange,
  txHash,
  vaultId,
  isRetryingSync,
  onRetrySync,
  onSuccess,
}: Omit<SyncRecoveryDialogProps, "syncStatus">) {
  const [retryError, setRetryError] = React.useState<string | null>(null)

  const handleRetry = async () => {
    setRetryError(null)
    try {
      const res = await onRetrySync()
      if (res.status === "ON_CHAIN_SUCCESS_DATABASE_SYNCED") {
        toast.success("Drip Vault synchronized successfully with Umunna Pot database!")
        onSuccess()
        onOpenChange(false)
      } else {
        setRetryError(res.error || "Database synchronization failed. Please try again.")
      }
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Sync error")
    }
  }

  const copyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash)
      toast.success("Transaction hash copied to clipboard.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangleIcon className="size-5" />
            <DialogTitle className="font-display text-lg">
              On-Chain Success &middot; Sync Pending
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Your Drip Vault has been successfully created on Base Sepolia. However, our server encountered a temporary delay indexing the transaction into the database ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/40 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">On-Chain Vault ID:</span>
            <span className="font-mono font-semibold">
              {vaultId !== null ? `Vault #${vaultId.toString()}` : "Detected"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Transaction Hash:</span>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span>{txHash ? shortenAddress(txHash, 6) : "Unknown"}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyTxHash}
                className="size-6 text-muted-foreground hover:text-foreground"
              >
                <CopyIcon className="size-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Network:</span>
            <span className="font-semibold text-primary">Base Sepolia (84532)</span>
          </div>

          {txHash && (
            <div className="pt-1">
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <span>View on BaseScan</span>
                <ExternalLinkIcon className="size-3" />
              </a>
            </div>
          )}
        </div>

        {retryError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            <p className="font-semibold">Sync Attempt Failed:</p>
            <p className="mt-0.5">{retryError}</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full text-xs"
          >
            Review Later
          </Button>

          <Button
            onClick={handleRetry}
            disabled={isRetryingSync}
            className="rounded-full gap-2 text-xs"
          >
            {isRetryingSync ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Synchronizing Ledger...
              </>
            ) : (
              <>
                <RefreshCwIcon className="size-3.5" />
                Retry Database Sync
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
