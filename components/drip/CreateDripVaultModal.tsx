"use client"

import * as React from "react"
import { isAddress, parseUnits } from "viem"
import { useAccount, useChainId } from "wagmi"
import {
  BotIcon,
  CheckCircle2Icon,
  CoinsIcon,
  Loader2Icon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TimerIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { AISchedulePreview } from "./AISchedulePreview"
import { SyncRecoveryDialog } from "./SyncRecoveryDialog"
import { useDripVault } from "@/hooks/useDripVault"
import {
  type DripPlanResponse,
  type SupportedFrequency,
} from "@/lib/aiSchemas"
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/contracts"
import { formatUsdc } from "@/lib/format"

interface CreateDripVaultModalProps {
  onSuccess?: () => void
}

export function CreateDripVaultModal({ onSuccess }: CreateDripVaultModalProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const {
    usdcBalance,
    createDripVault,
    retrySync,
    isSubmitting,
    isRetryingSync,
    lastTxHash,
    lastVaultId,
  } = useDripVault()

  const [open, setOpen] = React.useState(false)
  const [syncRecoveryOpen, setSyncRecoveryOpen] = React.useState(false)

  // Form inputs
  const [totalAmountUsdc, setTotalAmountUsdc] = React.useState("500")
  const [beneficiary, setBeneficiary] = React.useState(address || "")
  const [guardian, setGuardian] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [frequency, setFrequency] = React.useState<SupportedFrequency>("weekly")
  const [installments, setInstallments] = React.useState("4")
  const [customIntervalSeconds, setCustomIntervalSeconds] = React.useState("60")
  const [firstReleaseDelaySeconds, setFirstReleaseDelaySeconds] = React.useState("0")

  // AI Recommendation State
  const [aiLoading, setAiLoading] = React.useState(false)
  const [recommendedPlan, setRecommendedPlan] = React.useState<DripPlanResponse | null>(null)

  // Step indicator
  const [step, setStep] = React.useState<"form" | "confirm">("form")

  const handleRequestAiPlan = async () => {
    const amountNum = parseFloat(totalAmountUsdc)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid total amount before requesting AI schedule.")
      return
    }

    setAiLoading(true)

    try {
      const payload = {
        totalAmountUsdc: amountNum,
        frequency,
        targetInstallments: installments ? parseInt(installments, 10) : undefined,
        purpose: purpose.trim() || undefined,
        beneficiaryContext: beneficiary ? `Beneficiary address: ${beneficiary}` : undefined,
        firstReleaseDelaySeconds: firstReleaseDelaySeconds ? parseInt(firstReleaseDelaySeconds, 10) : 0,
        customIntervalSeconds: frequency === "custom" && customIntervalSeconds ? parseInt(customIntervalSeconds, 10) : undefined,
      }

      const res = await fetch("/api/ai/drip-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to generate AI plan`)
      }

      const data = (await res.json()) as DripPlanResponse
      setRecommendedPlan(data)
      setInstallments(data.installmentCount.toString())
      setFrequency(data.frequency)
      if (data.frequency === "custom") {
        setCustomIntervalSeconds(data.intervalSeconds.toString())
      }

      if (data.recommendationSource === "openrouter_ai") {
        toast.success("AI schedule recommendation generated!")
      } else {
        toast.info("Deterministic fallback schedule generated.")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error contacting AI engine"
      toast.error(msg)
    } finally {
      setAiLoading(false)
    }
  }

  const handleValidateAndReview = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !address) {
      toast.error("Please connect your wallet first.")
      return
    }

    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      toast.error("Wrong network! Please switch your wallet to Base Sepolia (84532).")
      return
    }

    const amountNum = parseFloat(totalAmountUsdc)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid positive total amount.")
      return
    }

    if (!isAddress(beneficiary)) {
      toast.error("Beneficiary must be a valid EVM address.")
      return
    }

    if (!isAddress(guardian)) {
      toast.error("Guardian must be a valid EVM address.")
      return
    }

    if (beneficiary.toLowerCase() === guardian.toLowerCase()) {
      toast.error("Beneficiary and Guardian must be distinct addresses.")
      return
    }

    const instCount = parseInt(installments, 10)
    if (isNaN(instCount) || instCount <= 0 || instCount > 100) {
      toast.error("Installment count must be between 1 and 100.")
      return
    }

    if (frequency === "custom") {
      const intervalSec = parseInt(customIntervalSeconds, 10)
      if (isNaN(intervalSec) || intervalSec < 30) {
        toast.error("Custom interval must be at least 30 seconds.")
        return
      }
    }

    // Check balance
    const totalBaseUnits = parseUnits(amountNum.toFixed(6), 6)
    if (usdcBalance < totalBaseUnits) {
      toast.error(`Insufficient mUSDC balance. You have ${formatUsdc(usdcBalance)} mUSDC.`)
      return
    }

    setStep("confirm")
  }

  const handleExecuteCreation = async () => {
    const amountNum = parseFloat(totalAmountUsdc)
    const instCount = parseInt(installments, 10)
    const totalBaseUnits = parseUnits(amountNum.toFixed(6), 6)
    const installmentBaseUnits = totalBaseUnits / BigInt(instCount)

    let intervalSec = 604800n // weekly default
    if (frequency === "daily") intervalSec = 86400n
    else if (frequency === "weekly") intervalSec = 604800n
    else if (frequency === "monthly") intervalSec = 2592000n
    else if (frequency === "custom") intervalSec = BigInt(parseInt(customIntervalSeconds, 10))

    const delaySec = BigInt(parseInt(firstReleaseDelaySeconds || "0", 10))
    // If delay is 0, on-chain contract automatically sets first release at block.timestamp + intervalSeconds.
    // If delay > 0, we supply target timestamp (now + delay).
    const firstReleaseAt = delaySec > 0n ? BigInt(Math.floor(Date.now() / 1000)) + delaySec : 0n

    try {
      const result = await createDripVault({
        totalAmount: totalBaseUnits,
        installmentAmount: installmentBaseUnits,
        intervalSeconds: intervalSec,
        firstReleaseAt,
        beneficiary: beneficiary as `0x${string}`,
        guardian: guardian as `0x${string}`,
      })

      if (result.status === "ON_CHAIN_SUCCESS_DATABASE_SYNCED") {
        toast.success("Drip Vault successfully created and verified on Base Sepolia!")
        setOpen(false)
        setStep("form")
        onSuccess?.()
      } else {
        // Partial success: on-chain passed, DB sync failed
        setOpen(false)
        setSyncRecoveryOpen(true)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button className="rounded-full gap-2 shadow-sm">
              <PlusIcon className="size-4" />
              Create Drip Vault
            </Button>
          }
        />

        <DialogContent
          className="sm:max-w-4xl w-full max-h-[90vh] flex flex-col p-6 sm:p-8 rounded-3xl overflow-hidden gap-0"
          style={{ maxWidth: "860px", width: "95vw" }}
        >
          <DialogHeader className="space-y-1 pb-4 shrink-0 border-b border-border/40">
            <div className="flex items-center gap-2">
              <TimerIcon className="size-5 text-primary" />
              <DialogTitle className="font-display text-xl">
                Create Freelancer Drip Vault
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Lock funds into an automated timelock vault on Base Sepolia with scheduled releases and guardian protection.
            </DialogDescription>
          </DialogHeader>

          {step === "form" ? (
            <form onSubmit={handleValidateAndReview} className="flex flex-col flex-1 min-h-0 overflow-hidden pt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {/* Token Identification Notice */}
                <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CoinsIcon className="size-4 text-primary" />
                    <div>
                      <span className="font-semibold text-foreground">Token: </span>
                      <span className="font-mono text-primary font-bold">mUSDC (MockUSDC on Base Sepolia)</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-muted-foreground">
                    Balance: <span className="font-semibold text-foreground">{formatUsdc(usdcBalance)}</span> mUSDC
                  </div>
                </div>

                {/* Amount and Frequency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="totalAmount" className="text-xs font-medium">
                      Total Amount (mUSDC)
                    </Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="500"
                      value={totalAmountUsdc}
                      onChange={(e) => setTotalAmountUsdc(e.target.value)}
                      required
                      className="font-mono text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="frequency" className="text-xs font-medium">
                      Release Frequency
                    </Label>
                    <select
                      id="frequency"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as SupportedFrequency)}
                      className="flex h-9 w-full rounded-xl border border-input bg-background text-foreground px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="weekly" className="bg-popover text-popover-foreground">Weekly (Every 7 days)</option>
                      <option value="daily" className="bg-popover text-popover-foreground">Daily (Every 24 hours)</option>
                      <option value="monthly" className="bg-popover text-popover-foreground">Monthly (30 fixed days)</option>
                      <option value="custom" className="bg-popover text-popover-foreground">Custom (Min. 30 seconds)</option>
                    </select>
                  </div>
                </div>

                {/* Installments and Custom Interval */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="installments" className="text-xs font-medium">
                      Number of Installments
                    </Label>
                    <Input
                      id="installments"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="4"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      required
                      className="font-mono text-sm rounded-xl"
                    />
                  </div>

                  {frequency === "custom" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="customInterval" className="text-xs font-medium">
                        Custom Interval (Seconds, min. 30)
                      </Label>
                      <Input
                        id="customInterval"
                        type="number"
                        min="30"
                        placeholder="60"
                        value={customIntervalSeconds}
                        onChange={(e) => setCustomIntervalSeconds(e.target.value)}
                        required
                        className="font-mono text-sm rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="firstReleaseDelay" className="text-xs font-medium">
                        First Release Delay (Seconds)
                      </Label>
                      <Input
                        id="firstReleaseDelay"
                        type="number"
                        min="0"
                        placeholder="0 (Immediate interval)"
                        value={firstReleaseDelaySeconds}
                        onChange={(e) => setFirstReleaseDelaySeconds(e.target.value)}
                        className="font-mono text-sm rounded-xl"
                      />
                    </div>
                  )}
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="beneficiary" className="text-xs font-medium">
                        Beneficiary Wallet Address
                      </Label>
                      {address && (
                        <button
                          type="button"
                          onClick={() => setBeneficiary(address)}
                          className="text-[11px] text-primary hover:underline"
                        >
                          Use my address
                        </button>
                      )}
                    </div>
                    <Input
                      id="beneficiary"
                      placeholder="0x..."
                      value={beneficiary}
                      onChange={(e) => setBeneficiary(e.target.value)}
                      required
                      className="font-mono text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="guardian" className="text-xs font-medium">
                        Guardian Wallet Address
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Distinct emergency co-signer
                      </span>
                    </div>
                    <Input
                      id="guardian"
                      placeholder="0x..."
                      value={guardian}
                      onChange={(e) => setGuardian(e.target.value)}
                      required
                      className="font-mono text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="purpose" className="text-xs font-medium">
                    Purpose / Milestone Description (Optional)
                  </Label>
                  <Input
                    id="purpose"
                    placeholder="e.g. Frontend milestone delivery & sprint compensation"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                </div>

                {/* AI Assistant Callout */}
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <SparklesIcon className="size-4 text-primary" />
                      <span className="text-xs font-semibold">AI Schedule Recommendation</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRequestAiPlan}
                      disabled={aiLoading}
                      className="h-7 text-xs rounded-full gap-1.5 shrink-0"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2Icon className="size-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <BotIcon className="size-3 text-primary" />
                          AI Schedule Assist
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Let OpenRouter AI recommend an optimal release cadence based on your milestone purpose and budget. All calculations remain strictly deterministic.
                  </p>

                  {recommendedPlan && (
                    <div className="pt-2">
                      <AISchedulePreview plan={recommendedPlan} />
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/40 shrink-0 mt-4 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="rounded-full text-xs px-4"
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full text-xs px-5">
                  Review & Authorize
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* Confirmation Step */
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden pt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs">
                <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
                  <p className="font-semibold text-sm">Review Vault Specifications</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total Locked:</span>
                      <p className="font-mono font-bold text-foreground text-sm">
                        {parseFloat(totalAmountUsdc).toFixed(2)} mUSDC
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Installment Size:</span>
                      <p className="font-mono font-bold text-foreground text-sm">
                        {(parseFloat(totalAmountUsdc) / parseInt(installments, 10)).toFixed(2)} mUSDC
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequency:</span>
                      <p className="font-medium capitalize text-foreground">{frequency}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Number of Releases:</span>
                      <p className="font-mono font-bold text-foreground">{installments}</p>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-2.5 space-y-1.5">
                    <div>
                      <span className="text-muted-foreground">Beneficiary:</span>
                      <p className="font-mono text-[11px] text-foreground break-all">{beneficiary}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Guardian:</span>
                      <p className="font-mono text-[11px] text-foreground break-all">{guardian}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-[11px] text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheckIcon className="size-4 text-amber-600" />
                    <span>On-Chain Custody Notice</span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Creating this vault locks {totalAmountUsdc} mUSDC on Base Sepolia. Funds will only be unlocked according to schedule or via guardian emergency approval.
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/40 shrink-0 mt-4 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("form")}
                  disabled={isSubmitting}
                  className="rounded-full text-xs px-4"
                >
                  Back to Edit
                </Button>

                <Button
                  onClick={handleExecuteCreation}
                  disabled={isSubmitting}
                  className="rounded-full gap-2 text-xs px-5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      Executing On-Chain...
                    </>
                  ) : (
                    <>
                      <CheckCircle2Icon className="size-3.5" />
                      Sign & Create Vault
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Partial Success Sync Recovery Dialog */}
      <SyncRecoveryDialog
        open={syncRecoveryOpen}
        onOpenChange={setSyncRecoveryOpen}
        txHash={lastTxHash}
        vaultId={lastVaultId}
        isRetryingSync={isRetryingSync}
        onRetrySync={retrySync}
        onSuccess={() => onSuccess?.()}
      />
    </>
  )
}
