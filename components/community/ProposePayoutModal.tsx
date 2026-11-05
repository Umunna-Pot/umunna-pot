"use client"

import * as React from "react"
import { ArrowLeftRightIcon, Loader2Icon, SendIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"
import { useAccount } from "wagmi"
import { useConnectModal } from "@rainbow-me/rainbowkit"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCommunityPots } from "@/hooks/useCommunityPots"
import { formatNgn, formatUsdc } from "@/lib/format"
import { postJsonWithRetry } from "@/lib/postJsonWithRetry"
import { evmAddressSchema } from "@/lib/schemas"

interface ProposePayoutModalProps {
  defaultCommunityId?: number
  ngnPerUsd: number
}

const DEFAULT_VENDOR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

export function ProposePayoutModal({
  defaultCommunityId,
  ngnPerUsd,
}: ProposePayoutModalProps) {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { communities, proposePayout } = useCommunityPots()
  const [open, setOpen] = React.useState(false)
  const [selectedPotId, setSelectedPotId] = React.useState<number>(
    defaultCommunityId ?? Number(communities[0]?.id ?? 0)
  )
  const selectedPot = communities.find((c) => Number(c.id) === selectedPotId)
  const availableUsdc = selectedPot ? Number(selectedPot.balance) / 1e6 : 0
  const availableNgn = availableUsdc * ngnPerUsd

  const initialNgn = availableNgn > 0 ? Math.floor(availableNgn).toString() : "200000"
  const [inputMode, setInputMode] = React.useState<"NGN" | "USDC">("NGN")
  const [rawValue, setRawValue] = React.useState(initialNgn)
  const [recipient, setRecipient] = React.useState(DEFAULT_VENDOR)
  const [reason, setReason] = React.useState("")
  const [settlementRail, setSettlementRail] =
    React.useState("ROQQU_OFFRAMP:NGN")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (defaultCommunityId !== undefined) {
      setSelectedPotId(defaultCommunityId)
    } else if (communities.length > 0) {
      setSelectedPotId(Number(communities[0].id))
    }
  }, [defaultCommunityId, communities])

  React.useEffect(() => {
    if (availableUsdc > 0) {
      if (inputMode === "USDC") {
        setRawValue(availableUsdc.toFixed(2))
      } else {
        setRawValue(Math.floor(availableNgn).toString())
      }
    }
  }, [selectedPotId])

  const numericInput = Math.max(Number(rawValue) || 0, 0)
  const computedUsdc =
    inputMode === "USDC"
      ? numericInput
      : ngnPerUsd > 0
        ? numericInput / ngnPerUsd
        : 0
  const computedNgn =
    inputMode === "NGN" ? numericInput : numericInput * ngnPerUsd

  const isOverBalance = computedUsdc > availableUsdc + 0.001
  const isZeroBalance = availableUsdc <= 0

  const fillMaxAmount = () => {
    if (inputMode === "USDC") {
      setRawValue(availableUsdc.toFixed(2))
    } else {
      setRawValue(Math.floor(availableNgn).toString())
    }
  }

  const toggleCurrencyMode = () => {
    if (inputMode === "NGN") {
      setInputMode("USDC")
      setRawValue(computedUsdc > 0 ? computedUsdc.toFixed(2) : availableUsdc.toFixed(2))
    } else {
      setInputMode("NGN")
      setRawValue(computedNgn > 0 ? String(Math.round(computedNgn)) : String(Math.floor(availableNgn)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !address) {
      if (openConnectModal) {
        openConnectModal()
      } else {
        toast.error("Please connect your Base Sepolia wallet first.")
      }
      return
    }
    const parsedRecipient = evmAddressSchema.safeParse(recipient.trim())
    if (!parsedRecipient.success) {
      toast.error("Enter a valid 0x recipient address.")
      return
    }
    if (computedUsdc <= 0) {
      toast.error("Payout amount must be greater than zero.")
      return
    }
    if (computedUsdc > availableUsdc + 0.001) {
      toast.error(
        `Amount exceeds available treasury balance of ${availableUsdc.toFixed(2)} USDC (${formatNgn(availableNgn)}).`
      )
      return
    }
    if (reason.trim().length < 4) {
      toast.error("Describe the expense purpose for fellow signers.")
      return
    }

    setSubmitting(true)
    try {
      const usdcString = computedUsdc.toFixed(6)
      const txHash = await proposePayout({
        communityId: selectedPotId,
        recipient: parsedRecipient.data as `0x${string}`,
        amountUsdc: usdcString,
        reason: reason.trim(),
        settlementRail,
      })

      // Persist in MongoDB Atlas with resilient retry
      try {
        await postJsonWithRetry("/api/payouts", {
          onChainPotId: selectedPotId,
          title: reason.trim(),
          amountNgn: computedNgn,
          amountUsdc: Number(usdcString),
          recipientType: settlementRail === "bank_transfer" ? "bank_account" : "crypto_address",
          recipientAddress: parsedRecipient.data,
          proposerAddress: (address || "0x21342ab22b3d68464677ced76f811b3ae140192b").toLowerCase().trim(),
        })
      } catch (dbErr) {
        console.warn("[MongoDB] Payout save notice:", dbErr)
        toast.warning(
          "Proposal submitted on-chain, but off-chain database sync is delayed."
        )
      }

      toast.success("Disbursement proposal submitted!", {
        description: txHash
          ? `Base Sepolia Tx: ${txHash.slice(0, 12)}...`
          : `Queued ${computedUsdc.toFixed(2)} USDC (${formatNgn(computedNgn)}) for quorum`,
      })
      setReason("")
      setOpen(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to propose payout."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="rounded-full px-4">
            <SendIcon className="size-3.5" />
            Propose Payout
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Propose Governed Disbursement
          </DialogTitle>
          <DialogDescription>
            Quote vendor or hospital bills in Naira or USDC. Funds unlock only
            after M-of-N signers approve on-chain.
          </DialogDescription>
        </DialogHeader>

        {!isConnected && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <WalletIcon className="size-4 shrink-0" />
              <span>Connect your wallet to sign this proposal on Base Sepolia.</span>
            </div>
            {openConnectModal && (
              <Button
                type="button"
                size="sm"
                onClick={openConnectModal}
                className="h-7 rounded-full text-xs shrink-0"
              >
                Connect
              </Button>
            )}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {defaultCommunityId === undefined && communities.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="payout-pot">Source Community Pot</Label>
              <select
                id="payout-pot"
                value={selectedPotId}
                onChange={(e) => setSelectedPotId(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium"
              >
                {communities.map((pot) => (
                  <option key={String(pot.id)} value={Number(pot.id)}>
                    {pot.name} ({formatUsdc(pot.balance)} USDC avail.)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="payout-amount">
                  Amount ({inputMode === "NGN" ? "NGN" : "USDC"})
                </Label>
                {availableUsdc > 0 && (
                  <button
                    type="button"
                    onClick={fillMaxAmount}
                    className="font-mono text-[11px] font-semibold text-primary hover:underline"
                  >
                    Max: {inputMode === "NGN" ? formatNgn(availableNgn) : `${availableUsdc.toFixed(2)} USDC`}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={toggleCurrencyMode}
                className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-0.5 font-mono text-[11px] font-medium text-primary hover:bg-primary/20"
              >
                <ArrowLeftRightIcon className="size-3" />
                Switch to {inputMode === "NGN" ? "USDC" : "NGN"}
              </button>
            </div>
            <Input
              id="payout-amount"
              type="number"
              min="0.01"
              max={inputMode === "NGN" ? Math.floor(availableNgn) : availableUsdc}
              step="any"
              value={rawValue}
              onChange={(e) => setRawValue(e.target.value)}
              className={isOverBalance ? "border-destructive text-destructive font-mono tabular-nums" : "font-mono tabular-nums"}
              required
            />
            {isOverBalance ? (
              <p className="text-[11px] font-semibold text-destructive">
                ⚠️ Exceeds available pot balance (Max: {availableUsdc.toFixed(2)} USDC / {formatNgn(availableNgn)})
              </p>
            ) : (
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                {inputMode === "NGN"
                  ? `Locks ${computedUsdc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC at 1 USDT = ${formatNgn(ngnPerUsd)}`
                  : `Equivalent to ${formatNgn(computedNgn)} via Roqqu RAS`}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-recipient">Beneficiary Wallet (0x...)</Label>
            <Input
              id="payout-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-reason">Expense Purpose / Invoice Note</Label>
            <Input
              id="payout-reason"
              placeholder="e.g. St. Mary Hospital Ward Equipment Invoice #402"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-rail">Settlement Rail</Label>
            <select
              id="payout-rail"
              value={settlementRail}
              onChange={(e) => setSettlementRail(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium"
            >
              <option value="ROQQU_OFFRAMP:NGN">
                Roqqu Instant NGN Off-Ramp (ROQQU_OFFRAMP:NGN)
              </option>
              <option value="ROQQU_SEND:USDT">
                Roqqu Cross-Chain USDT Payout (ROQQU_SEND:USDT)
              </option>
              <option value="ONCHAIN">
                Direct Base Sepolia USDC Transfer (ONCHAIN)
              </option>
            </select>
          </div>

          <DialogFooter>
            {!isConnected ? (
              <Button
                type="button"
                onClick={openConnectModal}
                className="rounded-full gap-1.5"
              >
                <WalletIcon className="size-4" />
                Connect Wallet to Propose
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitting || isOverBalance || isZeroBalance || computedUsdc <= 0}
                className="rounded-full"
              >
                {submitting && <Loader2Icon className="size-4 animate-spin" />}
                {isOverBalance
                  ? "Exceeds Available Balance"
                  : isZeroBalance
                    ? "Pot Has 0 Balance"
                    : "Submit Proposal for Quorum"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
