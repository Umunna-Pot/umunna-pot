import crypto from "node:crypto"

if (typeof window !== "undefined") {
  throw new Error("lib/roqquClient.ts must only be imported on the server.")
}

import {
  rasBalancesResponseSchema,
  rasPricesResponseSchema,
  rasRatesResponseSchema,
  type CreatePaymentLinkInput,
  type GenerateDepositWalletInput,
} from "@/lib/schemas"
import type {
  RoqquDataSource,
  RoqquFiatRate,
  RoqquPaymentLinkResult,
  RoqquRatesSnapshot,
  RoqquSupportedNetwork,
  RoqquTokenQuote,
  RoqquTreasuryBalances,
} from "@/types"

const DEFAULT_BASE_URL = "https://service.roqqu.com/v1"
const CACHE_TTL_MS = 60_000

const TRACKED_TOKENS = [
  "usdt",
  "usdc",
  "btc",
  "eth",
  "trx",
  "sol",
  "bnb",
  "xrp",
  "cngn",
] as const

const FALLBACK_FIAT_RATES: Record<string, RoqquFiatRate> = {
  ngn: {
    symbol: "ngn",
    title: "Nigerian Naira",
    rate: 1375,
    icon: "NGN",
    minTradeable: 500,
    maxTradeable: 10_000_000,
    minWithdraw: 1000,
    maxWithdraw: 10_000_000,
  },
  usd: {
    symbol: "usd",
    title: "United States Dollar",
    rate: 1,
    icon: "$",
    minTradeable: 1,
    maxTradeable: 10_000,
    minWithdraw: 10,
    maxWithdraw: 10_000,
  },
}

const FALLBACK_USD_PRICES: Record<string, { price: number; change: number }> = {
  usdt: { price: 1, change: 0 },
  usdc: { price: 1, change: 0 },
  btc: { price: 78_250, change: 0.98 },
  eth: { price: 2_318, change: 1.59 },
  trx: { price: 0.32, change: -0.74 },
  sol: { price: 92.84, change: -0.21 },
  bnb: { price: 700.2, change: -0.2 },
  xrp: { price: 1.28, change: -0.07 },
  cngn: { price: 0.000727, change: 0 },
}

let cachedSnapshot: { data: RoqquRatesSnapshot; expiresAt: number } | null = null

function getRoqquConfig() {
  const baseUrl = (process.env.ROQQU_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  )
  const secretKey = process.env.ROQQU_SECRET_KEY?.trim() || ""
  const mode: "staging" | "live" =
    process.env.ROQQU_MODE === "live" ? "live" : "staging"
  const authHeaderName = mode === "live" ? "x-api-key" : "x-staging-api-key"

  return { baseUrl, secretKey, mode, authHeaderName }
}

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const { secretKey, authHeaderName } = getRoqquConfig()
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  }
  if (secretKey) {
    headers[authHeaderName] = secretKey
  }
  return headers
}

async function fetchJson(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<unknown> {
  const { baseUrl } = getRoqquConfig()
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    init?.timeoutMs ?? 8_000
  )

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    })
    const payload: unknown = await response.json()
    if (!response.ok) {
      const msg =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof (payload as { message?: unknown }).message === "string"
          ? (payload as { message: string }).message
          : `Roqqu HTTP ${response.status}`
      throw new Error(msg)
    }
    return payload
  } finally {
    clearTimeout(timeout)
  }
}

function computeTreasuryTotals(
  rawBalances: Omit<
    RoqquTreasuryBalances,
    "totalEstimatedUsd" | "totalEstimatedNgn"
  >,
  prices: Record<string, RoqquTokenQuote>,
  ngnPerUsd: number
): RoqquTreasuryBalances {
  const totalEstimatedUsd =
    rawBalances.usdt * (prices.usdt?.usdPrice ?? 1) +
    rawBalances.btc * (prices.btc?.usdPrice ?? 0) +
    rawBalances.eth * (prices.eth?.usdPrice ?? 0) +
    rawBalances.trx * (prices.trx?.usdPrice ?? 0) +
    rawBalances.sol * (prices.sol?.usdPrice ?? 0) +
    rawBalances.bnb * (prices.bnb?.usdPrice ?? 0) +
    rawBalances.xrp * (prices.xrp?.usdPrice ?? 0)

  return {
    ...rawBalances,
    totalEstimatedUsd,
    totalEstimatedNgn: totalEstimatedUsd * ngnPerUsd,
  }
}

export async function getMarketRatesAndBalances(options?: {
  forceRefresh?: boolean
}): Promise<RoqquRatesSnapshot> {
  const now = Date.now()
  if (!options?.forceRefresh && cachedSnapshot && cachedSnapshot.expiresAt > now) {
    return { ...cachedSnapshot.data, cached: true }
  }

  const { secretKey, mode } = getRoqquConfig()

  const [ratesSettled, pricesSettled, balancesSettled] =
    await Promise.allSettled([
      fetchJson("/rates", { method: "GET" }),
      fetchJson("/prices", { method: "GET" }),
      secretKey
        ? fetchJson("/balances", {
            method: "POST",
            headers: buildAuthHeaders({
              "Content-Type": "application/x-www-form-urlencoded",
            }),
            body: new URLSearchParams().toString(),
          })
        : Promise.reject(new Error("ROQQU_SECRET_KEY not configured")),
    ])

  let fiatRates: Record<string, RoqquFiatRate> = { ...FALLBACK_FIAT_RATES }
  let hasLivePublic = false

  if (ratesSettled.status === "fulfilled") {
    const parsedRates = rasRatesResponseSchema.safeParse(ratesSettled.value)
    if (parsedRates.success) {
      hasLivePublic = true
      fiatRates = {}
      for (const item of parsedRates.data.data) {
        const key = item.symbol.toLowerCase()
        fiatRates[key] = {
          symbol: key,
          title: item.title,
          rate: item.rate,
          icon: item.icon,
          minTradeable: item.min_tradeable,
          maxTradeable: item.max_tradeable,
          minWithdraw: item.min_withdraw,
          maxWithdraw: item.max_withdraw,
        }
      }
    }
  }

  const ngnPerUsd = fiatRates.ngn?.rate ?? FALLBACK_FIAT_RATES.ngn.rate
  const prices: Record<string, RoqquTokenQuote> = {}

  if (pricesSettled.status === "fulfilled") {
    const parsedPrices = rasPricesResponseSchema.safeParse(pricesSettled.value)
    if (parsedPrices.success) {
      hasLivePublic = true
      for (const symbol of TRACKED_TOKENS) {
        const item = parsedPrices.data.data[symbol]
        const usdPrice = item?.price ?? FALLBACK_USD_PRICES[symbol]?.price ?? 0
        prices[symbol] = {
          symbol: symbol.toUpperCase(),
          usdPrice,
          ngnPrice: usdPrice * ngnPerUsd,
          change24h: item?.change ?? 0,
        }
      }
    }
  }

  if (Object.keys(prices).length === 0) {
    for (const symbol of TRACKED_TOKENS) {
      const fallback = FALLBACK_USD_PRICES[symbol] ?? { price: 0, change: 0 }
      prices[symbol] = {
        symbol: symbol.toUpperCase(),
        usdPrice: fallback.price,
        ngnPrice: fallback.price * ngnPerUsd,
        change24h: fallback.change,
      }
    }
  }

  let source: RoqquDataSource = hasLivePublic ? "roqqu-public" : "demo-fallback"
  let baseBalances: Omit<
    RoqquTreasuryBalances,
    "totalEstimatedUsd" | "totalEstimatedNgn"
  > = {
    usdt: 10_000,
    btc: 0,
    eth: 0,
    trx: 0,
    sol: 0,
    bnb: 0,
    xrp: 0,
  }

  if (balancesSettled.status === "fulfilled") {
    const parsedBalances = rasBalancesResponseSchema.safeParse(
      balancesSettled.value
    )
    if (parsedBalances.success) {
      source = "ras-live"
      const b = parsedBalances.data.data.balance
      baseBalances = {
        email: b.email,
        usdt: b.usdt,
        btc: b.btc,
        eth: b.eth,
        trx: b.trx,
        sol: b.sol,
        bnb: b.bnb,
        xrp: b.xrp,
      }
    }
  }

  const snapshot: RoqquRatesSnapshot = {
    ngnPerUsd,
    fiatRates,
    prices,
    treasury: computeTreasuryTotals(baseBalances, prices, ngnPerUsd),
    mode,
    source,
    cached: false,
    updatedAt: new Date().toISOString(),
  }

  cachedSnapshot = {
    data: snapshot,
    expiresAt: now + CACHE_TTL_MS,
  }

  return snapshot
}

export async function getSupportedPaymentNetworks(): Promise<
  RoqquSupportedNetwork[]
> {
  const payload = (await fetchJson("/payment-links/supported-networks", {
    method: "GET",
    headers: buildAuthHeaders(),
  })) as { data?: RoqquSupportedNetwork[] }

  return Array.isArray(payload.data) ? payload.data : []
}

export function generateAlphanumericReference(prefix = "UP"): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4)
  const randomSuffix = crypto.randomBytes(6).toString("hex").toUpperCase()
  return `${cleanPrefix}${Date.now().toString(36).toUpperCase()}${randomSuffix}`.slice(
    0,
    20
  )
}

export async function createPaymentLink(
  input: CreatePaymentLinkInput
): Promise<RoqquPaymentLinkResult> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://umunna-pot.vercel.app"
  const paymentReference = generateAlphanumericReference(`UP${input.communityId}`)
  const [firstName, ...rest] = input.contributorName.trim().split(/\s+/)
  const lastName = rest.join(" ") || "Contributor"

  const form = new URLSearchParams({
    amount: String(Math.round(input.amountNgn)),
    amount_currency: "ngn",
    payment_reference: paymentReference,
    customer_details: JSON.stringify({
      firstName,
      lastName,
      email: input.contributorEmail,
      phoneNumber: input.contributorPhone,
    }),
    metadata: JSON.stringify({
      communityId: input.communityId,
      contributorName: input.contributorName,
    }),
    success_url: `${appUrl}/community-funds?payment=success&ref=${paymentReference}`,
    cancel_url: `${appUrl}/community-funds?payment=cancelled&ref=${paymentReference}`,
  })

  const payload = (await fetchJson("/payment-links", {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body: form.toString(),
  })) as { data?: Record<string, unknown> }

  const data = payload.data ?? {}
  const checkoutUrl =
    typeof data.url === "string"
      ? data.url
      : typeof data.payment_link === "string"
        ? data.payment_link
        : ""

  return {
    paymentReference,
    checkoutUrl,
    amountNgn: input.amountNgn,
    wallets:
      typeof data.wallets === "object" && data.wallets !== null
        ? (data.wallets as Record<string, unknown>)
        : undefined,
    raw: data,
  }
}

export async function generateCustomerWallet(
  input: GenerateDepositWalletInput
): Promise<Record<string, unknown>> {
  const payload = (await fetchJson("/wallets/generate-wallet", {
    method: "POST",
    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  })) as { data?: Record<string, unknown> }

  return payload.data ?? {}
}

export async function sellTokenToUsdt(params: {
  amount: number
  token: string
}): Promise<Record<string, unknown>> {
  const token = params.token.toLowerCase()
  if (token === "usdt") {
    throw new Error("Token is already USDT; no sell order required.")
  }

  const form = new URLSearchParams({
    amount: String(params.amount),
    token,
  })

  const payload = (await fetchJson("/trade/sell", {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body: form.toString(),
  })) as { data?: Record<string, unknown> }

  return payload.data ?? {}
}

export async function buyTokenWithUsdt(params: {
  amount: number
  token: string
}): Promise<Record<string, unknown>> {
  const token = params.token.toLowerCase()
  if (token === "usdt") {
    throw new Error("Cannot buy USDT with USDT.")
  }

  const form = new URLSearchParams({
    amount: String(params.amount),
    token,
  })

  const payload = (await fetchJson("/trade/buy", {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body: form.toString(),
  })) as { data?: Record<string, unknown> }

  return payload.data ?? {}
}

export async function swapTokens(params: {
  amount: number
  from: string
  to: string
}): Promise<Record<string, unknown>> {
  const from = params.from.toLowerCase()
  const to = params.to.toLowerCase()
  if (from === "usdt" || to === "usdt") {
    throw new Error(
      "RAS forbids USDT in /trade/swap; use buyTokenWithUsdt or sellTokenToUsdt instead."
    )
  }

  const form = new URLSearchParams({
    amount: String(params.amount),
    from,
    to,
  })

  const payload = (await fetchJson("/trade/swap", {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body: form.toString(),
  })) as { data?: Record<string, unknown> }

  return payload.data ?? {}
}

export async function sendCoin(params: {
  amount: number
  network: string
  to: string
  token: string
}): Promise<Record<string, unknown>> {
  const form = new URLSearchParams({
    amount: String(params.amount),
    network: params.network.toLowerCase(),
    to: params.to,
    token: params.token.toLowerCase(),
  })

  const payload = (await fetchJson("/wallets/send", {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body: form.toString(),
  })) as { data?: Record<string, unknown> }

  return payload.data ?? {}
}

export function decryptWebhookPayload(params: {
  encryptedHashHex: string
  ivHexHeader: string
}): Record<string, unknown> {
  const { secretKey } = getRoqquConfig()
  if (secretKey.length < 32) {
    throw new Error("ROQQU_SECRET_KEY must be at least 32 characters.")
  }

  const key = Buffer.from(secretKey.substring(0, 32), "utf8")
  const iv = Buffer.from(params.ivHexHeader, "hex")
  const encryptedBytes = Buffer.from(params.encryptedHashHex, "hex")

  const decipher = crypto.createDecipheriv("aes-256-ctr", key, iv)
  const decrypted = Buffer.concat([
    decipher.update(encryptedBytes),
    decipher.final(),
  ]).toString("utf8")

  return JSON.parse(decrypted) as Record<string, unknown>
}
