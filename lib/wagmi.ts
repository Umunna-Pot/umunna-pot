import { cookieStorage, createConfig, createStorage, http } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { connectorsForWallets } from "@rainbow-me/rainbowkit"
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets"

const rpcUrl =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL?.trim() ||
  process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
  process.env.BASE_SEPOLIA_RPC_URL?.trim() ||
  "https://sepolia.base.org"

// Safe non-empty fallback projectId so RainbowKit initializes cleanly during local/CI builds
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ||
  process.env.WALLETCONNECT_PROJECT_ID?.trim() ||
  "3a8170812b534d0ff9d794f19a901d64"

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "Umunna Pot",
    projectId: walletConnectProjectId,
  }
)

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [baseSepolia.id]: http(rpcUrl),
  },
})
