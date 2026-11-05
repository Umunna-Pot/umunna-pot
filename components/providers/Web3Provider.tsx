"use client"

import "@rainbow-me/rainbowkit/styles.css"

import * as React from "react"
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import { WagmiProvider } from "wagmi"
import { baseSepolia } from "wagmi/chains"

import { Toaster } from "@/components/ui/sonner"
import { wagmiConfig } from "@/lib/wagmi"

function ThemedRainbowKit({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const rkTheme =
    mounted && resolvedTheme === "dark"
      ? darkTheme({
          accentColor: "#10b981",
          accentColorForeground: "#06281e",
          borderRadius: "large",
          overlayBlur: "small",
        })
      : lightTheme({
          accentColor: "#059669",
          accentColorForeground: "#ffffff",
          borderRadius: "large",
          overlayBlur: "small",
        })

  return (
    <RainbowKitProvider initialChain={baseSepolia} theme={rkTheme}>
      {children}
    </RainbowKitProvider>
  )
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      })
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemedRainbowKit>
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemedRainbowKit>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

