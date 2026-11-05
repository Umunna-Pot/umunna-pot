"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon, ArrowUpDownIcon, CalculatorIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn, formatUsd } from "@/lib/format"

const ARCHITECTURE_STEPS = [
  {
    step: "01",
    title: "Instant Inflow (Bank Link or Crypto)",
    detail:
      "Members contribute stablecoins directly or pay in Naira via a direct bank checkout link powered by Roqqu. Deposits are tagged transparently on the group ledger.",
  },
  {
    step: "02",
    title: "Enforced Ethereum Smart Contracts",
    detail:
      "Funds are locked securely inside verified Ethereum smart contracts on Base. Community Pots require cryptographic M-of-N quorum before any release.",
  },
  {
    step: "03",
    title: "Direct Bank & Vendor Payouts",
    detail:
      "Once approved, disbursements settle directly to the recipient's bank account or crypto wallet with an auditable cryptographic receipt.",
  },
] as const

export function HowItWorksSection() {
  const { data } = useRoqquRates()
  const ngnPerUsd = data?.ngnPerUsd ?? 1375

  const [ngnInput, setNgnInput] = React.useState("550000")
  const [memberCount, setMemberCount] = React.useState("5")

  const totalNgn = Math.max(Number(ngnInput.replace(/,/g, "")) || 0, 0)
  const members = Math.max(Math.min(Number(memberCount) || 1, 100), 1)
  const totalUsdc = ngnPerUsd > 0 ? totalNgn / ngnPerUsd : 0
  const perMemberNgn = totalNgn / members
  const perMemberUsdc = totalUsdc / members
  const recommendedQuorum = Math.max(Math.ceil(members * 0.6), 1)

  return (
    <section
      id="how-it-works"
      className="sheet-panel relative z-30 -mt-8 rounded-t-[36px] border-t border-border bg-background py-20 md:rounded-t-[56px] md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="max-w-2xl" data-fx="rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            03 &middot; End-to-End Flow
          </span>
          <h2 className="mt-5 font-display text-3xl leading-[1.08] font-bold tracking-[-0.035em] sm:text-4xl md:text-5xl">
            Simple as a payment link.{" "}
            <span className="font-serif font-normal italic text-primary">
              Auditable
            </span>{" "}
            on Base.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3" data-fx="stagger">
          {ARCHITECTURE_STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-3xl border border-border bg-card p-6 shadow-2xs"
            >
              <span className="font-display text-4xl font-bold tracking-tight text-primary/35">
                {item.step}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Live Interactive Pot Estimator */}
        <div
          id="estimator"
          className="glass-panel mt-14 rounded-3xl p-6 sm:p-8 md:p-10"
          data-fx="scale"
        >
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
                <CalculatorIcon className="size-3.5" />
                Live Roqqu FX Pot Estimator
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Plan your group target in Naira, lock inflation-proof USDC.
              </h3>
              <p className="text-sm text-muted-foreground">
                Powered live by Roqqu benchmark rate:{" "}
                <strong className="font-mono text-foreground">
                  1 USDT = {formatNgn(ngnPerUsd)}
                </strong>
                .
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="calc-ngn">Target Pot Goal (NGN)</Label>
                  <Input
                    id="calc-ngn"
                    type="number"
                    min={1000}
                    step={10000}
                    value={ngnInput}
                    onChange={(e) => setNgnInput(e.target.value)}
                    className="bg-card font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calc-members">Contributors / Signers</Label>
                  <Input
                    id="calc-members"
                    type="number"
                    min={1}
                    max={50}
                    value={memberCount}
                    onChange={(e) => setMemberCount(e.target.value)}
                    className="bg-card font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Vault Value Locked on Base
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold text-primary tabular-nums">
                    {formatUsd(totalUsdc)} USDC
                  </p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-warm/15 text-accent-warm">
                  <ArrowUpDownIcon className="size-4" />
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl bg-muted/60 p-3.5">
                  <p className="text-muted-foreground">Per Member Share</p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatNgn(perMemberNgn)}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    &approx; {perMemberUsdc.toFixed(2)} USDC
                  </p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3.5">
                  <p className="text-muted-foreground">Suggested Governance</p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {recommendedQuorum}-of-{members} Signers
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    60%+ consensus threshold
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button
                  className="w-full rounded-full sm:w-auto"
                  render={<Link href="/community-funds" />}
                >
                  Launch This Pot Now
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
