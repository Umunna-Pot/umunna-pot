import mongoose, { Schema, Document, Types } from "mongoose"

export interface IContribution extends Document {
  communityId: Types.ObjectId
  onChainPotId: number
  contributorName: string
  contributorEmail: string
  contributorPhone?: string
  contributorAddress?: string
  amountNgn: number
  amountUsdc: number
  paymentMethod: "roqqu_fiat" | "roqqu_crypto" | "web3_direct" | "crypto_wallet"
  paymentReference: string
  status: "pending" | "confirmed" | "failed"
  txHash?: string
  blockNumber?: number
  createdAt: Date
  updatedAt: Date
}

const ContributionSchema = new Schema<IContribution>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: "Community", index: true },
    onChainPotId: { type: Number, required: true, index: true },
    contributorName: { type: String, required: true, trim: true },
    contributorEmail: { type: String, required: true, trim: true, lowercase: true },
    contributorPhone: { type: String, trim: true },
    contributorAddress: { type: String, lowercase: true, trim: true },
    amountNgn: { type: Number, required: true },
    amountUsdc: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["roqqu_fiat", "roqqu_crypto", "web3_direct", "crypto_wallet"],
      default: "roqqu_fiat",
    },
    paymentReference: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
      index: true,
    },
    txHash: { type: String, trim: true },
    blockNumber: { type: Number },
  },
  { timestamps: true }
)

ContributionSchema.index({ onChainPotId: 1, status: 1, createdAt: -1 })
ContributionSchema.index({ contributorEmail: 1, createdAt: -1 })

export default mongoose.models.Contribution ||
  mongoose.model<IContribution>("Contribution", ContributionSchema)

