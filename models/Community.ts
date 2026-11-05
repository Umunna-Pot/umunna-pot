import mongoose, { Schema, Document } from "mongoose"

export interface ICommunity extends Document {
  onChainPotId: number
  name: string
  description: string
  targetAmountNgn: number
  targetAmountUsdc: number
  currentBalanceUsdc: number
  quorumThreshold: number
  signers: string[]
  creatorAddress: string
  category: "alumni" | "welfare" | "family" | "project" | "general"
  status: "active" | "archived" | "completed"
  createdAt: Date
  updatedAt: Date
}

const CommunitySchema = new Schema<ICommunity>(
  {
    onChainPotId: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    targetAmountNgn: { type: Number, required: true, default: 0 },
    targetAmountUsdc: { type: Number, required: true, default: 0 },
    currentBalanceUsdc: { type: Number, default: 0 },
    quorumThreshold: { type: Number, required: true, default: 2 },
    signers: [{ type: String, lowercase: true, trim: true }],
    creatorAddress: { type: String, required: true, lowercase: true, trim: true },
    category: {
      type: String,
      enum: ["alumni", "welfare", "family", "project", "general"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["active", "archived", "completed"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
)

CommunitySchema.index({ status: 1, createdAt: -1 })
CommunitySchema.index({ signers: 1 })

export default mongoose.models.Community ||
  mongoose.model<ICommunity>("Community", CommunitySchema)

