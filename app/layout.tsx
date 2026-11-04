import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { Web3Provider } from "@/components/providers/Web3Provider"
import { AppShell } from "@/components/shell/AppShell"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Umunna Pot | Programmable Group Treasury & Drip Vault",
  description:
    "Community finance platform for pooled funds, multi-sig disbursements, and scheduled salary drip vaults powered by Roqqu API Services (RAS) and Base.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          <Web3Provider>
            <AppShell>{children}</AppShell>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
