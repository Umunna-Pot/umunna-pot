"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"
import {
  ArrowLeftIcon,
  CoinsIcon,
  LayoutDashboardIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ShieldCheckIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  collapsible?: boolean
}

export function Sidebar({
  onNavigate,
  className,
  collapsible = true,
}: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    if (collapsible && typeof window !== "undefined") {
      const saved = localStorage.getItem("umunna_sidebar_collapsed")
      if (saved === "true") {
        setIsCollapsed(true)
      }
    }
  }, [collapsible])

  const toggleCollapsed = () => {
    if (!collapsible) return
    setIsCollapsed((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("umunna_sidebar_collapsed", String(next))
      }
      return next
    })
  }

  const effectiveCollapsed = collapsible && mounted && isCollapsed

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          effectiveCollapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Header / Brand */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border px-3.5 transition-all duration-300",
            effectiveCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {effectiveCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                delay={100}
                render={
                  <Link
                    href="/"
                    onClick={onNavigate}
                    className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-xs transition-transform hover:scale-105"
                  >
                    <CoinsIcon className="size-4" />
                  </Link>
                }
              />
              <TooltipContent side="right" sideOffset={12}>
                <div className="font-semibold text-foreground">Umunna Pot</div>
                <div className="text-[10px] text-muted-foreground">Programmable Money</div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link
                href="/"
                onClick={onNavigate}
                className="flex items-center gap-2.5 outline-none"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-xs">
                  <CoinsIcon className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-sm leading-none font-bold tracking-tight">
                    Umunna Pot
                  </span>
                  <span className="mt-1 text-[11px] leading-none text-muted-foreground">
                    Programmable Money
                  </span>
                </div>
              </Link>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  RAS
                </Badge>
                {collapsible && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={toggleCollapsed}
                    className="text-muted-foreground hover:text-foreground"
                    title="Collapse sidebar"
                  >
                    <PanelLeftCloseIcon className="size-3.5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          className={cn(
            "flex-1 space-y-1.5 py-4",
            effectiveCollapsed ? "px-2" : "px-3"
          )}
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            if (effectiveCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger
                    delay={80}
                    render={
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl transition-all",
                          isActive
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </Link>
                    }
                  />
                  <TooltipContent side="right" sideOffset={12}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
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

        {/* Footer Navigation & Expand/Collapse Toggle */}
        <div
          className={cn(
            "space-y-2 border-t border-sidebar-border p-3",
            effectiveCollapsed && "flex flex-col items-center p-2"
          )}
        >
          {effectiveCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger
                  delay={80}
                  render={
                    <Link
                      href="/"
                      onClick={onNavigate}
                      className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    >
                      <ArrowLeftIcon className="size-4" />
                    </Link>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  <span className="font-medium text-foreground">
                    Back to Landing Page
                  </span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  delay={80}
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleCollapsed}
                      className="size-10 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <PanelLeftOpenIcon className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  <span className="font-medium text-foreground">
                    Expand Sidebar
                  </span>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Link
                href="/"
                onClick={onNavigate}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <ArrowLeftIcon className="size-3.5" />
                Back to Landing Page
              </Link>
              {collapsible && (
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                >
                  <span className="flex items-center gap-2">
                    <PanelLeftCloseIcon className="size-3.5" />
                    Collapse Sidebar
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
