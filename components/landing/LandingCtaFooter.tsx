"use client"

import Link from "next/link"
import { ArrowRightIcon, ArrowUpRightIcon, CoinsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function LandingCtaFooter() {
  return (
    <div className="sheet-panel relative z-40 -mt-8 overflow-hidden rounded-t-[36px] bg-surface-ink text-surface-ink-foreground md:rounded-t-[56px]">
      <div
        aria-hidden="true"
        className="ambient-orb-primary pointer-events-none absolute -top-24 left-1/3 size-96 rounded-full blur-3xl"
      />

      <section className="relative mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-24">
        <div className="mx-auto max-w-3xl" data-fx="rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-surface-ink-border bg-surface-ink/60 px-3 py-1 font-mono text-[11px] tracking-wider text-accent-warm uppercase">
            04 &middot; Ready for Your Circle
          </span>
          <h2 className="mt-5 font-display text-3xl leading-[1.06] font-bold tracking-[-0.035em] sm:text-5xl">
            Bring{" "}
            <span className="font-serif font-normal italic text-primary">
              constitutional trust
            </span>{" "}
            to every group contribution.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-surface-ink-muted sm:text-base">
            Spin up a 2-of-3 family pot, test a direct bank payment
            link, or lock a 60-second demo salary drip vault on Base Sepolia.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-11 rounded-full px-6 text-sm font-semibold"
              render={<Link href="/community-funds" />}
            >
              Launch Community Pots
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="h-11 rounded-full px-6 text-sm font-medium"
              render={<Link href="/disbursements" />}
            >
              View Quorum Disbursements
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-surface-ink-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-surface-ink-muted sm:flex-row md:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CoinsIcon className="size-3.5" />
            </span>
            <span className="font-display text-sm font-semibold text-surface-ink-foreground">
              Umunna Pot
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-surface-ink-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/community-funds"
              className="transition-colors hover:text-surface-ink-foreground"
            >
              Community Funds
            </Link>
            <Link
              href="/disbursements"
              className="transition-colors hover:text-surface-ink-foreground"
            >
              Disbursements
            </Link>
            <Link
              href="/drip-vault"
              className="transition-colors hover:text-surface-ink-foreground"
            >
              Drip Vault
            </Link>
            <a
              href="https://roqqu-api-services.gitbook.io/ras"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              RAS Docs
              <ArrowUpRightIcon className="size-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
