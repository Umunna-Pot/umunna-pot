"use client"

import { useQuery } from "@tanstack/react-query"

import type { RoqquRatesSnapshot } from "@/types"

async function fetchRoqquRates(forceRefresh = false): Promise<RoqquRatesSnapshot> {
  const url = forceRefresh ? "/api/roqqu/rates?refresh=1" : "/api/roqqu/rates"
  const response = await fetch(url)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string
    } | null
    throw new Error(body?.message || `Rates request failed (${response.status})`)
  }
  return (await response.json()) as RoqquRatesSnapshot
}

export function useRoqquRates() {
  return useQuery({
    queryKey: ["roqqu-rates"],
    queryFn: () => fetchRoqquRates(false),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  })
}

