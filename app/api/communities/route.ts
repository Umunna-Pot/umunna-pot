import { NextResponse } from "next/server"

import { dbConnect } from "@/lib/db"
import { UMUNNA_POT_ABI, UMUNNA_POT_ADDRESS, isContractConfigured } from "@/lib/contracts"
import { getPublicBaseClient } from "@/lib/relayer"
import Community from "@/models/Community"
import Contribution from "@/models/Contribution"

/**
 * Reads the authoritative vault balance (USDC) from the Base Sepolia contract.
 * Returns null if the chain is unreachable or the pot does not exist on-chain.
 */
async function readOnChainBalanceUsdc(onChainPotId: number): Promise<number | null> {
  if (!isContractConfigured()) return null
  try {
    const result = await getPublicBaseClient().readContract({
      address: UMUNNA_POT_ADDRESS,
      abi: UMUNNA_POT_ABI,
      functionName: "getCommunity",
      args: [BigInt(onChainPotId)],
    })
    return Number(result[3]) / 1e6
  } catch {
    return null
  }
}

// GET is strictly read-only: it never writes to MongoDB or to the blockchain.
export async function GET() {
  try {
    await dbConnect()

    const communities = await Community.find({ status: "active" }).sort({ onChainPotId: 1 }).lean()

    const enriched = await Promise.race([
      Promise.all(
        communities.map(async (comm) => {
          const contribs = await Contribution.find({
            onChainPotId: comm.onChainPotId,
            status: "confirmed",
          }).lean()

          // On-chain balance is the single source of truth (reflects contributions AND payouts).
          // Falls back to the DB contribution sum only if the RPC is unreachable.
          const onChainUsdc = await readOnChainBalanceUsdc(comm.onChainPotId)
          const dbUsdc = contribs.reduce((acc, curr) => acc + (curr.amountUsdc || 0), 0)

          return {
            ...comm,
            currentBalanceUsdc: onChainUsdc ?? dbUsdc,
            contributorCount: contribs.length,
          }
        })
      ),
      new Promise((resolve) => setTimeout(() => resolve(communities), 5000)),
    ])

    return NextResponse.json({ communities: enriched })
  } catch (error) {
    console.error("[API] Failed to get communities:", error)
    return NextResponse.json({ communities: [] }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()

    const {
      onChainPotId: requestedPotId,
      name,
      description,
      targetAmountNgn,
      targetAmountUsdc,
      quorumThreshold,
      signers,
      creatorAddress,
      category,
    } = body

    if (!name || !targetAmountNgn || !quorumThreshold || !signers || signers.length === 0) {
      return NextResponse.json(
        { message: "Missing required fields: name, targetAmountNgn, quorumThreshold, signers." },
        { status: 400 }
      )
    }

    // Determine on-chain pot ID directly from the blockchain (Single Source of Truth)
    let onChainPotId = Number(requestedPotId)
    if (!onChainPotId || onChainPotId <= 0) {
      try {
        const publicClient = getPublicBaseClient()
        const count = await publicClient.readContract({
          address: UMUNNA_POT_ADDRESS,
          abi: UMUNNA_POT_ABI,
          functionName: "communityCount",
        })
        onChainPotId = Number(count)
      } catch {
        const count = await Community.countDocuments()
        onChainPotId = count + 1
      }
    }

    // Idempotent: a retried request for the same on-chain pot returns the existing record.
    const existingPot = await Community.findOne({ onChainPotId }).lean()
    if (existingPot) {
      if (existingPot.name === name) {
        return NextResponse.json({ community: existingPot, duplicate: true }, { status: 200 })
      }
      return NextResponse.json(
        { message: `On-chain pot #${onChainPotId} is already linked to "${existingPot.name}".` },
        { status: 409 }
      )
    }

    const newCommunity = await Community.create({
      onChainPotId,
      name,
      description: description || "",
      targetAmountNgn: Number(targetAmountNgn),
      targetAmountUsdc: Number(targetAmountUsdc || targetAmountNgn / 1375),
      currentBalanceUsdc: 0,
      quorumThreshold: Number(quorumThreshold),
      signers: signers.map((s: string) => s.toLowerCase().trim()),
      creatorAddress: (creatorAddress || "0x21342ab22b3d68464677ced76f811b3ae140192b").toLowerCase().trim(),
      category: category || "general",
      status: "active",
    })

    return NextResponse.json({ community: newCommunity }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create pot." },
      { status: 500 }
    )
  }
}

