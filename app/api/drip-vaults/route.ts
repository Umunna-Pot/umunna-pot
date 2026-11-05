import { NextResponse } from "next/server"

import { dbConnect } from "@/lib/db"
import DripVault from "@/models/DripVault"

const SEED_VAULTS = [
  {
    onChainVaultId: 0,
    freelancerAddress: "0x21342ab22b3d68464677ced76f811b3ae140192b",
    beneficiaryAddress: "0x21342ab22b3d68464677ced76f811b3ae140192b",
    guardianAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    totalLockedUsdc: 2000,
    installmentAmountUsdc: 500,
    intervalSeconds: 60, // 60s for live demonstration
    claimedUsdc: 500,
    remainingUsdc: 1500,
    nextReleaseAt: new Date(Date.now() + 60000),
    status: "streaming",
  },
]

export async function GET(request: Request) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")?.toLowerCase()

    const query: Record<string, unknown> = {}
    if (address) {
      query.$or = [
        { freelancerAddress: address },
        { beneficiaryAddress: address },
        { guardianAddress: address },
      ]
    }

    let vaults = await DripVault.find(query).sort({ createdAt: -1 }).lean()

    if (vaults.length === 0) {
      await DripVault.insertMany(SEED_VAULTS)
      vaults = await DripVault.find(query).sort({ createdAt: -1 }).lean()
    }

    return NextResponse.json({ vaults })
  } catch (error) {
    console.error("[API] Failed to get drip vaults:", error)
    return NextResponse.json({ vaults: SEED_VAULTS }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()

    const {
      freelancerAddress,
      beneficiaryAddress,
      guardianAddress,
      totalLockedUsdc,
      installmentAmountUsdc,
      intervalSeconds,
    } = body

    if (!freelancerAddress || !guardianAddress || !totalLockedUsdc || !installmentAmountUsdc) {
      return NextResponse.json(
        { message: "Missing required fields for Drip Vault." },
        { status: 400 }
      )
    }

    const count = await DripVault.countDocuments()

    const vault = await DripVault.create({
      onChainVaultId: count,
      freelancerAddress: freelancerAddress.toLowerCase().trim(),
      beneficiaryAddress: (beneficiaryAddress || freelancerAddress).toLowerCase().trim(),
      guardianAddress: guardianAddress.toLowerCase().trim(),
      totalLockedUsdc: Number(totalLockedUsdc),
      installmentAmountUsdc: Number(installmentAmountUsdc),
      intervalSeconds: Number(intervalSeconds || 604800),
      claimedUsdc: 0,
      remainingUsdc: Number(totalLockedUsdc),
      nextReleaseAt: new Date(Date.now() + Number(intervalSeconds || 604800) * 1000),
      status: "streaming",
    })

    return NextResponse.json({ vault }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create vault." },
      { status: 500 }
    )
  }
}

