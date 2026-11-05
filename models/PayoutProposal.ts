import mongoose, { Schema, Document, Types } from "mongoose"

export interface IPayoutProposal extends Document {
  communityId: Types.ObjectId
  onChainPotId: number
  onChainProposalId: number
  title: string
  description?: string
  recipientType: "bank_account" | "crypto_address"
  recipientBank?: string
  recipientAccountNumber?: string
  recipientAccountName?: string
  recipientAddress?: string
  amountNgn: number
  amountUsdc: number
  approvals: string[]
  status: "proposed" | "approved" | "executed" | "rejected"
  executionTxHash?: string
  createdAt: Date
  updatedAt: Date
}

const PayoutProposalSchema = new Schema<IPayoutProposal>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: "Community", index: true },
    onChainPotId: { type: Number, required: true, index: true },
    onChainProposalId: { type: Number, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    recipientType: {
      type: String,
      enum: ["bank_account", "crypto_address"],
      default: "bank_account",
    },
    recipientBank: { type: String, trim: true },
    recipientAccountNumber: { type: String, trim: true },
    recipientAccountName: { type: String, trim: true },
    recipientAddress: { type: String, lowercase: true, trim: true },
    amountNgn: { type: Number, required: true },
    amountUsdc: { type: Number, required: true },
    approvals: [{ type: String, lowercase: true, trim: true }],
    status: {
      type: String,
      enum: ["proposed", "approved", "executed", "rejected"],
      default: "proposed",
      index: true,
    },
    executionTxHash: { type: String, trim: true },
  },
  { timestamps: true }
)

PayoutProposalSchema.index({ onChainPotId: 1, status: 1, createdAt: -1 })

export default mongoose.models.PayoutProposal ||
  mongoose.model<IPayoutProposal>("PayoutProposal", PayoutProposalSchema)

