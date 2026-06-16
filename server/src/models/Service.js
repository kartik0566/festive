import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    basePrice: {
      type: Number,
      default: 0
    },
    imageUrl: String,
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;

