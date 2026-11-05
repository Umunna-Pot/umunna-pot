"use client"

import Link from "next/link"
import {
  ArrowUpRightIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  GlobeIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const PRODUCT_PILLARS = [
  {
    title: "Direct Bank & Card Inflow",
    badge: "No Crypto Wallet Needed",
    description:
      "Relatives and group members pay via instant bank transfer links or card powered by Roqqu. Deposits automatically credit the Ethereum smart vault.",
    icon: GlobeIcon,
  },
  {
    title: "Live Real-Time Valuation",
    badge: "Dual Naira & USDC",
    description:
      "Every pot balance, proposal, and salary tranche displays in both USDC and real-time Nigerian Naira, eliminating mental FX calculations for members.",
    icon: RefreshCwIcon,
  },
  {
    title: "Instant Direct Off-Ramp",
    badge: "Automated Bank Payouts",
    description:
      "When M-of-N signers approve a disbursement, beneficiaries receive funds directly in their Nigerian bank account or preferred stablecoin wallet.",
    icon: BanknoteIcon,
  },
] as const

export function DualVaultsSection() {
  return (
    <section
      id="vaults"
      className="sheet-panel relative z-20 -mt-8 overflow-hidden rounded-t-[36px] bg-surface-ink py-20 text-surface-ink-foreground md:rounded-t-[56px] md:py-28"
    >
      <div
        aria-hidden="true"
        className="ambient-orb-primary pointer-events-none absolute top-16 -left-24 size-96 rounded-full blur-3xl opacity-70"
      />
      <div
        aria-hidden="true"
        className="ambient-orb-warm pointer-events-none absolute right-0 bottom-12 size-96 rounded-full blur-3xl opacity-50"
      />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="max-w-3xl" data-fx="rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-surface-ink-border bg-surface-ink/60 px-3 py-1 font-mono text-[11px] tracking-wider text-surface-ink-muted uppercase">
            02 &middot; Programmable Ethereum Architecture
          </span>
          <h2 className="mt-5 font-display text-3xl leading-[1.06] font-bold tracking-[-0.035em] sm:text-4xl md:text-5xl">
            Two Ethereum smart vaults.{" "}
            <span className="font-serif font-normal italic text-accent-warm">
              Frictionless payments.
            </span>{" "}
            Zero human custody.
          </h2>
        </div>

        {/* Top Bento: Two Core Vaults */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2" data-fx="stagger">
          <div className="glass-ink flex flex-col justify-between rounded-3xl p-7 md:p-8">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                  <UsersIcon className="size-5" />
                </span>
                <span className="rounded-full border border-surface-ink-border px-3 py-1 font-mono text-[11px] text-primary">
                  M-of-N Quorum
                </span>
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">
                Community Multi-Sig Pots
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-ink-muted">
                Purpose-built for diaspora town unions, alumni associations,
                church committees, and Ajo circles. Pool funds transparently on
                Ethereum while enforcing strict multi-signer approval before a
                single Naira leaves the pot.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-surface-ink-foreground/90">
                <li className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
                  <span>
                    Transparent contributor ledger mixing bank transfers &amp; crypto
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
                  <span>
                    Propose expenses in Naira or USDC with on-chain auditability
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
                  <span>
                    Automatic settlement receipt upon quorum execution
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-2">
              <Button
                className="rounded-full px-5"
                render={<Link href="/community-funds" />}
              >
                Open Community Funds
                <ArrowUpRightIcon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="glass-ink flex flex-col justify-between rounded-3xl p-7 md:p-8">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-warm/20 text-accent-warm">
                  <TimerIcon className="size-5" />
                </span>
                <span className="rounded-full border border-surface-ink-border px-3 py-1 font-mono text-[11px] text-accent-warm">
                  Time-Released + Guardian
                </span>
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">
                Freelancer Salary Drip Vault
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-ink-muted">
                Turn volatile lump-sum crypto retainers into calm, predictable
                paydays. Lock your payout into automated USDC installments while
                retaining a human-centric emergency escape hatch.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-surface-ink-foreground/90">
                <li className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 shrink-0 text-accent-warm" />
                  <span>
                    Custom release schedules (weekly, monthly, or 60s demo mode)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 shrink-0 text-accent-warm" />
                  <span>
                    Accountability Guardian co-sign prevents impulsive early withdrawals
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 shrink-0 text-accent-warm" />
                  <span>
                    Direct 1-click claim to wallet or bank account
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-2">
              <Button
                variant="secondary"
                className="rounded-full px-5"
                render={<Link href="/drip-vault" />}
              >
                Explore Drip Vault
                <ArrowUpRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bento: 3 Product Pillars */}
        <div
          className="mt-6 grid gap-4 md:grid-cols-3"
          data-fx="stagger"
        >
          {PRODUCT_PILLARS.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.title}
                className="rounded-2xl border border-surface-ink-border bg-surface-ink/55 p-5 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="font-mono text-[10px] text-surface-ink-muted">
                    {pillar.badge}
                  </span>
                </div>
                <h4 className="mt-4 font-display text-base font-semibold">
                  {pillar.title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-surface-ink-muted">
                  {pillar.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
