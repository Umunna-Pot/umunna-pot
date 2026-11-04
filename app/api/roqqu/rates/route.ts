import { NextResponse } from "next/server"

import { getMarketRatesAndBalances } from "@/lib/roqquClient"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get("refresh") === "1"
    const snapshot = await getMarketRatesAndBalances({ forceRefresh })

    return NextResponse.json(snapshot, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Roqqu market rates"

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 }
    )
  }
}

