import { NextResponse } from "next/server"

import { dbConnect } from "@/lib/db"
import Contribution from "@/models/Contribution"
import Community from "@/models/Community"

export async function GET(request: Request) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const potId = searchParams.get("potId")

    const query: Record<string, unknown> = { status: "confirmed" }
    if (potId !== null && potId !== undefined && potId !== "") {
      query.onChainPotId = Number(potId)
    }

    const contributions = await Contribution.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()

    return NextResponse.json({ contributions })
  } catch (error) {
    console.error("[API] Failed to get contributions:", error)
    return NextResponse.json({ contributions: [] }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()

    const {
      onChainPotId,
      contributorName,
      contributorEmail,
      amountNgn,
      amountUsdc,
      paymentMethod,
      paymentReference,
      txHash,
    } = body

    if (!contributorName || !amountUsdc || !paymentReference) {
      return NextResponse.json(
        { message: "Missing required fields." },
        { status: 400 }
      )
    }

    const potNum = Number(onChainPotId || 1)
    const usdcNum = Number(amountUsdc)

    // Idempotent: a retried request with the same payment reference is a success, not a duplicate record.
    const existing = await Contribution.findOne({ paymentReference }).lean()
    if (existing) {
      return NextResponse.json({ contribution: existing, duplicate: true }, { status: 200 })
    }

    const contribution = await Contribution.create({
      onChainPotId: potNum,
      contributorName,
      contributorEmail: contributorEmail || "contributor@umunna.app",
      amountNgn: Number(amountNgn || usdcNum * 1375),
      amountUsdc: usdcNum,
      paymentMethod: paymentMethod || "web3_direct",
      paymentReference,
      status: "confirmed",
      txHash: txHash || "",
    })

    await Community.findOneAndUpdate(
      { onChainPotId: potNum },
      { $inc: { currentBalanceUsdc: usdcNum } }
    )

    return NextResponse.json({ contribution }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to record contribution." },
      { status: 500 }
    )
  }
}

