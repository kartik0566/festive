import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "client", "staff", "vendor"],
      default: "client"
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active"
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationOtpHash: String,
    emailVerificationOtpExpiresAt: Date,
    loginOtpHash: String,
    loginOtpExpiresAt: Date,
    companyName: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
