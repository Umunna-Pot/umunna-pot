"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CopyIcon,
  LinkIcon,
  LockIcon,
  ShieldCheckIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { EthereumLogo, RoqquLogo } from "@/components/icons/BrandLogos"
import { Button } from "@/components/ui/button"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn } from "@/lib/format"

const MARQUEE_ITEMS = [
  "Ethereum Smart Contract Custody",
  "Powered by Roqqu Payment Gateway",
  "M-of-N Cryptographic Quorum",
  "Non-Custodial · Zero Intermediary Risk",
  "Direct Bank Transfer & Card Contributions",
  "TRC-20 & Bitcoin Auto-Settlement to USDC",
  "Automated Salary Drip Vaults with Guardian Co-Sign",
] as const

export function HeroSection() {
  const { data } = useRoqquRates()
  const [previewMode, setPreviewMode] = React.useState<"pot" | "drip">("pot")
  const ngnRate = data?.ngnPerUsd ?? 1375

  const copyContractAddress = () => {
    void navigator.clipboard.writeText(
      "0x84532B09eE4dF182307E3c29994F898239A7f938"
    )
    toast.success("Verified contract address copied to clipboard")
  }

  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="ambient-orb-primary pointer-events-none absolute -top-24 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl opacity-80"
      />
      <div
        aria-hidden="true"
        className="ambient-orb-warm pointer-events-none absolute top-44 -right-24 size-[28rem] rounded-full blur-3xl opacity-60"
      />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center" data-fx="rise">
          {/* Dual Brand Trust Seal Pill */}
          <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border/80 bg-card/90 px-4 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#627EEA]/15 text-[#627EEA]">
                <EthereumLogo className="size-3" />
              </span>
              <span>Ethereum Smart Contracts</span>
            </span>
            <span className="text-muted-foreground">&times;</span>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <RoqquLogo className="size-4 rounded-full shadow-2xs" />
              <span>Powered by Roqqu</span>
            </span>
            <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
              NON-CUSTODIAL
            </span>
          </div>

          <h1 className="font-display text-4xl leading-[1.04] font-bold tracking-[-0.04em] sm:text-6xl md:text-7xl">
            Pool in Naira via Roqqu.{" "}
            <span className="font-serif font-normal italic text-primary">
              Locked
            </span>{" "}
            in Ethereum smart contracts.{" "}
            <span className="relative inline-block">
              Spend with quorum.
              <svg
                aria-hidden="true"
                viewBox="0 0 280 14"
                fill="none"
                className="mt-1 h-3 w-full text-accent-warm"
              >
                <path
                  d="M4 9.5C68 2.5 198 1.8 276 9.5"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            No vanishing WhatsApp treasurers. Contributors pay in{" "}
            <strong className="font-medium text-foreground">Naira or crypto via Roqqu</strong>;
            funds are locked inside{" "}
            <strong className="font-medium text-foreground">
              immutable Ethereum smart contracts
            </strong>{" "}
            on Base and only release when M-of-N signers authorize the payout.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-11 rounded-full px-6 text-sm font-semibold shadow-sm"
              render={<Link href="/community-funds" />}
            >
              Launch an Ethereum Pot
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 rounded-full bg-card/80 px-6 text-sm font-medium backdrop-blur-md"
              render={<Link href="/drip-vault" />}
            >
              Explore Salary Drip Vault
            </Button>
          </div>
        </div>

        {/* Clean, High-Contrast Luxury Obsidian Fintech Showcase */}
        <div
          className="relative mx-auto mt-12 max-w-4xl md:mt-16"
          data-fx="scale"
        >
          {/* Subtle Outer Neon Rim */}
          <div className="absolute -inset-0.5 rounded-[32px] bg-gradient-to-b from-primary/30 via-border/20 to-transparent blur-sm" />

          <div className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[#090E0C] p-6 text-white shadow-2xl backdrop-blur-2xl sm:p-8">
            {/* Top Bar: Clean Mode Toggle + Ethereum Smart Vault Live Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode("pot")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    previewMode === "pot"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <UsersIcon className="size-3.5" />
                  Community Multi-Sig Pot
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("drip")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    previewMode === "drip"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <TimerIcon className="size-3.5" />
                  Salary Drip Vault
                </button>
              </div>

              {/* Verified Smart Contract Badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-medium text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <LockIcon className="size-3 text-emerald-400" />
                  Ethereum Smart Vault · Non-Custodial
                </span>
                <button
                  type="button"
                  onClick={copyContractAddress}
                  className="rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  aria-label="Copy verified contract address"
                >
                  <CopyIcon className="size-3" />
                </button>
              </div>
            </div>

            {previewMode === "pot" ? (
              <div className="mt-7 grid gap-8 md:grid-cols-5 md:items-center">
                {/* Left: Main Balance & Governance Status */}
                <div className="space-y-5 md:col-span-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                        Enugu Town Union Health Pot
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                        2-of-3 Quorum
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
                      <span className="font-display text-4xl font-bold tracking-tight text-white tabular-nums sm:text-5xl">
                        {formatNgn(1250 * ngnRate)}
                      </span>
                      <span className="font-mono text-base font-semibold text-emerald-400 tabular-nums">
                        1,250.00 USDC
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium">
                        Active Proposal: St. Mary Clinic Solar Generator Deposit
                      </span>
                      <span className="font-mono font-bold text-amber-400">
                        2 / 2 Approvals Met
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full w-full rounded-full bg-emerald-400 transition-all" />
                    </div>
                  </div>

                  {/* High-Contrast Signer Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                      <CheckCircle2Icon className="mr-1.5 size-3.5 text-emerald-400" />
                      Adaobi.base approved
                    </span>
                    <span className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                      <CheckCircle2Icon className="mr-1.5 size-3.5 text-emerald-400" />
                      Dr. Okafor approved
                    </span>
                    <span className="inline-flex items-center rounded-lg border border-white/10 bg-zinc-800/80 px-2.5 py-1 text-xs font-mono text-zinc-300">
                      Disbursement: Direct Bank Settlement
                    </span>
                  </div>
                </div>

                {/* Right: Inflows Card & Primary Action */}
                <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      Recent Group Inflows
                    </span>
                    <LinkIcon className="size-3.5 text-amber-400" />
                  </div>

                  <div className="my-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5">
                      <div>
                        <p className="font-semibold text-white">Uncle Chidi</p>
                        <p className="text-[11px] text-zinc-400">
                          Direct Bank Transfer Link
                        </p>
                      </div>
                      <span className="font-mono font-bold text-amber-400 tabular-nums">
                        +{formatNgn(200 * ngnRate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5">
                      <div>
                        <p className="font-semibold text-white">Ngozi (London)</p>
                        <p className="text-[11px] text-zinc-400">
                          Stablecoin Deposit
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 tabular-nums">
                        +450.00 USDC
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/community-funds"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                  >
                    <span>Open Live Demo Pot</span>
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-7 grid gap-8 md:grid-cols-5 md:items-center">
                <div className="space-y-5 md:col-span-3">
                  <div>
                    <span className="font-mono text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                      Tunde&apos;s Remote Design Retainer Vault
                    </span>
                    <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
                      <span className="font-display text-4xl font-bold tracking-tight text-white tabular-nums sm:text-5xl">
                        {formatNgn(1800 * ngnRate)}
                      </span>
                      <span className="font-mono text-base font-semibold text-emerald-400 tabular-nums">
                        1,800.00 USDC Locked
                      </span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-300">
                    Smart contract dispenses{" "}
                    <strong className="text-white font-medium">
                      450.00 USDC ({formatNgn(450 * ngnRate)})
                    </strong>{" "}
                    per schedule. Early emergency exit requires co-signature
                    from designated Accountability Guardian{" "}
                    <span className="font-mono text-amber-400">0x71C...9A21</span>.
                  </p>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                  <span className="font-mono text-[11px] text-zinc-400 uppercase">
                    Next Automated Release
                  </span>
                  <div className="my-4">
                    <p className="font-display text-3xl font-bold text-amber-400 tabular-nums">
                      00m : 42s
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Live demo 60-second drip cadence on Ethereum L2
                    </p>
                  </div>
                  <Link
                    href="/drip-vault"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                  >
                    <span>Configure Drip Vault</span>
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Infinite Marquee Strip */}
      <div className="mt-16 overflow-hidden border-y border-border/80 bg-card/60 py-3.5 backdrop-blur-sm">
        <div className="marquee-track items-center gap-8">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="flex items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground uppercase"
            >
              <span className="size-1.5 rounded-full bg-accent-warm" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
