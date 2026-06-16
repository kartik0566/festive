import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    provider: {
      type: String,
      enum: ["razorpay", "demo"],
      default: "demo"
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    providerOrderId: String,
    providerPaymentId: String,
    providerSignature: String,
    method: String,
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created"
    },
    raw: mongoose.Schema.Types.Mixed
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ invoice: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;

