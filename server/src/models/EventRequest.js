import mongoose from "mongoose";

const eventRequestSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    eventType: {
      type: String,
      required: true,
      trim: true
    },
    eventDate: {
      type: Date,
      required: true
    },
    budget: {
      type: String,
      trim: true
    },
    guestCount: {
      type: Number,
      min: 0,
      default: 0
    },
    location: {
      type: String,
      trim: true
    },
    message: {
      type: String,
      trim: true
    },
    selectedPackage: {
      packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package"
      },
      name: {
        type: String,
        trim: true
      },
      price: {
        type: Number,
        default: 0
      },
      description: {
        type: String,
        trim: true
      }
    },
    status: {
      type: String,
      enum: ["new", "reviewing", "proposal_sent", "confirmed", "in_progress", "completed", "cancelled"],
      default: "new"
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    notes: [
      {
        body: String,
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

eventRequestSchema.index({ eventDate: 1, status: 1 });
eventRequestSchema.index({ client: 1, createdAt: -1 });

const EventRequest = mongoose.model("EventRequest", eventRequestSchema);

export default EventRequest;
