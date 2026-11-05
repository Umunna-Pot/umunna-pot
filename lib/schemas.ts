import { z } from "zod"

export const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x EVM address")

export const txHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Must be a valid 32-byte 0x transaction hash")

export const depositNetworkEnum = z.enum([
  "base",
  "bep20",
  "trc20",
  "erc20",
  "bitcoin",
  "solana",
  "ripple",
  "litecoin",
  "dogecoin",
])

export const rasFiatRateItemSchema = z.object({
  symbol: z.string(),
  title: z.string(),
  rate: z.coerce.number(),
  icon: z.string().default(""),
  min_tradeable: z.coerce.number().default(0),
  max_tradeable: z.coerce.number().default(0),
  min_withdraw: z.coerce.number().default(0),
  max_withdraw: z.coerce.number().default(0),
})

export const rasRatesResponseSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
  data: z.array(rasFiatRateItemSchema),
})

export const rasPriceItemSchema = z.object({
  price: z.coerce.number(),
  change: z.coerce.number().default(0),
})

export const rasPricesResponseSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
  data: z.record(z.string(), rasPriceItemSchema),
})

export const rasBalancesResponseSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
  data: z.object({
    balance: z
      .object({
        email: z.string().optional(),
        usdt: z.coerce.number().default(0),
        btc: z.coerce.number().default(0),
        eth: z.coerce.number().default(0),
        trx: z.coerce.number().default(0),
        sol: z.coerce.number().default(0),
        bnb: z.coerce.number().default(0),
        xrp: z.coerce.number().default(0),
      })
      .passthrough(),
  }),
})

export const createPaymentLinkInputSchema = z.object({
  communityId: z.coerce.number().int().nonnegative(),
  amountNgn: z.coerce.number().positive("Amount in NGN must be positive"),
  contributorName: z.string().min(2).max(80),
  contributorEmail: z.string().email(),
  contributorPhone: z.string().min(7).max(20).default("08000000000"),
})

export const generateDepositWalletInputSchema = z.object({
  network: depositNetworkEnum,
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phoneNumber: z.string().min(7),
  }),
})

export const roqquCheckoutInputSchema = z.object({
  communityId: z.coerce.number().int().nonnegative(),
  rail: z.enum(["payment_link", "crypto_wallet"]).default("payment_link"),
  amountNgn: z.coerce
    .number()
    .min(500, "Minimum Roqqu checkout is ₦500")
    .max(50_000_000),
  network: depositNetworkEnum.default("trc20"),
  contributorName: z.string().trim().min(2, "Contributor name is required").max(80),
  contributorEmail: z.string().trim().email("Valid contributor email is required"),
  contributorPhone: z.string().trim().min(7).max(20).default("08012345678"),
})

export const roqquEncryptedWebhookSchema = z.object({
  hash: z.string().min(2),
})

export const roqquDemoWebhookSchema = z.object({
  demoSimulate: z.literal(true),
  paymentReference: z.string().min(3).max(40),
  communityId: z.coerce.number().int().nonnegative(),
  amountNgn: z.coerce.number().positive(),
  contributorName: z.string().trim().min(2).max(80),
  depositedToken: z.string().default("ngn"),
  depositedTokenAmount: z.coerce.number().nonnegative().default(0),
})

export const roqquSettleInputSchema = z.object({
  payoutId: z.coerce.number().int().nonnegative(),
  communityId: z.coerce.number().int().nonnegative(),
  txHash: txHashSchema,
  amountUsdc: z.coerce.number().positive(),
  recipient: z.string().trim().min(3).max(120),
  settlementRail: z.string().trim().min(2).max(80),
  destinationNetwork: z.string().trim().default("trc20"),
})

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkInputSchema>
export type GenerateDepositWalletInput = z.infer<
  typeof generateDepositWalletInputSchema
>
export type RoqquCheckoutInput = z.infer<typeof roqquCheckoutInputSchema>
export type RoqquDemoWebhookInput = z.infer<typeof roqquDemoWebhookSchema>
export type RoqquSettleInput = z.infer<typeof roqquSettleInputSchema>

export const verifyDripVaultInputSchema = z.object({
  txHash: txHashSchema,
})

export type VerifyDripVaultInput = z.infer<typeof verifyDripVaultInputSchema>
