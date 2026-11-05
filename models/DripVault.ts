


import mongoose, { Schema, Document } from "mongoose"

export interface IDripVault extends Document {
  onChainVaultId: number
  freelancerAddress: string
  beneficiaryAddress: string
  guardianAddress: string
  totalLockedUsdc: number
  installmentAmountUsdc: number
  intervalSeconds: number
  claimedUsdc: number
  remainingUsdc: number
  nextReleaseAt: Date
  status: "streaming" | "completed" | "emergency_unlocked"
  createdAt: Date
  updatedAt: Date
}

const DripVaultSchema = new Schema<IDripVault>(
  {
    onChainVaultId: { type: Number, required: true, index: true },
    freelancerAddress: { type: String, required: true, lowercase: true, trim: true },
    beneficiaryAddress: { type: String, required: true, lowercase: true, trim: true },
    guardianAddress: { type: String, required: true, lowercase: true, trim: true },
    totalLockedUsdc: { type: Number, required: true },
    installmentAmountUsdc: { type: Number, required: true },
    intervalSeconds: { type: Number, required: true, default: 604800 },
    claimedUsdc: { type: Number, default: 0 },
    remainingUsdc: { type: Number, required: true },
    nextReleaseAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["streaming", "completed", "emergency_unlocked"],
      default: "streaming",
      index: true,
    },
  },
  { timestamps: true }
)

DripVaultSchema.index({ freelancerAddress: 1, status: 1, createdAt: -1 })
DripVaultSchema.index({ beneficiaryAddress: 1, status: 1, createdAt: -1 })
DripVaultSchema.index({ guardianAddress: 1, status: 1, createdAt: -1 })

export default mongoose.models.DripVault ||
  mongoose.model<IDripVault>("DripVault", DripVaultSchema)
