import { formatUnits, parseUnits } from "viem"

export const USDC_DECIMALS = 6

export function formatUsdc(
  rawAmount: bigint | number | string,
  options?: { maximumFractionDigits?: number }
): string {
  const numeric =
    typeof rawAmount === "bigint"
      ? Number(formatUnits(rawAmount, USDC_DECIMALS))
      : Number(rawAmount)

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(Number.isFinite(numeric) ? numeric : 0)
}

export function parseUsdc(amount: string | number): bigint {
  const clean = String(amount).replace(/,/g, "").trim()
  if (!clean) return BigInt(0)
  return parseUnits(clean, USDC_DECIMALS)
}

export function formatNgn(
  amountNgn: number,
  options?: { maximumFractionDigits?: number }
): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(Number.isFinite(amountNgn) ? amountNgn : 0)
}

export function formatUsd(
  amountUsd: number,
  options?: { maximumFractionDigits?: number }
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(Number.isFinite(amountUsd) ? amountUsd : 0)
}

export function usdcToNgn(rawUsdc: bigint, ngnPerUsd: number): number {
  const usdcNumber = Number(formatUnits(rawUsdc, USDC_DECIMALS))
  return usdcNumber * ngnPerUsd
}

export function shortenAddress(address?: string | null, chars = 4): string {
  if (!address) return "Not connected"
  if (address.length <= chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatCountdown(targetUnixSeconds: number | bigint): string {
  const target = Number(targetUnixSeconds)
  const nowSeconds = Math.floor(Date.now() / 1000)
  const diff = target - nowSeconds

  if (diff <= 0) return "Ready now"

  const days = Math.floor(diff / 86_400)
  const hours = Math.floor((diff % 86_400) / 3_600)
  const minutes = Math.floor((diff % 3_600) / 60)
  const seconds = diff % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
