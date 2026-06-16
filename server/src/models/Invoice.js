import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true
    },
    proposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proposal"
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRequest",
      required: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    items: [invoiceItemSchema],
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
    amountPaid: {
      type: Number,
      default: 0
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ["draft", "issued", "partially_paid", "paid", "cancelled"],
      default: "issued"
    },
    notes: String
  },
  {
    timestamps: true
  }
);

invoiceSchema.virtual("balance").get(function balance() {
  return Math.max((this.total || 0) - (this.amountPaid || 0), 0);
});

invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;

