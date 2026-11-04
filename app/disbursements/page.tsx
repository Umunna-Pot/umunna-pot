"use client"

import { CheckCircle2Icon, ShieldCheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DisbursementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Governed Disbursements
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transparent M-of-N quorum voting and hybrid settlement across Base
            Sepolia and Roqqu payout rails.
          </p>
        </div>
        <Badge variant="secondary">Phase 2 Module Ready</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-primary" />
              <CardTitle>Quorum Enforcement</CardTitle>
            </div>
            <CardDescription>
              Backed by <code className="font-mono">proposePayout</code>,{" "}
              <code className="font-mono">approvePayout</code>, and{" "}
              <code className="font-mono">executePayout</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No single treasurer can move community funds unilaterally. Proposals
            require the exact M-of-N signer threshold before funds unlock.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="size-4 text-primary" />
              <CardTitle>Roqqu Settlement Rail</CardTitle>
            </div>
            <CardDescription>
              Supports <code className="font-mono">ONCHAIN</code> and{" "}
              <code className="font-mono">ROQQU_OFFRAMP</code> payout tags.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Once quorum executes on-chain, hospital, vendor, or family
            beneficiaries can receive instant settlement through Roqqu wallet
            sends and NGN off-ramps.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

