import { NextResponse } from "next/server"

import { dbConnect } from "@/lib/db"
import Contribution from "@/models/Contribution"
import Community from "@/models/Community"
import {
  createPaymentLink,
  generateAlphanumericReference,
  generateCustomerWallet,
  getMarketRatesAndBalances,
} from "@/lib/roqquClient"
import { roqquCheckoutInputSchema } from "@/lib/schemas"
import type { RoqquCheckoutResult } from "@/types"

const DEFAULT_NETWORK_DEPOSIT_ADDRESSES: Record<string, string> = {
  bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  btc: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  trc20: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  trx: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  bep20: "0x58c0c45582f3a228cf007f35b46e33a5f97305d2",
  bnb: "0x58c0c45582f3a228cf007f35b46e33a5f97305d2",
  base: "0x21342ab22B3D68464677CEd76f811b3AE140192b",
  solana: "7EYnhQoR9YM3N7UoaKRoA44Ka8WDHDYsFi8wq6VYNJc3",
  sol: "7EYnhQoR9YM3N7UoaKRoA44Ka8WDHDYsFi8wq6VYNJc3",
  eth: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  erc20: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
}

export async function POST(request: Request) {
  try {
    const rawBody: unknown = await request.json()
    const parsed = roqquCheckoutInputSchema.safeParse(rawBody)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json(
        {
          message: firstIssue?.message || "Invalid checkout payload.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const input = parsed.data
    const snapshot = await getMarketRatesAndBalances()
    const ngnPerUsd = snapshot.ngnPerUsd || 1375
    const estimatedUsdc = Math.round((input.amountNgn / ngnPerUsd) * 1e6) / 1e6

    await dbConnect()

    if (input.rail === "payment_link") {
      let paymentReference = ""
      let checkoutUrl = ""
      let source: "ras-live" | "demo-simulated" = "demo-simulated"

      try {
        const linkResult = await createPaymentLink({
          communityId: input.communityId,
          amountNgn: input.amountNgn,
          contributorName: input.contributorName,
          contributorEmail: input.contributorEmail,
          contributorPhone: input.contributorPhone,
        })

        paymentReference = linkResult.paymentReference
        checkoutUrl =
          linkResult.checkoutUrl ||
          `https://app.roqqu.com/pay/${linkResult.paymentReference}`
        source = linkResult.checkoutUrl ? "ras-live" : "demo-simulated"
      } catch {
        paymentReference = generateAlphanumericReference(`UP${input.communityId}`)
        checkoutUrl = `https://app.roqqu.com/pay/${paymentReference}`
        source = "demo-simulated"
      }

      // Persist in MongoDB
      try {
        const communityDoc = await Community.findOne({ onChainPotId: input.communityId })
        await Contribution.create({
          communityId: communityDoc?._id,
          onChainPotId: input.communityId,
          contributorName: input.contributorName,
          contributorEmail: input.contributorEmail,
          contributorPhone: input.contributorPhone,
          amountNgn: input.amountNgn,
          amountUsdc: estimatedUsdc,
          paymentMethod: "roqqu_fiat",
          paymentReference,
          status: "pending",
        })
      } catch (err) {
        console.warn("[MongoDB] Contribution tracking notice:", err)
      }

      const payload: RoqquCheckoutResult = {
        rail: "payment_link",
        paymentReference,
        communityId: input.communityId,
        contributorName: input.contributorName,
        amountNgn: input.amountNgn,
        estimatedUsdc,
        ngnPerUsd,
        checkoutUrl,
        source,
      }
      return NextResponse.json(payload)
    }

    // Direct Crypto Deposit rail
    const [firstName, ...rest] = input.contributorName.split(/\s+/)
    const lastName = rest.join(" ") || "Contributor"
    const paymentReference = generateAlphanumericReference(`UW${input.communityId}`)
    const netKey = (input.network || "trc20").toLowerCase().trim()
    const fallbackAddress =
      DEFAULT_NETWORK_DEPOSIT_ADDRESSES[netKey] ||
      DEFAULT_NETWORK_DEPOSIT_ADDRESSES.trc20

    let depositAddress = ""

    try {
      const walletData = await generateCustomerWallet({
        network: input.network,
        customer: {
          firstName,
          lastName,
          email: input.contributorEmail,
          phoneNumber: input.contributorPhone,
        },
      })

      if (typeof walletData.address === "string" && walletData.address) {
        depositAddress = walletData.address
      } else {
        depositAddress = fallbackAddress
      }
    } catch {
      depositAddress = fallbackAddress
    }

    try {
      const communityDoc = await Community.findOne({ onChainPotId: input.communityId })
      await Contribution.create({
        communityId: communityDoc?._id,
        onChainPotId: input.communityId,
        contributorName: input.contributorName,
        contributorEmail: input.contributorEmail,
        contributorPhone: input.contributorPhone,
        amountNgn: input.amountNgn,
        amountUsdc: estimatedUsdc,
        paymentMethod: "roqqu_crypto",
        paymentReference,
        status: "pending",
      })
    } catch (err) {
      console.warn("[MongoDB] Contribution tracking notice:", err)
    }

    const payload: RoqquCheckoutResult = {
      rail: "crypto_wallet",
      paymentReference,
      communityId: input.communityId,
      contributorName: input.contributorName,
      amountNgn: input.amountNgn,
      estimatedUsdc,
      ngnPerUsd,
      depositAddress,
      depositNetwork: input.network,
      source: depositAddress ? "ras-live" : "demo-simulated",
    }
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Checkout link generation failed.",
      },
      { status: 500 }
    )
  }
}
