import { NextRequest, NextResponse } from "next/server"
import { dripPlanRequestSchema } from "@/lib/aiSchemas"
import { generateAiDripPlan } from "@/lib/dripAiEngine"

export const dynamic = "force-dynamic"

/**
 * POST /api/ai/drip-plan
 *
 * Recommends an AI-assisted or deterministic schedule for Drip Vault creation.
 * Purely advisory: Never touches wallets, private keys, or smart contract functions.
 * All financial values are strictly calculated in BigInt base units.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body provided." },
        { status: 400 }
      )
    }

    const validation = dripPlanRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Request validation failed.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const plan = await generateAiDripPlan(validation.data)

    return NextResponse.json(plan, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: "Failed to generate drip plan.", details: message },
      { status: 500 }
    )
  }
}
