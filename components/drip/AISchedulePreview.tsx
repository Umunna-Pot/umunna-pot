"use client"

import * as React from "react"
import { BotIcon, CheckCircle2Icon, AlertCircleIcon, SparklesIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { type DripPlanResponse } from "@/lib/aiSchemas"

interface AISchedulePreviewProps {
  plan: DripPlanResponse
}

export function AISchedulePreview({ plan }: AISchedulePreviewProps) {
  const isAi = plan.recommendationSource === "openrouter_ai"

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/40 p-4">
      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isAi ? (
            <Badge className="bg-primary/15 text-primary border-primary/30 flex items-center gap-1.5 font-mono text-xs">
              <SparklesIcon className="size-3 text-primary animate-pulse" />
              AI Recommended Schedule
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-mono text-xs">
              <BotIcon className="size-3 text-amber-600" />
              Deterministic Manual Fallback
            </Badge>
          )}

          {isAi && plan.modelUsed && (
            <span className="font-mono text-[11px] text-muted-foreground">
              Model: {plan.modelUsed}
            </span>
          )}
        </div>

        <span className="font-mono text-xs text-muted-foreground">
          {plan.installmentCount} Releases &middot; {plan.frequency}
        </span>
      </div>

      {/* Fallback Notice if active */}
      {!isAi && plan.fallbackReason && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircleIcon className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p>
            <span className="font-semibold">Deterministic Fallback:</span> {plan.fallbackReason}
          </p>
        </div>
      )}

      {/* Reasoning */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">Schedule Rationale</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {plan.reasoning}
        </p>
      </div>

      {/* Schedule Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-background/50">
        <div className="grid grid-cols-3 border-b border-border/60 bg-muted/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
          <span>Tranche</span>
          <span className="text-center">Interval Offset</span>
          <span className="text-right">Amount (mUSDC)</span>
        </div>
        <div className="max-h-48 divide-y divide-border/40 overflow-y-auto">
          {plan.schedule.map((item) => {
            const daysOffset = Math.round(item.scheduledOffsetSeconds / 86400)
            return (
              <div
                key={item.releaseIndex}
                className="grid grid-cols-3 items-center px-3 py-2 text-xs font-mono"
              >
                <span className="flex items-center gap-1.5 font-sans font-medium">
                  <CheckCircle2Icon className="size-3.5 text-primary" />
                  Release #{item.releaseIndex}
                </span>
                <span className="text-center text-muted-foreground">
                  +{daysOffset > 0 ? `${daysOffset}d` : `${item.scheduledOffsetSeconds}s`}
                </span>
                <span className="text-right font-semibold text-foreground">
                  {item.amountUsdc.toFixed(2)} mUSDC
                  {item.isRemainder && (
                    <span className="ml-1 text-[10px] text-muted-foreground">(rem)</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notices */}
      <div className="space-y-1 text-[11px] text-muted-foreground">
        <p className="italic">{plan.contractNotice}</p>
        <p className="font-sans text-xs text-foreground/80">{plan.userReviewNotice}</p>
      </div>
    </div>
  )
}
