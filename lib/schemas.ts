import { z } from "zod"

export const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x EVM address")

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
  network: z.enum([
    "base",
    "bep20",
    "trc20",
    "erc20",
    "bitcoin",
    "solana",
    "ripple",
    "litecoin",
    "dogecoin",
  ]),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phoneNumber: z.string().min(7),
  }),
})

export const roqquEncryptedWebhookSchema = z.object({
  hash: z.string().min(2),
})

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkInputSchema>
export type GenerateDepositWalletInput = z.infer<
  typeof generateDepositWalletInputSchema
>

