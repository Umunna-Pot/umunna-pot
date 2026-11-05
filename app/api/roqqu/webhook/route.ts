import { NextResponse } from "next/server"

import { dbConnect } from "@/lib/db"
import Contribution from "@/models/Contribution"
import Community from "@/models/Community"
import { creditPotFromRoqqu } from "@/lib/relayer"
import {
  decryptWebhookPayload,
  getMarketRatesAndBalances,
  sellTokenToUsdt,
} from "@/lib/roqquClient"
import {
  roqquDemoWebhookSchema,
  roqquEncryptedWebhookSchema,
} from "@/lib/schemas"
import type { RoqquWebhookResult } from "@/types"

const NON_USDT_SWAP_TOKENS = new Set([
  "btc",
  "eth",
  "trx",
  "sol",
  "bnb",
  "xrp",
])

export async function POST(request: Request) {
  try {
    const rawBody: unknown = await request.json()
    const snapshot = await getMarketRatesAndBalances()
    const ngnPerUsd = snapshot.ngnPerUsd || 1375

    let paymentReference = ""
    let communityId = 0
    let amountNgn = 0
    let contributorName = "Roqqu Contributor"
    let depositedToken = "ngn"
    let depositedTokenAmount = 0

    const demoParsed = roqquDemoWebhookSchema.safeParse(rawBody)
    if (demoParsed.success) {
      paymentReference = demoParsed.data.paymentReference
      communityId = demoParsed.data.communityId
      amountNgn = demoParsed.data.amountNgn
      contributorName = demoParsed.data.contributorName
      depositedToken = demoParsed.data.depositedToken.toLowerCase()
      depositedTokenAmount = demoParsed.data.depositedTokenAmount
    } else {
      const ivHeader =
        request.headers.get("iv-hex") || request.headers.get("x-roqqu-iv") || ""
      const encryptedParsed = roqquEncryptedWebhookSchema.safeParse(rawBody)

      if (!encryptedParsed.success || !ivHeader) {
        return NextResponse.json(
          {
            message:
              "Invalid webhook payload. Provide an encrypted Roqqu payload with iv-hex header or a valid demoSimulate request.",
          },
          { status: 400 }
        )
      }

      const decrypted = decryptWebhookPayload({
        encryptedHashHex: encryptedParsed.data.hash,
        ivHexHeader: ivHeader,
      })

      paymentReference = String(
        decrypted.payment_reference ?? decrypted.reference ?? "UPWEBHOOK"
      )
      amountNgn = Number(decrypted.amount ?? 0)
      depositedToken = String(
        decrypted.currency ?? decrypted.token ?? "ngn"
      ).toLowerCase()
      depositedTokenAmount = Number(decrypted.token_amount ?? 0)

      const rawMeta = decrypted.metadata
      const meta =
        typeof rawMeta === "string"
          ? (JSON.parse(rawMeta) as Record<string, unknown>)
          : typeof rawMeta === "object" && rawMeta !== null
            ? (rawMeta as Record<string, unknown>)
            : {}

      communityId = Number(meta.communityId ?? 0)
      if (typeof meta.contributorName === "string" && meta.contributorName) {
        contributorName = meta.contributorName
      }
    }

    // DB-backed idempotency: survives server restarts, unlike the relayer's in-memory map.
    // If this payment reference was already confirmed on-chain, never touch the chain again.
    await dbConnect()
    const alreadyCredited = await Contribution.findOne({
      paymentReference,
      status: "confirmed",
      txHash: { $exists: true, $ne: "" },
    }).lean()
    if (alreadyCredited) {
      const dupPayload: RoqquWebhookResult = {
        status: "duplicate",
        paymentReference,
        communityId: alreadyCredited.onChainPotId,
        usdcCredited: alreadyCredited.amountUsdc,
        contributorTag: `${alreadyCredited.contributorName} via Roqqu [${paymentReference}]`,
        relayerTxHash: alreadyCredited.txHash as `0x${string}`,
        relayerMode: "onchain",
      }
      return NextResponse.json(dupPayload)
    }

    let autoConvertedToken: string | undefined
    if (NON_USDT_SWAP_TOKENS.has(depositedToken) && depositedTokenAmount > 0) {
      try {
        await sellTokenToUsdt({
          amount: depositedTokenAmount,
          token: depositedToken,
        })
        autoConvertedToken = depositedToken.toUpperCase()
      } catch {
        autoConvertedToken = `${depositedToken.toUpperCase()} (quoted)`
      }
    }

    // Exact 6-decimal USDC precision (matches on-chain units): no sub-cent truncation, no over-credit
    const creditedUsdc = Math.round((amountNgn / ngnPerUsd) * 1e6) / 1e6

    // Server Relayer broadcasts live on Base Sepolia
    const relayerResult = await creditPotFromRoqqu({
      communityId,
      amountUsdc: creditedUsdc,
      contributorTag: `${contributorName} via Roqqu [${paymentReference}]`,
      paymentReference,
    })

    // Update MongoDB persistence
    try {
      await Contribution.findOneAndUpdate(
        { paymentReference },
        {
          status: "confirmed",
          txHash: relayerResult.txHash,
          amountNgn,
          amountUsdc: creditedUsdc,
          contributorName,
          onChainPotId: communityId,
        },
        { upsert: true, new: true }
      )

      if (!relayerResult.duplicate) {
        await Community.findOneAndUpdate(
          { onChainPotId: communityId },
          {
            $inc: { currentBalanceUsdc: creditedUsdc },
          }
        )
      }
    } catch (err) {
      console.warn("[MongoDB] Webhook update warning:", err)
    }

    const payload: RoqquWebhookResult = {
      status: relayerResult.duplicate ? "duplicate" : "credited",
      paymentReference,
      communityId,
      usdcCredited: creditedUsdc,
      contributorTag: `${contributorName} via Roqqu [${paymentReference}]`,
      relayerTxHash: relayerResult.txHash,
      relayerMode: relayerResult.mode,
      autoConvertedToken,
    }

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 }
    )
  }
}
