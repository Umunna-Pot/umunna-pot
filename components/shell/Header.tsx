"use client"

import * as React from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import {
  AlertCircleIcon,
  MenuIcon,
  MoonIcon,
  RefreshCwIcon,
  SunIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import { Sidebar } from "@/components/shell/Sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useRoqquRates } from "@/hooks/useRoqquRates"
import { formatNgn } from "@/lib/format"

export function Header() {
  const { data, isLoading, isError, refetch, isFetching } = useRoqquRates()
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-2.5">
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                className="lg:hidden"
                aria-label="Open navigation menu"
              />
            }
          >
            <MenuIcon className="size-4" />
          </DialogTrigger>
          <DialogContent className="max-w-xs p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Navigation Menu</DialogTitle>
              <DialogDescription>
                Navigate across Umunna Pot modules
              </DialogDescription>
            </DialogHeader>
            <Sidebar
              className="w-full border-r-0"
              onNavigate={() => setMobileOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <Skeleton className="h-8 w-44 rounded-full" />
        ) : isError || !data ? (
          <div className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive">
            <AlertCircleIcon className="size-3.5 shrink-0" />
            <span>Roqqu rate offline</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCwIcon className="size-3" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="glass-panel flex items-center gap-2 rounded-full px-3.5 py-1 text-xs">
            <TrendingUpIcon className="size-3.5 text-accent-warm" />
            <span className="font-mono font-medium tabular-nums text-foreground">
              1 USDT = {formatNgn(data.ngnPerUsd)}
            </span>
            <Badge variant="secondary" className="hidden font-mono text-[10px] sm:inline-flex">
              {data.source === "ras-live"
                ? `RAS ${data.mode}`
                : data.source === "roqqu-public"
                  ? "Roqqu Live"
                  : "Fallback"}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <Button
            variant="outline"
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

        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted: rkMounted,
          }) => {
            const ready = rkMounted && authenticationStatus !== "loading"
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus ||
                authenticationStatus === "authenticated")

            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  },
                })}
              >
                {!connected ? (
                  <Button
                    onClick={openConnectModal}
                    type="button"
                    className="rounded-full shadow-sm gap-2 text-xs h-9 px-4 font-medium"
                  >
                    <WalletIcon className="size-3.5" />
                    Connect Wallet
                  </Button>
                ) : chain.unsupported ? (
                  <Button
                    onClick={openChainModal}
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="rounded-full text-xs"
                  >
                    Wrong Network
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={openChainModal}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-1.5 text-xs font-mono px-3"
                    >
                      {chain.hasIcon && (
                        <div
                          className="size-3 rounded-full overflow-hidden shrink-0"
                          style={{ background: chain.iconBackground }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl}
                              className="size-3"
                            />
                          )}
                        </div>
                      )}
                      <span className="hidden sm:inline">{chain.name}</span>
                    </Button>

                    <Button
                      onClick={openAccountModal}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-mono px-3"
                    >
                      {account.displayName}
                    </Button>
                  </div>
                )}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  )
}
