/**
 * POSTs JSON with exponential-backoff retries. Resolves `true` only on a 2xx response.
 *
 * Used to persist off-chain records right after an on-chain transaction succeeds.
 * The server routes it targets are idempotent (duplicate payment references / pot IDs
 * are answered with 2xx), so retrying after a lost response can never double-record.
 * Client errors (4xx except 408/429) are not retried because they will not succeed.
 */
export async function postJsonWithRetry(
  url: string,
  body: unknown,
  attempts = 3
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) return true
      const retryable =
        res.status >= 500 || res.status === 408 || res.status === 429
      if (!retryable) return false
    } catch {
      // network error: fall through to retry
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt))
    }
  }
  return false
}
