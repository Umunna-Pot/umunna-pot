"use client"

import * as React from "react"
import { Loader2Icon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react"
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
import { useInvalidateDashboard } from "@/hooks/useDashboardData"
import { postJsonWithRetry } from "@/lib/postJsonWithRetry"
import { evmAddressSchema } from "@/lib/schemas"

const SAMPLE_SIGNERS = [
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
]

export function CreateFundModal() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { createCommunity, liveContract } = useCommunityPots()
  const invalidateDashboard = useInvalidateDashboard()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState<
    "alumni" | "welfare" | "family" | "project" | "general"
  >("alumni")
  const [description, setDescription] = React.useState("")
  const [targetAmountNgn, setTargetAmountNgn] = React.useState("5000000")
  const [signers, setSigners] = React.useState<string[]>([
    address ?? "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    SAMPLE_SIGNERS[0],
  ])
  const [threshold, setThreshold] = React.useState(2)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (address) {
      setSigners((prev) => [address, ...prev.slice(1)])
    }
  }, [address])

  const addSignerRow = () => {
    const nextSample =
      SAMPLE_SIGNERS[signers.length % SAMPLE_SIGNERS.length] ?? ""
    setSigners((prev) => [...prev, nextSample])
  }

  const removeSignerRow = (index: number) => {
    if (signers.length <= 1) return
    const updated = signers.filter((_, idx) => idx !== index)
    setSigners(updated)
    if (threshold > updated.length) {
      setThreshold(updated.length)
    }
  }

  const updateSigner = (index: number, value: string) => {
    setSigners((prev) => prev.map((item, idx) => (idx === index ? value : item)))
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
    const cleanName = name.trim()
    if (cleanName.length < 3) {
      toast.error("Enter a community pot name (at least 3 characters).")
      return
    }

    const validatedSigners: `0x${string}`[] = []
    const seen = new Set<string>()
    for (const raw of signers) {
      const parsed = evmAddressSchema.safeParse(raw.trim())
      if (!parsed.success) {
        toast.error(`Invalid signer address: ${raw || "(empty)"}`)
        return
      }
      const lower = parsed.data.toLowerCase()
      if (seen.has(lower)) {
        toast.error("Duplicate signer addresses are not allowed.")
        return
      }
      seen.add(lower)
      validatedSigners.push(parsed.data as `0x${string}`)
    }

    if (threshold < 1 || threshold > validatedSigners.length) {
      toast.error("Threshold must be between 1 and total signers.")
      return
    }

    const numTargetNgn = Number(targetAmountNgn)
    if (!numTargetNgn || numTargetNgn < 1000) {
      toast.error("Please enter a valid target amount (min ₦1,000).")
      return
    }
    const numTargetUsdc = Math.round((numTargetNgn / 1375) * 100) / 100

    setSubmitting(true)
    try {
      const res = await createCommunity({
        name: cleanName,
        signers: validatedSigners,
        threshold,
      })
      const txHash = res?.txHash
      const onChainPotId = res?.onChainPotId

      // Persist in MongoDB Atlas (retried; the route is idempotent per on-chain pot ID)
      const saved = await postJsonWithRetry("/api/communities", {
        onChainPotId,
        name: cleanName,
        description: description.trim(),
        targetAmountNgn: numTargetNgn,
        targetAmountUsdc: numTargetUsdc,
        quorumThreshold: threshold,
        signers: validatedSigners,
        creatorAddress: address || validatedSigners[0],
        category,
      })
      if (saved) {
        invalidateDashboard()
      } else {
        toast.warning("Pot created on-chain, but saving its dashboard details failed.", {
          description: `On-chain Pot #${onChainPotId ?? "?"} is live and funds are safe. Contact support to link its target.`,
        })
      }

      toast.success(`Created "${cleanName}" (${threshold}-of-${validatedSigners.length})`, {
        description: txHash
          ? `Base Sepolia Tx: ${txHash.slice(0, 10)}...`
          : liveContract
            ? undefined
            : "Active in interactive Demo Showcase mode",
      })
      setName("")
      setDescription("")
      setCategory("alumni")
      setTargetAmountNgn("5000000")
      setOpen(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create community pot."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-full px-4">
            <PlusIcon className="size-4" />
            Create Community Pot
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            New Multi-Sig Community Pot
          </DialogTitle>
          <DialogDescription>
            Configure signers and quorum rules. Anyone can contribute via Base
            USDC or Roqqu NGN links; only M-of-N signers can release funds.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="pot-name">Community / Drive Name</Label>
            <Input
              id="pot-name"
              placeholder="e.g. Lagos Tech Circle Emergency Health Pot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pot-category">Pot Category</Label>
            <select
              id="pot-category"
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value as
                    | "alumni"
                    | "welfare"
                    | "family"
                    | "project"
                    | "general"
                )
              }
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium"
            >
              <option value="alumni">🎓 Alumni Initiative (School & Campus Builds)</option>
              <option value="welfare">🏥 Healthcare & Emergency Welfare</option>
              <option value="project">⚡ Community Project / Homeland Infrastructure</option>
              <option value="family">🤝 Family & Kinship Circle</option>
              <option value="general">🌐 General Multi-Sig Pot</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pot-description">Purpose / Description</Label>
            <textarea
              id="pot-description"
              rows={2}
              placeholder="e.g. Milestone savings pool by alumni home and abroad to finance the new student tech hub"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-card p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pot-target">Fundraising Target (NGN)</Label>
              <span className="font-mono text-xs text-muted-foreground">
                ≈ ${(Math.max(0, Number(targetAmountNgn) || 0) / 1375).toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}{" "}
                USDC
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                ₦
              </span>
              <Input
                id="pot-target"
                type="number"
                min="1000"
                step="1000"
                placeholder="5000000"
                value={targetAmountNgn}
                onChange={(e) => setTargetAmountNgn(e.target.value)}
                className="pl-7 font-mono text-sm"
                required
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { label: "₦1M", val: "1000000" },
                { label: "₦2.5M", val: "2500000" },
                { label: "₦5M", val: "5000000" },
                { label: "₦10M", val: "10000000" },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setTargetAmountNgn(preset.val)}
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                    targetAmountNgn === preset.val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Authorized Signers ({signers.length})</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={addSignerRow}
              >
                <PlusIcon className="size-3" />
                Add Signer
              </Button>
            </div>

            <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
              {signers.map((signer, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={signer}
                    onChange={(e) => updateSigner(idx, e.target.value)}
                    placeholder="0x..."
                    className="font-mono text-xs"
                  />
                  {signers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeSignerRow(idx)}
                      aria-label="Remove signer"
                    >
                      <Trash2Icon className="size-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">Quorum Threshold (M-of-N)</p>
                  <p className="text-[11px] text-muted-foreground">
                    Approvals required before any disbursement executes
                  </p>
                </div>
              </div>
              <select
                aria-label="Quorum threshold"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="rounded-lg border border-input bg-card px-2.5 py-1.5 font-mono text-xs font-semibold"
              >
                {signers.map((_, idx) => {
                  const val = idx + 1
                  return (
                    <option key={val} value={val}>
                      {val} of {signers.length}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          </div>

          <DialogFooter className="mt-3 pt-3">
            {!isConnected ? (
              <Button
                type="button"
                onClick={openConnectModal}
                className="rounded-full"
              >
                Connect Wallet to Deploy
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="rounded-full">
                {submitting && <Loader2Icon className="size-4 animate-spin" />}
                Deploy Community Pot
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
