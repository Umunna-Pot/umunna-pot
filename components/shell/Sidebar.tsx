"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"
import {
  ArrowUpRightIcon,
  CoinsIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"

export interface NavItem {
  label: string
  href: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    description: "Treasury & Roqqu rates",
    icon: LayoutDashboardIcon,
  },
  {
    label: "Community Funds",
    href: "/community-funds",
    description: "Multi-sig group pots",
    icon: UsersIcon,
  },
  {
    label: "Disbursements",
    href: "/disbursements",
    description: "Quorum approvals & rails",
    icon: ShieldCheckIcon,
  },
  {
    label: "Drip Vault",
    href: "/drip-vault",
    description: "Scheduled salary locks",
    icon: TimerIcon,
  },
]

interface SidebarProps {
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 outline-none"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <CoinsIcon className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm leading-none font-semibold tracking-tight">
              Umunna Pot
            </span>
            <span className="mt-1 text-[11px] leading-none text-muted-foreground">
              Programmable Money
            </span>
          </div>
        </Link>
        <Badge variant="secondary" className="text-[10px]">
          RAS
        </Badge>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-foreground"
                    : "text-muted-foreground group-hover:text-sidebar-foreground"
                )}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate leading-tight">{item.label}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {item.description}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-xl border border-border bg-card p-3 text-xs text-card-foreground">
          <div className="flex items-center justify-between font-medium">
            <span>Roqqu RAS + Base</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              #84532
            </span>
          </div>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            NGN &amp; multi-chain deposits auto-settle into governed Base
            Sepolia vaults.
          </p>
          <a
            href="https://roqqu-api-services.gitbook.io/ras"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            RAS API Docs
            <ArrowUpRightIcon className="size-3" />
          </a>
        </div>
      </div>
    </aside>
  )
}

