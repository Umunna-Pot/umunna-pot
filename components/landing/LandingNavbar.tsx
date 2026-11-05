"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRightIcon,
  CoinsIcon,
  MoonIcon,
  SunIcon,
  TrendingUpIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import { EthereumLogo, RoqquLogo } from "@/components/icons/BrandLogos"
import { Button } from "@/components/ui/button"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn } from "@/lib/format"

const NAV_LINKS = [
  { label: "Why Umunna", href: "#why-umunna" },
  { label: "Vaults", href: "#vaults" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Calculator", href: "#estimator" },
] as const

export function LandingNavbar() {
  const { data } = useRoqquRates()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4 md:top-5 md:px-6">
      <div className="glass-panel mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full px-3.5 md:px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 outline-none"
          aria-label="Umunna Pot Home"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
            <CoinsIcon className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tracking-tight">
              Umunna Pot
            </span>
          </div>
        </Link>

        {/* Dual Brand Trust Badges in Navbar */}
        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-mono text-[11px] text-muted-foreground md:flex">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <EthereumLogo className="size-3 text-[#627EEA]" />
            Ethereum
          </span>
          <span>&times;</span>
          <span className="flex items-center gap-1 font-medium text-foreground">
            <RoqquLogo className="size-3.5 rounded-full" />
            Roqqu
          </span>
        </div>

        <nav
          className="hidden items-center gap-6 text-xs font-medium text-muted-foreground lg:flex"
          aria-label="Landing sections"
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-border/80 bg-card/70 px-3 py-1 font-mono text-[11px] sm:flex">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <TrendingUpIcon className="size-3 text-accent-warm" />
            <span className="tabular-nums text-foreground">
              1 USDT = {data ? formatNgn(data.ngnPerUsd) : "₦1,375"}
            </span>
          </div>

          {mounted && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              aria-label="Toggle color theme"
            >
              {resolvedTheme === "dark" ? (
                <SunIcon className="size-4" />
              ) : (
                <MoonIcon className="size-4" />
              )}
            </Button>
          )}

          <Button
            size="sm"
            className="rounded-full px-4 font-medium"
            render={<Link href="/dashboard" />}
          >
            Launch App
            <ArrowUpRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
