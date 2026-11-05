# Umunna Pot — Phase 3 Environment & Integration Setup Guide

## 1. Overview & Architectural Scope

This document specifies the operational environment, server-side configuration, security boundaries, and connectivity diagnostics for **Phase 3 (AI Drip Engine)** of Umunna Pot on **Base Sepolia (Chain ID: 84532)**.

The architecture enforces strict segregation of duties across four system pillars:
1. **AI Integration:** OpenRouter (`https://openrouter.ai/api/v1`) — Server-side only, zero browser leakage.
2. **Blockchain:** Base Sepolia EVM, Viem public client, Wagmi multi-wallet connectors, and smart contract bindings.
3. **Fiat/Crypto Gateway:** Roqqu API Services (RAS) — Server-side only, non-custodial rate caching and deposit link routing.
4. **Wallet & Signer Isolation:** Distinct separation between user-authorized wallets, relayer wallets, keeper automation, and contract deployers.

---

## 2. Environment Variables Specification

All local variables are configured in `.env.local` (which is strictly ignored by version control in `.gitignore`). Safe default templates with non-secret placeholders are maintained in `.env.example`.

### Required Variables (Core Application & Phase 3)

| Variable Name | Context | Example / Allowed Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Public / Browser | `http://localhost:3000` or `https://umunna-pot.vercel.app` | Base application URL for CORS, callback URLs, and OpenRouter Referer. |
| `OPENROUTER_API_KEY` | Server-Side Only | `sk-or-v1-...` | Bearer API token for OpenRouter. Never prefix with `NEXT_PUBLIC_`. |
| `OPENROUTER_BASE_URL` | Server-Side Only | `https://openrouter.ai/api/v1` | Root endpoint for OpenRouter AI API. |
| `OPENROUTER_MODEL` | Server-Side Only | `anthropic/claude-sonnet-5.5` | Default AI model used for Phase 3 Drip Vault schedule analysis. |
| `OPENROUTER_TIMEOUT_SECONDS` | Server-Side Only | `60` | HTTP request timeout in seconds for AI inference requests. |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` | Public / Browser | `https://sepolia.base.org` | JSON-RPC provider endpoint for Base Sepolia testnet. |
| `NEXT_PUBLIC_CHAIN_ID` | Public / Browser | `84532` | Base Sepolia chain identifier. |
| `ROQQU_BASE_URL` | Server-Side Only | `https://service.roqqu.com/v1` | Roqqu API Services root endpoint. |
| `ROQQU_MODE` | Server-Side Only | `staging` or `live` | Determines auth header: `x-staging-api-key` vs `x-api-key`. |
| `ROQQU_SECRET_KEY` | Server-Side Only | `RASPRIV...` | Server-only private API key for Roqqu operations. |

### Optional / Future-Stage Variables

| Variable Name | Context | Default / Fallback | Description |
| :--- | :--- | :--- | :--- |
| `OPENROUTER_FALLBACK_MODEL` | Server-Side Only | `google/gemini-4-argon` | Secondary model for automatic fallback if primary model is rate-limited. |
| `NEXT_PUBLIC_UMUNNA_POT_ADDRESS` | Public / Browser | `0x0000000000000000000000000000000000000000` | Deployed address of `UmunnaPot.sol`. Configured after deployment. |
| `NEXT_PUBLIC_MOCK_USDC_ADDRESS` | Public / Browser | `0x0000000000000000000000000000000000000000` | Deployed address of `MockUSDC.sol`. Configured after deployment. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Public / Browser | Safe static fallback | WalletConnect Cloud project ID for RainbowKit QR modal. |
| `RELAYER_PRIVATE_KEY` | Server-Side Only | Empty | 64-character hex key for backend relayer settlement. |
| `KEEPER_WALLET_PRIVATE_KEY` | Server-Side Only | Empty | 64-character hex key for automated `releaseDue()` keeper bots. |
| `DEPLOYER_PRIVATE_KEY` | Server-Side Only | Empty | 64-character hex key for Foundry deployment scripts. |
| `ROQQU_PUBLIC_KEY` | Server-Side Only | `RASPUB...` | Public identifier for Roqqu API Services. |

---

## 3. OpenRouter AI Integration

### Architecture & Boundaries
OpenRouter is the mandatory AI provider for Umunna Pot. The server-side client is encapsulated in [`lib/openrouter.ts`](file:///c:/Users/USER/Documents/Projects/Hackthon/umunna-pot/lib/openrouter.ts).

Key security and resilience controls:
- **Server-Only Enforcement:** Guarded with `typeof window !== "undefined"` runtime boundary.
- **Authorization Hygiene:** Requests send `Authorization: Bearer <OPENROUTER_API_KEY>` and identification headers `HTTP-Referer` and `X-Title`. Headers are never logged.
- **Network Resilience:** Uses `AbortController` bounded by `OPENROUTER_TIMEOUT_SECONDS` (default 60s).
- **Error Sanitization:** Distinguishes between 401/403 (Authentication failure), 429 (Rate limit reached), and 5xx upstream outages, preventing raw secret or stack leaks to client callers.
- **Non-Inference Connectivity Diagnostics:** Exposes `verifyOpenRouterConnectivity()`, querying read-only `GET /models` to verify authentication, catalog latency, and model availability without incurring paid token consumption.

---

## 4. Base Sepolia Blockchain Configuration

### Network Details
- **Network Name:** Base Sepolia Testnet
- **Chain ID:** `84532`
- **Native Gas Token:** Sepolia ETH
- **Block Explorer:** [https://sepolia.basescan.org](https://sepolia.basescan.org)
- **Official RPC:** `https://sepolia.base.org`

### Client & Wagmi Configuration
- [`lib/wagmi.ts`](file:///c:/Users/USER/Documents/Projects/Hackthon/umunna-pot/lib/wagmi.ts) initializes Wagmi v2 with Base Sepolia, cookie SSR storage, and RainbowKit connectors (MetaMask, Coinbase Wallet, Injected, Rainbow, WalletConnect).
- [`lib/contracts.ts`](file:///c:/Users/USER/Documents/Projects/Hackthon/umunna-pot/lib/contracts.ts) provides typed contract ABIs (`UMUNNA_POT_ABI`, `MOCK_USDC_ABI`) and contract address resolution.
- [`lib/blockchain.ts`](file:///c:/Users/USER/Documents/Projects/Hackthon/umunna-pot/lib/blockchain.ts) provides read-only connectivity diagnostics:
  - Queries `eth_chainId` and verifies match with `84532`.
  - Queries `eth_blockNumber` to confirm live node synchronization.
  - Queries `eth_getCode` at configured contract addresses to verify deployed bytecode presence.

---

## 5. Wallet Architecture & Role Separation

Security requires strict differentiation between wallet types:

```
┌─────────────────────────────────────────────────────────────┐
│                       WALLETS MATRIX                        │
├──────────────────────┬─────────────┬─────────────┬──────────┤
│ Wallet Role          │ Execution   │ Private Key │ Custody  │
├──────────────────────┼─────────────┼─────────────┼──────────┤
│ User Connected       │ Client / UI │ Self-Custody│ User     │
│ Public Wallet (View) │ Read-Only   │ None        │ Public   │
│ Backend Relayer      │ Server-Side │ Server Env  │ Internal │
│ Automated Keeper     │ Server-Side │ Server Env  │ Internal │
│ Contract Deployer    │ Local / CI  │ Offline Env │ Internal │
└──────────────────────┴─────────────┴─────────────┴──────────┘
```

1. **User Connected Wallet:** Interacts via RainbowKit/Wagmi. Responsible for signing `createCommunity`, `contribute`, `proposePayout`, `approvePayout`, and `createDripVault`.
2. **Public Wallet Address:** Used solely for balance inspection and read-only queries. Never accepted as authorization proof.
3. **Backend Relayer / Keeper:** Only used server-side for executing due payouts or drip releases. Never exposed to browser bundle.
4. **Contract Deployer:** Used strictly inside Foundry deployment scripts (`contracts/script/Deploy.s.sol`).

---

## 6. Roqqu API Services (RAS) Configuration

Configured in [`lib/roqquClient.ts`](file:///c:/Users/USER/Documents/Projects/Hackthon/umunna-pot/lib/roqquClient.ts):
- **Staging vs Live:** `ROQQU_MODE=staging` automatically directs headers to `x-staging-api-key`. `ROQQU_MODE=live` directs headers to `x-api-key`.
- **Read-Only Verification:** `verifyRoqquConnectivity()` queries public market endpoints (`/rates`, `/prices`) and authenticated balance lookups (`POST /balances`) without initiating any fund transfers or swaps.
- **Fail-Safe Graceful Degradation:** When Roqqu upstream services or network routes time out, the client automatically defaults to verified fallback rate tables (`demo-fallback`), allowing UI development and local testing to proceed without crashing.

---

## 7. Local Secret Management

1. **Zero Secret Leakage:** Never commit `.env` or `.env.local` to Git. Check with `git status` or `git check-ignore .env.local`.
2. **No Browser Exposure:** Never prefix private keys, AI API keys, or Roqqu secret keys with `NEXT_PUBLIC_`.
3. **Redaction in Diagnostics:** All diagnostic outputs and error handlers in `lib/env.ts`, `lib/openrouter.ts`, `lib/blockchain.ts`, and `lib/roqquClient.ts` strip credentials and auth headers before reporting.

---

## 8. Verification & Diagnostics

A unified diagnostic runner is provided in [`scripts/verify-setup.ts`](file:///c:/Users/USER/Documents/Projects/Hackthon/umunna-pot/scripts/verify-setup.ts).

### Running the Diagnostic Suite

```bash
# Execute read-only verification across all 4 pillars
pnpm dlx tsx scripts/verify-setup.ts
```

### Running TypeScript Check & Next.js Build

```bash
# Typecheck without emitting JS
pnpm typecheck

# Full production compilation check
pnpm build
```

---

## 9. Common Configuration Errors & Remedies

| Error / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| `OPENROUTER_API_KEY is not configured` | Missing or placeholder key in `.env.local` | Set valid `OPENROUTER_API_KEY=sk-or-v1-...` in `.env.local`. |
| `OpenRouter authentication failed (401)` | Expired or incorrect OpenRouter API key | Verify key status and credits at https://openrouter.ai/settings/keys. |
| `Chain ID mismatch (got X, expected 84532)` | RPC URL points to Mainnet or different testnet | Ensure `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org`. |
| `Contract configured with zero-address` | Contracts not yet deployed to Base Sepolia | Deploy contracts using Foundry and update `NEXT_PUBLIC_UMUNNA_POT_ADDRESS` and `NEXT_PUBLIC_MOCK_USDC_ADDRESS`. |
| `Roqqu authentication failed: operation aborted` | Cloudflare firewall / staging network timeout | Verify network connectivity or rely on built-in `demo-fallback` mode for local UI development. |
| `lib/env.ts must only be imported on the server` | Imported inside a `"use client"` component | Move environment calls to API route handlers or server actions. |
