# UMUNNA POT: VERCEL DEPLOYMENT GUIDE

Comprehensive operational manual for deploying the **Umunna Pot** Next.js full-stack application to **Vercel**.

---

## 1. Prerequisites

Before deploying to Vercel, verify that you have:

1. A **GitHub account** with access to the `umunna-pot` repository.
2. A **Vercel account** (Hobby or Pro plan) linked to your GitHub account.
3. A **MongoDB Atlas cluster** with database user credentials ready.
4. An **OpenRouter API key** (`sk-or-v1-...`) for AI Drip Plan generation (optional; the app falls back to deterministic calculations if omitted).
5. A **WalletConnect / Reown Cloud Project ID** from [cloud.reown.com](https://cloud.reown.com) for mobile QR wallet pairing (optional but recommended).

---

## 2. Recommended Vercel Project Settings

When importing the project into Vercel, use the following configurations:

| Configuration Setting | Recommended Value | Notes |
| :--- | :--- | :--- |
| **Framework Preset** | `Next.js` | Automatically detected by Vercel |
| **Root Directory** | `./` (Repository root) | Leave default |
| **Build Command** | `pnpm build` (or default `next build`) | Automatically handled |
| **Output Directory** | `.next` (default) | Automatically handled |
| **Install Command** | `pnpm install` | Vercel natively detects `pnpm-lock.yaml` |
| **Node.js Version** | `20.x` or `22.x` | Set in Project Settings -> General -> Node.js Version |

---

## 3. Environment Variables Configuration

In the Vercel Dashboard, navigate to:  
**Project Settings $\rightarrow$ Environment Variables**

Add the following environment variables. Ensure the environment checkboxes (**Production**, **Preview**, and **Development**) are selected as appropriate.

> [!WARNING]
> **Security Guardrails**:
> - Never prefix server-only keys (`OPENROUTER_API_KEY`, `MONGODB_URI`, `ROQQU_SECRET_KEY`) with `NEXT_PUBLIC_`.
> - Never store real private keys (`RELAYER_PRIVATE_KEY`, `DEPLOYER_PRIVATE_KEY`) in client bundles.

### 3.1. Public Client Variables (Embedded in Client Bundle)

| Variable Name | Required? | Example Value | Purpose |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://your-deployment-name.vercel.app` | Canonical app domain used for metadata, redirects, and OpenRouter referers. |
| `NEXT_PUBLIC_CHAIN_ID` | **Yes** | `84532` | Target EVM Chain ID (`84532` = Base Sepolia Testnet). |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` | **Yes** | `https://sepolia.base.org` | JSON-RPC provider endpoint for Base Sepolia on-chain calls. For production scale, use Alchemy or Infura. |
| `NEXT_PUBLIC_UMUNNA_POT_ADDRESS` | **Yes** | `0xf7D0aA978B6Ec7451a87Cc4457f282596a5df738` | Deployed core UmunnaPot contract address on Base Sepolia. |
| `NEXT_PUBLIC_MOCK_USDC_ADDRESS` | **Yes** | `0xE9557485Ccd568c3984451f04f4ceF6E5b63809a` | Deployed MockUSDC (`mUSDC`) ERC-20 contract address on Base Sepolia. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional | `a1b2c3d4...` | Reown / WalletConnect Cloud Project ID for mobile QR connection modal. |

### 3.2. Server-Only Variables (Protected Serverless Runtime)

| Variable Name | Required? | Example Value | Purpose |
| :--- | :---: | :--- | :--- |
| `MONGODB_URI` | **Yes** | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority` | Connection string to MongoDB Atlas. |
| `MONGODB_DB` | Optional | `umunna_pot` | Database name (defaults to `umunna_pot` if omitted). |
| `OPENROUTER_API_KEY` | Optional | `sk-or-v1-abcdef123456...` | Bearer token for OpenRouter LLM inference. If omitted, the engine uses deterministic fallbacks. |
| `OPENROUTER_BASE_URL` | Optional | `https://openrouter.ai/api/v1` | OpenRouter API base URL (defaults to official endpoint). |
| `OPENROUTER_MODEL` | Optional | `anthropic/claude-sonnet-5.5` | Target LLM model for schedule advisory reasoning. |
| `OPENROUTER_TIMEOUT_SECONDS` | **Important** | `15` | Timeout for AI inference before triggering deterministic fallback. **Set to 10 or 15 on Vercel Hobby plans** to avoid lambda timeouts. |
| `ROQQU_BASE_URL` | Optional | `https://service.roqqu.com/v1` | Roqqu fiat API base endpoint. |
| `ROQQU_MODE` | Optional | `staging` | Roqqu environment flag (`staging` or `live`). |
| `ROQQU_SECRET_KEY` | Optional* | `RASPRIV_...` | Private key for signing Roqqu fiat checkout and payouts (*only if fiat ramp is used). |
| `ROQQU_PUBLIC_KEY` | Optional* | `RASPUB_...` | Public key for Roqqu authentication (*only if fiat ramp is used). |

---

## 4. MongoDB Atlas Networking Requirements

Because Vercel Serverless Functions execute on dynamic IP addresses within AWS/GCP data centers, MongoDB Atlas will reject incoming connections unless configured:

### Option A: Allow Access from Anywhere (Standard Serverless Approach)
1. Log in to the [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Select your cluster and navigate to **Security** $\rightarrow$ **Network Access**.
3. Click **Add IP Address**.
4. Click **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Confirm.
6. Ensure your database user password has high entropy (minimum 24 characters).

### Option B: MongoDB Atlas Vercel Integration
1. In the Vercel Marketplace, search for and install the **MongoDB Atlas** integration.
2. Link your Atlas project directly to your Vercel project.
3. This automatically injects `MONGODB_URI` and configures secure connection pooling.

---

## 5. Step-by-Step Deployment Procedure

### Step 1: Push Repository to GitHub
Ensure all local changes are pushed to your target branch (e.g. `main` or your deployment branch):
```bash
git push origin <branch-name>
```

### Step 2: Import into Vercel
1. In the Vercel Dashboard, click **Add New...** $\rightarrow$ **Project**.
2. Select the `umunna-pot` Git repository and click **Import**.
3. Under **Configure Project**:
   - Ensure Framework Preset is **Next.js**.
   - Expand **Environment Variables**.
   - Paste all variables outlined in Section 3 above.
4. Click **Deploy**.

### Step 3: Monitor Build Output
Vercel will execute:
1. `pnpm install` (resolving dependencies with pinned `qr@0.5.5`).
2. `next build` (running Turbopack compilation and route generation).
3. Verification that all 15 routes (7 static pages, 8 dynamic serverless functions) compile.

---

## 6. Post-Deployment Verification Checklist

Once the deployment completes and your Vercel URL (`https://<project-name>.vercel.app`) is live:

1. **Homepage Loading**:
   - Navigate to `/` and verify hero, feature cards, and navigation load cleanly without errors.
2. **Wallet Connection**:
   - Click **Connect Wallet** in the top navigation.
   - Test connecting with MetaMask, Coinbase Wallet, or WalletConnect.
   - Verify network is detected as Base Sepolia (`84532`).
3. **Database Health**:
   - Navigate to `/community-funds` or `/drip-vault`.
   - Verify that community funds and drip vaults load from MongoDB without `500` server errors.
4. **AI Drip Plan Advisory**:
   - In `/drip-vault`, enter a total amount (e.g., `100 mUSDC`), choose a frequency (e.g., `Weekly`), and request an AI plan.
   - Verify that either the AI recommendation or the deterministic fallback responds with exact 6-decimal micro-unit precision within 15 seconds.
5. **On-Chain Creation & Sync**:
   - Submit a test vault creation with mock testnet USDC.
   - Verify that the transaction receipt is confirmed on Base Sepolia and synced into MongoDB without duplicate records.

---

## 7. Troubleshooting & FAQs

### Issue 1: `RangeError: invalid border=0` on Connect Wallet
- **Cause**: An unpinned or conflicting version of the `qr` package was loaded by RainbowKit/cuer.
- **Fix**: The repository specifies `overrides: { qr: "0.5.5" }` in both `pnpm-workspace.yaml` and `package.json`. If this appears, redeploy with **Clear Build Cache** checked in Vercel.

### Issue 2: `MongooseServerSelectionError: connection timed out`
- **Cause**: MongoDB Atlas Network Access is blocking Vercel's dynamic IP addresses.
- **Fix**: Go to MongoDB Atlas $\rightarrow$ Network Access and add `0.0.0.0/0` to the IP Access List.

### Issue 3: `FUNCTION_INVOCATION_TIMEOUT` on `/api/ai/drip-plan`
- **Cause**: OpenRouter inference latency exceeded the Vercel Hobby plan execution limit (10s default).
- **Fix**: Set `OPENROUTER_TIMEOUT_SECONDS=10` or `15` in Vercel Environment Variables. This forces the engine to gracefully abort and return a deterministic fallback before Vercel terminates the function.

### Issue 4: `429 Too Many Requests` on Base Sepolia Calls
- **Cause**: The public RPC `https://sepolia.base.org` has shared rate limits.
- **Fix**: Set `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` to an authenticated RPC from Alchemy, Infura, or QuickNode.

### Issue 5: Missing or Placeholder Contract Addresses
- **Cause**: `NEXT_PUBLIC_UMUNNA_POT_ADDRESS` or `NEXT_PUBLIC_MOCK_USDC_ADDRESS` was left as `0x000...`.
- **Fix**: Update the environment variables in Vercel with the deployed addresses:
  - `NEXT_PUBLIC_UMUNNA_POT_ADDRESS`: `0xf7D0aA978B6Ec7451a87Cc4457f282596a5df738`
  - `NEXT_PUBLIC_MOCK_USDC_ADDRESS`: `0xE9557485Ccd568c3984451f04f4ceF6E5b63809a`
