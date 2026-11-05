import mongoose, { Schema, Document } from "mongoose"

export interface IDripVault extends Document {
  chainId: number
  contractAddress: string
  onChainVaultId: string // BigInt stored as string
  transactionHash: string
  eventLogIndex: number
  blockNumber: number
  blockHash: string
  funderAddress: string
  freelancerAddress: string // Normalized alias for backwards compatibility
  beneficiaryAddress: string
  guardianAddress: string
  totalLockedBaseUnits: string // 6 decimal base units, e.g. "1000000" = 1 USDC
  installmentAmountBaseUnits: string
  claimedBaseUnits: string
  remainingBaseUnits: string
  intervalSeconds: number
  nextReleaseAt: Date
  releasedCount: number
  active: boolean
  earlyExitRequested: boolean
  verificationStatus: "verified" | "pending" | "rejected"
  status: "streaming" | "completed" | "emergency_unlocked"
  createdAt: Date
  updatedAt: Date
}

const DripVaultSchema = new Schema<IDripVault>(
  {
    chainId: { type: Number, required: true, default: 84532, index: true },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    onChainVaultId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    transactionHash: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    eventLogIndex: { type: Number, required: true },
    blockNumber: { type: Number, required: true },
    blockHash: { type: String, required: true, lowercase: true, trim: true },
    funderAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    freelancerAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    beneficiaryAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    guardianAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    totalLockedBaseUnits: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d+$/.test(v) && BigInt(v) > 0n,
        message: "totalLockedBaseUnits must be a positive integer base unit string",
      },
    },
    installmentAmountBaseUnits: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d+$/.test(v) && BigInt(v) > 0n,
        message:
          "installmentAmountBaseUnits must be a positive integer base unit string",
      },
    },
    claimedBaseUnits: {
      type: String,
      required: true,
      default: "0",
      validate: {
        validator: (v: string) => /^\d+$/.test(v) && BigInt(v) >= 0n,
        message: "claimedBaseUnits must be a non-negative integer base unit string",
      },
    },
    remainingBaseUnits: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d+$/.test(v) && BigInt(v) >= 0n,
        message:
          "remainingBaseUnits must be a non-negative integer base unit string",
      },
    },
    intervalSeconds: { type: Number, required: true, min: 30 },
    nextReleaseAt: { type: Date, required: true },
    releasedCount: { type: Number, required: true, default: 0, min: 0 },
    active: { type: Boolean, required: true, default: true },
    earlyExitRequested: { type: Boolean, required: true, default: false },
    verificationStatus: {
      type: String,
      enum: ["verified", "pending", "rejected"],
      default: "verified",
      index: true,
    },
    status: {
      type: String,
      enum: ["streaming", "completed", "emergency_unlocked"],
      default: "streaming",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v
        return ret
      },
    },
  }
)

// Primary unique index on chain identity: one record per vaultId per contract per chain
DripVaultSchema.index(
  { chainId: 1, contractAddress: 1, onChainVaultId: 1 },
  { unique: true }
)

// Unique index on transaction identity: prevents duplicate log ingestion
DripVaultSchema.index(
  { transactionHash: 1, eventLogIndex: 1 },
  { unique: true }
)

// Composite query indexes for participant dashboards
DripVaultSchema.index({ funderAddress: 1, status: 1, createdAt: -1 })
DripVaultSchema.index({ beneficiaryAddress: 1, status: 1, createdAt: -1 })
DripVaultSchema.index({ guardianAddress: 1, status: 1, createdAt: -1 })

export default mongoose.models.DripVault ||
  mongoose.model<IDripVault>("DripVault", DripVaultSchema)
