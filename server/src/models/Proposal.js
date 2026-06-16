import mongoose from "mongoose";

const proposalItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const proposalSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRequest",
      required: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      trim: true
    },
    items: [proposalItemSchema],
    subtotal: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 18
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    },
    terms: {
      type: String,
      trim: true
    },
    validUntil: Date,
    status: {
      type: String,
      enum: ["draft", "sent", "approved", "rejected"],
      default: "sent"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: Date,
    rejectedAt: Date
  },
  {
    timestamps: true
  }
);

proposalSchema.index({ client: 1, createdAt: -1 });
proposalSchema.index({ event: 1 });

const Proposal = mongoose.model("Proposal", proposalSchema);

export default Proposal;

