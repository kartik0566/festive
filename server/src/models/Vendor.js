import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    companyName: {
      type: String,
      trim: true
    },
    serviceCategory: {
      type: String,
      required: true,
      trim: true
    },
    rating: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    notes: String
  },
  {
    timestamps: true
  }
);

vendorSchema.index({ serviceCategory: 1, status: 1 });

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;

