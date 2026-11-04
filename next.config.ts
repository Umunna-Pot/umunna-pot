import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  turbopack: {
    resolveAlias: {
      "@x402/core/client": "./lib/emptyModule.ts",
      "@x402/evm": "./lib/emptyModule.ts",
      "@x402/evm/exact/client": "./lib/emptyModule.ts",
      "@x402/evm/upto/client": "./lib/emptyModule.ts",
      "@x402/svm/exact/client": "./lib/emptyModule.ts",
      "pino-pretty": "./lib/emptyModule.ts",
      "@react-native-async-storage/async-storage": "./lib/emptyModule.ts",
    },
  },
}

export default nextConfig
