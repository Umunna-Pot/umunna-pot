"use client"

import * as React from "react"

import { DualVaultsSection } from "@/components/landing/DualVaultsSection"
import { HeroSection } from "@/components/landing/HeroSection"
import { HowItWorksSection } from "@/components/landing/HowItWorksSection"
import { LandingCtaFooter } from "@/components/landing/LandingCtaFooter"
import { LandingNavbar } from "@/components/landing/LandingNavbar"
import { ProblemSection } from "@/components/landing/ProblemSection"
import { useScrollReveal } from "@/hooks/useScrollReveal"

export default function HomePage() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  useScrollReveal(containerRef)

  return (
    <div ref={containerRef} className="relative min-h-screen bg-background">
      <LandingNavbar />

      <main>
        <HeroSection />
        <ProblemSection />
        <DualVaultsSection />
        <HowItWorksSection />
      </main>

      <LandingCtaFooter />
    </div>
  )
}
