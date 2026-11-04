"use client"

import { ShieldAlertIcon, TimerIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DripVaultPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Freelancer Drip Vault
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automated self-payroll vaults with scheduled releases and
            guardian-protected emergency unlocks.
          </p>
        </div>
        <Badge variant="secondary">Phase 3 Module Ready</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TimerIcon className="size-4 text-primary" />
              <CardTitle>Scheduled Installments</CardTitle>
            </div>
            <CardDescription>
              Backed by <code className="font-mono">createDripVault</code> &amp;{" "}
              <code className="font-mono">releaseDue</code> (supports 60s demo
              cadence).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lock remote gig income or allowances on Base Sepolia and stream
            predictable stipends over custom intervals without premature spend
            temptation.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="size-4 text-primary" />
              <CardTitle>Guardian Emergency Co-Sign</CardTitle>
            </div>
            <CardDescription>
              Backed by <code className="font-mono">requestEarlyExit</code>{" "}
              &amp; <code className="font-mono">approveEarlyExit</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Need funds early for a genuine emergency? Request an early unlock
            and have your designated accountability partner co-sign on-chain.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

