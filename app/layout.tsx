import type { Metadata } from "next"
import {
  Bricolage_Grotesque,
  Geist_Mono,
  Instrument_Serif,
  Plus_Jakarta_Sans,
} from "next/font/google"

import "./globals.css"
import { Web3Provider } from "@/components/providers/Web3Provider"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
})

const fontSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Umunna Pot | Programmable Group Treasury & Salary Drip Vault",
  description:
    "Pool community funds with M-of-N quorum, accept bank transfers & crypto powered by Roqqu, and lock funds securely in Ethereum smart contracts on Base.",
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
        fontSans.variable,
        fontDisplay.variable,
        fontSerif.variable,
        fontMono.variable,
        "font-sans"
      )}
    >
      <body>
        <ThemeProvider>
          <Web3Provider>{children}</Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
