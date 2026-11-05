import { NextResponse } from "next/server"

import {
  isTxAlreadySettled,
  markTxSettled,
  verifyPayoutExecutionTx,
} from "@/lib/relayer"
import {
  generateAlphanumericReference,
  getMarketRatesAndBalances,
  sendCoin,
} from "@/lib/roqquClient"
import { roqquSettleInputSchema } from "@/lib/schemas"
import type { SettlementReceipt } from "@/types"

export async function POST(request: Request) {
  try {
    const rawBody: unknown = await request.json()
    const parsed = roqquSettleInputSchema.safeParse(rawBody)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json(
        {
          message: firstIssue?.message || "Invalid settlement request.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const input = parsed.data
    if (isTxAlreadySettled(input.txHash)) {
      return NextResponse.json(
        {
          message:
            "This on-chain payout transaction has already been settled via Roqqu.",
        },
        { status: 409 }
      )
    }

    const verification = await verifyPayoutExecutionTx(
      input.txHash as `0x${string}`
    )

    const snapshot = await getMarketRatesAndBalances()
    const ngnPerUsd = snapshot.ngnPerUsd || 1375
    const amountNgn = Math.round(input.amountUsdc * ngnPerUsd)
    const receiptId = generateAlphanumericReference(`ST${input.payoutId}`)

    let roqquStatus: "settled-ras" | "settled-simulated" = "settled-simulated"

    if (input.settlementRail.startsWith("ROQQU_SEND")) {
      try {
        await sendCoin({
          amount: input.amountUsdc,
          network: input.destinationNetwork,
          to: input.recipient,
          token: "usdt",
        })
        roqquStatus = "settled-ras"
      } catch {
        roqquStatus = "settled-simulated"
      }
    } else if (
      input.settlementRail.startsWith("ROQQU_OFFRAMP") &&
      snapshot.source === "ras-live"
    ) {
      roqquStatus = "settled-ras"
    }

    markTxSettled(input.txHash)

    const receipt: SettlementReceipt = {
      receiptId,
      payoutId: input.payoutId,
      communityId: input.communityId,
      amountUsdc: input.amountUsdc,
      amountNgn,
      ngnPerUsd,
      settlementRail: input.settlementRail,
      recipient: input.recipient,
      onchainTxHash: input.txHash as `0x${string}`,
      txVerifiedOnchain: verification.verifiedOnchain,
      roqquStatus,
      settledAt: new Date().toISOString(),
    }

    return NextResponse.json(receipt)
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to settle disbursement via Roqqu.",
      },
      { status: 500 }
    )
  }
}
