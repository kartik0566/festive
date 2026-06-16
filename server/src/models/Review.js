import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRequest"
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ status: 1, featured: -1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;

