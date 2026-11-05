"use client"

import * as React from "react"
import { CheckCircle2Icon, LinkIcon, Loader2Icon, WalletIcon } from "lucide-react"
import { toast } from "sonner"

import { RoqquCheckoutCard } from "@/components/community/RoqquCheckoutCard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCommunityPots } from "@/hooks/useCommunityPots"
import { useInvalidateDashboard } from "@/hooks/useDashboardData"
import { formatNgn } from "@/lib/format"
import { postJsonWithRetry } from "@/lib/postJsonWithRetry"
import type { RoqquCheckoutResult, RoqquWebhookResult } from "@/types"

interface ContributeModalProps {
  communityId: number
  communityName: string
  ngnPerUsd: number
  targetAmountNgn?: number
  currentBalanceUsdc?: number
}

export function ContributeModal({
  communityId,
  communityName,
  ngnPerUsd,
  targetAmountNgn,
  currentBalanceUsdc = 0,
}: ContributeModalProps) {
  const { contributeUsdc, applyRoqquWebhookCredit } = useCommunityPots()
  const invalidateDashboard = useInvalidateDashboard()
  const [open, setOpen] = React.useState(false)

  const currentBalanceNgn = (currentBalanceUsdc || 0) * ngnPerUsd
  const hasTarget = Boolean(targetAmountNgn && targetAmountNgn > 0)
  const remainingNgn = hasTarget
    ? Math.max(0, targetAmountNgn! - currentBalanceNgn)
    : null
  const remainingUsdc =
    hasTarget && ngnPerUsd > 0
      ? Math.max(0, targetAmountNgn! / ngnPerUsd - (currentBalanceUsdc || 0))
      : null
  const isGoalReached = hasTarget && remainingNgn !== null && remainingNgn <= 0

  const defaultUsdc = remainingUsdc !== null ? Math.min(100, Math.max(1, Math.floor(remainingUsdc))).toString() : "100"
  const defaultNgn = remainingNgn !== null ? Math.min(200000, Math.max(1000, Math.floor(remainingNgn))).toString() : "200000"

  const [usdcAmount, setUsdcAmount] = React.useState(defaultUsdc)
  const [web3Tag, setWeb3Tag] = React.useState("Adaobi (Base USDC)")
  const [submittingWeb3, setSubmittingWeb3] = React.useState(false)
  const [rail, setRail] = React.useState<"payment_link" | "crypto_wallet">("payment_link")
  const [network, setNetwork] = React.useState("trc20")
  const [ngnAmount, setNgnAmount] = React.useState(defaultNgn)
  const [contributorName, setContributorName] = React.useState("Uncle Chidi")
  const [contributorEmail, setContributorEmail] = React.useState("chidi@family.ng")
  const [creatingCheckout, setCreatingCheckout] = React.useState(false)
  const [simulatingWebhook, setSimulatingWebhook] = React.useState(false)
  const [checkout, setCheckout] = React.useState<RoqquCheckoutResult | null>(null)

  const parsedUsdc = Math.max(Number(usdcAmount) || 0, 0)
  const parsedNgn = Math.max(Number(ngnAmount) || 0, 0)
  const estimatedUsdcFromNgn =
    ngnPerUsd > 0 ? Math.round((parsedNgn / ngnPerUsd) * 1e6) / 1e6 : 0

  const handleWeb3Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parsedUsdc <= 0) {
      toast.error("Enter a valid USDC amount.")
      return
    }
    if (remainingUsdc !== null && parsedUsdc > remainingUsdc + 0.05) {
      toast.error(`Amount exceeds remaining target (${remainingUsdc.toFixed(2)} USDC).`)
      return
    }
    setSubmittingWeb3(true)
    try {
      const txHash = await contributeUsdc({
        communityId,
        amountUsdc: parsedUsdc.toFixed(2),
        contributorTag: web3Tag.trim() || "Web3 Contributor",
      })

      // Sync confirmed Web3 contribution to MongoDB Atlas.
      // The tx hash is the payment reference, so retries can never double-record it.
      const ref = txHash ? `W3-${txHash}` : `W3-${Date.now().toString(36).toUpperCase()}`
      const saved = await postJsonWithRetry("/api/contributions", {
        onChainPotId: communityId,
        contributorName: web3Tag.trim() || "Web3 Contributor",
        amountNgn: parsedUsdc * ngnPerUsd,
        amountUsdc: parsedUsdc,
        paymentMethod: "web3_direct",
        paymentReference: ref,
        txHash: txHash ?? undefined,
      })
      if (!saved) {
        toast.warning("Deposit confirmed on-chain, but the activity feed entry failed to save.", {
          description: "Your funds and the pot balance are correct; only the feed entry is missing.",
        })
      }

      invalidateDashboard()

      toast.success(
        `Contributed ${parsedUsdc.toFixed(2)} USDC to ${communityName}`,
        {
          description: txHash ? `Tx: ${txHash.slice(0, 12)}...` : undefined,
        }
      )
      setOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("not been authorized") || msg.includes("User rejected")) {
        toast.error("MetaMask request was cancelled or active account mismatch.")
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmittingWeb3(false)
    }
  }

  const handleRoqquCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parsedNgn <= 0) {
      toast.error("Enter a valid NGN amount.")
      return
    }
    if (remainingNgn !== null && parsedNgn > remainingNgn) {
      toast.error(`Amount exceeds remaining target (${formatNgn(remainingNgn)}).`)
      return
    }
    setCreatingCheckout(true)
    try {
      const res = await fetch("/api/roqqu/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          rail,
          amountNgn: parsedNgn,
          network,
          contributorName,
          contributorEmail,
        }),
      })
      const payload = (await res.json()) as RoqquCheckoutResult & { message?: string }
      if (!res.ok) throw new Error(payload.message || "Failed to create Roqqu checkout.")
      setCheckout(payload)
      toast.success("Roqqu RAS checkout ready!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Roqqu checkout failed.")
    } finally {
      setCreatingCheckout(false)
    }
  }

  const handleSimulateWebhook = async () => {
    if (!checkout) return
    setSimulatingWebhook(true)
    try {
      const isBtc = checkout.rail === "crypto_wallet" && network === "bitcoin"
      const res = await fetch("/api/roqqu/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demoSimulate: true,
          paymentReference: checkout.paymentReference,
          communityId: checkout.communityId,
          amountNgn: checkout.amountNgn,
          contributorName: checkout.contributorName,
          depositedToken: isBtc ? "btc" : "ngn",
          depositedTokenAmount: isBtc ? 0.002 : 0,
        }),
      })
      const result = (await res.json()) as RoqquWebhookResult & { message?: string }
      if (!res.ok) throw new Error(result.message || "Webhook simulation failed.")

      if (result.status === "duplicate") {
        toast.info("This Roqqu payment reference was already credited.")
      } else {
        await applyRoqquWebhookCredit({
          communityId: result.communityId,
          usdcCredited: result.usdcCredited,
          contributorTag: result.contributorTag,
        })
        toast.success(`Credited ${result.usdcCredited.toFixed(2)} USDC via Roqqu Relayer!`, {
          description: `Tagged: ${result.contributorTag}`,
        })
        invalidateDashboard()
      }
      setCheckout(null)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm Roqqu deposit.")
    } finally {
      setSimulatingWebhook(false)
    }
  }

  if (isGoalReached) {
    return (
      <Button
        disabled
        size="sm"
        variant="secondary"
        className="flex-1 cursor-not-allowed rounded-full text-xs font-semibold opacity-85"
      >
        <CheckCircle2Icon className="mr-1.5 size-3.5 text-primary" />
        Target Reached (100%)
      </Button>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) setCheckout(null)
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" className="flex-1 rounded-full">
            Contribute
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Contribute to {communityName}
          </DialogTitle>
          <DialogDescription>
            Fund via Base Sepolia USDC or share a direct bank transfer /
            multi-chain link with relatives.
          </DialogDescription>
        </DialogHeader>

        {hasTarget && remainingNgn !== null && (
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Remaining goal:</span>
            <span className="font-mono font-semibold text-primary">
              {formatNgn(remainingNgn)} ({remainingUsdc?.toFixed(2)} USDC)
            </span>
          </div>
        )}

        <Tabs defaultValue="roqqu" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roqqu">
              <LinkIcon className="size-3.5" />
              Pay via Roqqu (NGN / Crypto)
            </TabsTrigger>
            <TabsTrigger value="web3">
              <WalletIcon className="size-3.5" />
              Base USDC Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roqqu" className="mt-4 space-y-4">
            {!checkout ? (
              <form
                onSubmit={(e) => void handleRoqquCheckout(e)}
                className="space-y-3.5"
              >
                <div className="grid grid-cols-2 gap-2">
                  {(["payment_link", "crypto_wallet"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRail(r)}
                      className={`rounded-xl border p-2.5 text-left text-xs transition-colors ${
                        rail === r ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {r === "payment_link" ? "NGN Payment Link" : "Multi-Chain Wallet"}
                    </button>
                  ))}
                </div>

                {rail === "crypto_wallet" && (
                  <div className="space-y-1">
                    <Label htmlFor="roqqu-net">Deposit Chain</Label>
                    <select
                      id="roqqu-net"
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs"
                    >
                      <option value="trc20">TRON (USDT TRC-20)</option>
                      <option value="bitcoin">Bitcoin (BTC Auto-Sell)</option>
                      <option value="bep20">BNB Smart Chain (BEP-20)</option>
                      <option value="base">Base Network</option>
                    </select>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="roqqu-name">Contributor Name</Label>
                    <Input
                      id="roqqu-name"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="roqqu-email">Receipt Email</Label>
                    <Input
                      id="roqqu-email"
                      type="email"
                      value={contributorEmail}
                      onChange={(e) => setContributorEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="roqqu-ngn">Amount (NGN)</Label>
                    <div className="flex items-center gap-2">
                      {remainingNgn !== null && (
                        <button
                          type="button"
                          onClick={() => setNgnAmount(Math.floor(remainingNgn).toString())}
                          className="font-mono text-[11px] font-semibold text-primary hover:underline"
                        >
                          Max: {formatNgn(remainingNgn)}
                        </button>
                      )}
                      <span className="font-mono text-xs text-primary tabular-nums">
                        ≈ {estimatedUsdcFromNgn.toFixed(2)} USDC
                      </span>
                    </div>
                  </div>
                  <Input
                    id="roqqu-ngn"
                    type="number"
                    min={100}
                    max={remainingNgn !== null ? Math.floor(remainingNgn) : undefined}
                    step="any"
                    value={ngnAmount}
                    onChange={(e) => setNgnAmount(e.target.value)}
                    className="font-mono tabular-nums"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={creatingCheckout}
                  className="w-full rounded-full"
                >
                  {creatingCheckout && (
                    <Loader2Icon className="size-4 animate-spin" />
                  )}
                  Generate Roqqu Checkout
                </Button>
              </form>
            ) : (
              <RoqquCheckoutCard
                checkout={checkout}
                simulatingWebhook={simulatingWebhook}
                onSimulateWebhook={() => void handleSimulateWebhook()}
              />
            )}
          </TabsContent>

          <TabsContent value="web3" className="mt-4">
            <form
              onSubmit={(e) => void handleWeb3Submit(e)}
              className="space-y-3.5"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="web3-usdc">Amount (Base mUSDC)</Label>
                  <div className="flex items-center gap-2">
                    {remainingUsdc !== null && (
                      <button
                        type="button"
                        onClick={() => setUsdcAmount(remainingUsdc.toFixed(2))}
                        className="font-mono text-[11px] font-semibold text-primary hover:underline"
                      >
                        Max: {remainingUsdc.toFixed(2)} USDC
                      </button>
                    )}
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      ≈ {formatNgn(parsedUsdc * ngnPerUsd)}
                    </span>
                  </div>
                </div>
                <Input
                  id="web3-usdc"
                  type="number"
                  min={1}
                  max={remainingUsdc !== null ? remainingUsdc : undefined}
                  step="0.01"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="web3-tag">On-Chain Contributor Tag</Label>
                <Input
                  id="web3-tag"
                  value={web3Tag}
                  onChange={(e) => setWeb3Tag(e.target.value)}
                  placeholder="e.g. Ngozi (Diaspora Lead)"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submittingWeb3}
                className="w-full rounded-full"
              >
                {submittingWeb3 && (
                  <Loader2Icon className="size-4 animate-spin" />
                )}
                Approve &amp; Contribute mUSDC
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
