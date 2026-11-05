# UMUNNA POT: HOSTING READINESS AUDIT REPORT

**Target Platform**: Vercel (Next.js Managed Serverless Platform)  
**Project**: Umunna Pot  
**Audit Date**: 2026-11-05  
**Overall Status**: **HOSTING READY (PASS WITH ACTION ITEMS)**  

---

## 1. Executive Summary

This report provides an evidence-based hosting readiness audit for deploying Umunna Pot to **Vercel**.

Umunna Pot is built with **Next.js 16.4.3 (Turbopack)**, **React 19.3.1**, **TypeScript 5**, **Mongoose 9.11.4**, and **Viem 2.57.16 / Wagmi 2.19.5**. All 15 routes (pages and dynamic API endpoints) compile cleanly into standalone serverless functions and static prerenders.

Zero private keys or sensitive credentials are committed to Git. The `.gitignore` properly excludes `.env*` (preserving `.env.example`).

---

## 2. Repository & Build Inspection

| Parameter | Current Repository Configuration | Vercel Compatibility / Recommendation | Status |
| :--- | :--- | :--- | :---: |
| **Framework Detection** | Next.js 16.4.3 (`package.json`) | Automatically detected as Next.js | PASS |
| **Node.js Runtime** | Node.js `>= 20.x` | Supported on Vercel Node 20.x/22.x runtimes | PASS |
| **Package Manager** | `pnpm` (lockfile version 9, `pnpm-lock.yaml`) | Supported out-of-the-box by Vercel | PASS |
| **Build Command** | `pnpm build` (`next build`) | Default Vercel build command | PASS |
| **Root Directory** | Repository root (`.`) | Default deployment root | PASS |
| **Static Export** | No `output: "export"` configured | Standard SSR/Serverless API architecture | PASS |
| **Local Path Dependencies**| Zero runtime filesystem dependencies | All routes execute purely in serverless runtime | PASS |
| **`serverExternalPackages`**| `["pino", "pino-pretty", "thread-stream"]` | Configured in `next.config.ts` | PASS |

---

## 3. Comprehensive Environment Variable Audit

Every environment variable referenced across the entire codebase was audited:

| Variable Name | Required? | Scope | Safe for Browser? | Consuming Feature / Service | Documented in `.env.example`? |
| :--- | :---: | :---: | :---: | :--- | :---: |
| `NEXT_PUBLIC_APP_URL` | Optional | Client/Server | **YES** | Canonical app URL / OpenRouter referer | **YES** |
| `APPLICATION_URL` | Optional | Server-only | NO | Local fallback for referer header | **YES** |
| `OPENROUTER_API_KEY` | Required* | Server-only | **STRICTLY NO** | AI Drip Plan Engine (`POST /api/ai/drip-plan`) | **YES** |
| `OPENROUTER_BASE_URL` | Optional | Server-only | **STRICTLY NO** | OpenRouter endpoint override | **YES** |
| `OPENROUTER_MODEL` | Optional | Server-only | **STRICTLY NO** | AI Model (`anthropic/claude-sonnet-5.5`) | **YES** |
| `OPENROUTER_FALLBACK_MODEL` | Optional | Server-only | **STRICTLY NO** | Fallback model configuration | **YES** |
| `OPENROUTER_TIMEOUT_SECONDS`| Optional | Server-only | **STRICTLY NO** | Inference timeout control (default 60s) | **YES** |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` | Required | Client/Server | **YES** | Viem/Wagmi Base Sepolia RPC endpoint | **YES** |
| `NEXT_PUBLIC_CHAIN_ID` | Optional | Client/Server | **YES** | EVM Chain ID (`84532`) | **YES** |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional | Client/Server | **YES** | RainbowKit WalletConnect connection | **YES** |
| `NEXT_PUBLIC_MOCK_USDC_ADDRESS` | Required | Client/Server | **YES** | MockUSDC contract address | **YES** |
| `NEXT_PUBLIC_UMUNNA_POT_ADDRESS` | Required | Client/Server | **YES** | UmunnaPot contract address | **YES** |
| `MONGODB_URI` | Required | Server-only | **STRICTLY NO** | MongoDB Atlas connection string | **YES** |
| `MONGODB_DB` | Optional | Server-only | **STRICTLY NO** | Database name (defaults to `umunna_pot`) | **YES** |
| `ROQQU_BASE_URL` | Optional | Server-only | **STRICTLY NO** | Roqqu fiat ramp base URL | **YES** |
| `ROQQU_MODE` | Optional | Server-only | **STRICTLY NO** | `staging` vs `live` mode flag | **YES** |
| `ROQQU_SECRET_KEY` | Required** | Server-only | **STRICTLY NO** | Roqqu checkout & payout signing | **YES** |
| `ROQQU_PUBLIC_KEY` | Required** | Server-only | **STRICTLY NO** | Roqqu public authentication key | **YES** |
| `RELAYER_PRIVATE_KEY` | Optional | Server-only | **STRICTLY NO** | Gasless meta-transaction relayer | **YES** |
| `KEEPER_WALLET_PRIVATE_KEY` | Optional | Server-only | **STRICTLY NO** | Background keeper bot key | **YES** |
| `DEPLOYER_PRIVATE_KEY` | Optional | Server-only | **STRICTLY NO** | Foundry deployment script key | **YES** |

*\* If `OPENROUTER_API_KEY` is not provided, the system gracefully operates in `deterministic_fallback` mode without breaking.*\
*\*\* Required only if using Roqqu fiat banking checkout services.*

> [!NOTE]
> **No Variable Leaks Found**: None of the sensitive private keys or database URIs use the `NEXT_PUBLIC_` prefix. All sensitive variables are read exclusively inside server components, route handlers, or server utilities guarded by `if (typeof window !== "undefined") throw new Error(...)`.

---

## 4. Next.js & Serverless Hosting Compatibility

1. **Standard Node.js Runtime for APIs**:
   - Mongoose, Viem, and OpenRouter HTTP requests run in the default Node.js Serverless runtime (not Edge runtime).
   - This prevents Edge runtime compatibility issues with MongoDB drivers or crypto dependencies.
2. **Turbopack & Module Aliases**:
   - `next.config.ts` includes module resolution aliases to stub optional peer dependencies (`@x402/*`, `pino-pretty`, `@react-native-async-storage/async-storage`).
   - Production build `next build` passes smoothly with 0 compilation errors.
3. **Serverless Function Duration**:
   - OpenRouter inference requests have a configurable timeout (`OPENROUTER_TIMEOUT_SECONDS`, default 60s).
   - *Vercel Hobby Tier Limit*: Hobby tier serverless functions have a 10s default max execution limit (can be set up to 60s on Pro tier or adjusted in `maxDuration`).
   - *Mitigation*: Ensure `OPENROUTER_TIMEOUT_SECONDS` is set to `15` or `10` on Hobby tier deployments so the AI engine falls back deterministically before the serverless function terminates.

---

## 5. MongoDB Atlas Hosting Readiness

### 5.1. Connection Pooling (`lib/db.ts`)
- Uses global connection caching:
  ```typescript
  const cached = global.mongooseConnection || { conn: null, promise: null }
  ```
- Configures `maxPoolSize: 4`, `minPoolSize: 0`, and `serverSelectionTimeoutMS: 5000` to prevent socket exhaustion during concurrent serverless invocations.

### 5.2. Atlas Network Security Configuration
- **Requirement (IMPORTANT)**: By default, MongoDB Atlas restricts IP access. Since Vercel serverless functions use dynamic IP addresses from AWS/GCP regions, the MongoDB Atlas cluster must allow connections from Vercel:
  - Add `0.0.0.0/0` (Allow access from anywhere) in MongoDB Atlas Network Access with strong database user credentials, **or**
  - Use MongoDB Atlas Vercel Integration if VPC peering is desired.

---

## 6. Blockchain Configuration & Contract Verification

- **Target Network**: Base Sepolia (`chainId: 84532`)
- **UmunnaPot**: `0xf7D0aA978B6Ec7451a87Cc4457f282596a5df738`
- **MockUSDC**: `0xE9557485Ccd568c3984451f04f4ceF6E5b63809a`
- **Public RPC**: Defaults to `https://sepolia.base.org` via `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`.
- **RPC Rate Limits (IMPORTANT)**: Public RPCs (`sepolia.base.org`) are subject to public rate limits. For high demo traffic, configuring an Alchemy or Infura Base Sepolia endpoint in `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` is recommended.
- **Token Labeling**: All UI screens consistently identify the token as **`mUSDC` (MockUSDC on Base Sepolia)**.

---

## 7. Security & Privacy Inspection

- **Git Tracking Cleanliness**:
  - `git status --ignored` verifies that `.env.local` is strictly ignored and untracked.
  - No secret keys, seeds, or private API keys exist in git history.
- **Server Guard**:
  - `lib/openrouter.ts` throws an immediate runtime error if evaluated in a browser bundle.
- **Error Payloads**:
  - API routes (`/api/ai/drip-plan`, `/api/drip-vaults`) do not leak stack traces or Authorization headers.

---

## 8. Classification of Findings

| Item | Classification | Description & Action |
| :--- | :---: | :--- |
| **MongoDB Atlas Network Access** | **IMPORTANT** | Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access before deployment so Vercel serverless functions can connect. |
| **Vercel Function Timeout** | **IMPORTANT** | Set `OPENROUTER_TIMEOUT_SECONDS=10` in Vercel project environment settings if deploying on a Vercel Hobby plan. |
| **Base Sepolia RPC Endpoint** | **OPTIONAL** | Use a dedicated Alchemy/Infura Base Sepolia RPC URL in `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` if higher throughput is desired. |
| **WalletConnect Project ID** | **OPTIONAL** | Provide a valid WalletConnect Cloud Project ID in `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for mobile QR wallet pairing. |
| **Deployment Root & Build** | **PASS** | Repository root and `pnpm build` are 100% compliant with Vercel. |

---

## 9. Step-by-Step Vercel Deployment Checklist

When deploying to Vercel:

1. Import the repository into Vercel.
2. Select Framework Preset: **Next.js**.
3. Keep default Build Command: `next build` (or `pnpm build`).
4. Set the following Environment Variables in Vercel Project Settings:
   - `NEXT_PUBLIC_APP_URL`: `https://your-deployment-name.vercel.app`
   - `NEXT_PUBLIC_CHAIN_ID`: `84532`
   - `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`: `https://sepolia.base.org`
   - `NEXT_PUBLIC_UMUNNA_POT_ADDRESS`: `0xf7D0aA978B6Ec7451a87Cc4457f282596a5df738`
   - `NEXT_PUBLIC_MOCK_USDC_ADDRESS`: `0xE9557485Ccd568c3984451f04f4ceF6E5b63809a`
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: `[Your WalletConnect Project ID]`
   - `MONGODB_URI`: `mongodb+srv://...`
   - `MONGODB_DB`: `umunna_pot`
   - `OPENROUTER_API_KEY`: `sk-or-v1-...`
   - `OPENROUTER_MODEL`: `anthropic/claude-sonnet-5.5`
   - `OPENROUTER_TIMEOUT_SECONDS`: `15`
5. Ensure MongoDB Atlas Network Access IP Access List allows `0.0.0.0/0`.
6. Click **Deploy**.

---

## 10. Final Signoff

**PASS**: Umunna Pot is fully verified and hosting-ready for deployment on Vercel.
