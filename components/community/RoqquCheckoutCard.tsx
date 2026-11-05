"use client"

import {
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatNgn } from "@/lib/format"
import type { RoqquCheckoutResult } from "@/types"

interface RoqquCheckoutCardProps {
  checkout: RoqquCheckoutResult
  simulatingWebhook: boolean
  onSimulateWebhook: () => void
}

export function RoqquCheckoutCard({
  checkout,
  simulatingWebhook,
  onSimulateWebhook,
}: RoqquCheckoutCardProps) {
  const copyText = (value: string, label: string) => {
    void navigator.clipboard.writeText(value)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="font-mono text-[10px]">
          Ref: {checkout.paymentReference}
        </Badge>
        <Badge className="bg-primary/15 text-primary">
          +{checkout.estimatedUsdc.toFixed(2)} USDC
        </Badge>
      </div>

      {checkout.checkoutUrl ? (
        <div className="space-y-2">
          <p className="text-xs font-medium">
            Share Roqqu NGN Payment Link ({formatNgn(checkout.amountNgn)}):
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={checkout.checkoutUrl}
              className="bg-card font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => copyText(checkout.checkoutUrl!, "Payment link")}
              aria-label="Copy payment link"
            >
              <CopyIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              render={
                <a
                  href={checkout.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open payment link"
                />
              }
            >
              <ExternalLinkIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium">
            Deposit Address ({checkout.depositNetwork?.toUpperCase()}):
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={checkout.depositAddress ?? ""}
              className="bg-card font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() =>
                copyText(checkout.depositAddress ?? "", "Deposit address")
              }
              aria-label="Copy deposit address"
            >
              <CopyIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <SparklesIcon className="size-3.5 text-accent-warm" />
          <span>Instant Demo Webhook Relay</span>
        </div>
        <p className="mt-1">
          Trigger the Roqqu webhook pipeline now to verify AES/demo payload
          handling, auto-convert to USDT, and credit the pot with{" "}
          <code className="font-mono">{checkout.contributorName}</code>.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onSimulateWebhook}
          disabled={simulatingWebhook}
          className="mt-3 w-full rounded-full"
        >
          {simulatingWebhook ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2Icon className="size-3.5" />
          )}
          Simulate Webhook Confirmation (Demo)
        </Button>
      </div>
    </div>
  )
}

