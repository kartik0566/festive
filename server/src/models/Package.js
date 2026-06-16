import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    price: {
      type: Number,
      default: 0
    },
    features: [String],
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Package = mongoose.model("Package", packageSchema);

export default Package;

