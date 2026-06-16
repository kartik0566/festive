import mongoose from "mongoose";

const vendorAssignmentSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRequest",
      required: true
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true
    },
    service: {
      type: String,
      required: true,
      trim: true
    },
    quoteAmount: {
      type: Number,
      default: 0
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ["assigned", "accepted", "in_progress", "completed", "cancelled"],
      default: "assigned"
    },
    notes: String
  },
  {
    timestamps: true
  }
);

vendorAssignmentSchema.index({ event: 1, vendor: 1 });

const VendorAssignment = mongoose.model("VendorAssignment", vendorAssignmentSchema);

export default VendorAssignment;

