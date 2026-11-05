import { NextResponse } from "next/server"

import { dbConnect } from "@/lib/db"
import PayoutProposal from "@/models/PayoutProposal"

export async function GET(request: Request) {
  try {
    await dbConnect()

    // Clean up any legacy dummy proposal #0
    await PayoutProposal.deleteMany({
      $or: [{ onChainProposalId: 0 }, { onChainPotId: 0 }],
    })

    const { searchParams } = new URL(request.url)
    const potId = searchParams.get("potId")

    const query: Record<string, unknown> = {}
    if (potId !== null && potId !== undefined && potId !== "") {
      query.onChainPotId = Number(potId)
    }

    const proposals = await PayoutProposal.find(query)
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ proposals })
  } catch (error) {
    console.error("[API] Failed to get payout proposals:", error)
    return NextResponse.json({ proposals: [] }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()

    const {
      onChainPotId,
      title,
      description,
      recipientType,
      recipientBank,
      recipientAccountNumber,
      recipientAccountName,
      recipientAddress,
      amountNgn,
      amountUsdc,
      proposerAddress,
    } = body

    if (!title || (!amountNgn && !amountUsdc)) {
      return NextResponse.json(
        { message: "Title and amount are required." },
        { status: 400 }
      )
    }

    const count = await PayoutProposal.countDocuments({
      onChainPotId: Number(onChainPotId || 1),
    })

    const proposal = await PayoutProposal.create({
      onChainPotId: Number(onChainPotId || 1),
      onChainProposalId: count + 1,
      title,
      description: description || "",
      recipientType: recipientType || "bank_account",
      recipientBank: recipientBank || "",
      recipientAccountNumber: recipientAccountNumber || "",
      recipientAccountName: recipientAccountName || "",
      recipientAddress: (recipientAddress || "").toLowerCase().trim(),
      amountNgn: Number(amountNgn || amountUsdc * 1375),
      amountUsdc: Number(amountUsdc || amountNgn / 1375),
      approvals: proposerAddress ? [proposerAddress.toLowerCase().trim()] : [],
      status: "proposed",
    })

    return NextResponse.json({ proposal }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create proposal." },
      { status: 500 }
    )
  }
}

