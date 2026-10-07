import express from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import { protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import { signToken } from "../utils/token.js";
import {
  canSendMail,
  sendEmailVerificationOtp,
  sendLoginOtp,
  sendPasswordResetEmail,
  sendWelcomeEmail
} from "../utils/mailer.js";
import { generateOtp, hashOtp, isExpired, otpExpiry, verifyOtp } from "../utils/otp.js";
import { getFirebaseAdminAuth } from "../utils/firebaseAdmin.js";

const router = express.Router();

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  emailVerified: user.emailVerified,
  companyName: user.companyName
});

const devOtpPayload = (otp) => {
  if (process.env.NODE_ENV === "production" || canSendMail()) {
    return {};
  }

  return { devOtp: otp };
};

const issueEmailVerificationOtp = async (user) => {
  const otp = generateOtp();
  user.emailVerificationOtpHash = await hashOtp(otp);
  user.emailVerificationOtpExpiresAt = otpExpiry(10);
  await user.save();
  await sendEmailVerificationOtp({ to: user.email, name: user.name, otp });
  return otp;
};

const issueLoginOtp = async (user) => {
  const otp = generateOtp();
  user.loginOtpHash = await hashOtp(otp);
  user.loginOtpExpiresAt = otpExpiry(10);
  await user.save();
  await sendLoginOtp({ to: user.email, name: user.name, otp });
  return otp;
};

router.use(requireDatabase);

const passwordResetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many password reset requests. Please try again in a few minutes." }
});

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const role = "client";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role,
      emailVerified: false
    });

    const otp = await issueEmailVerificationOtp(user);

    res.status(201).json({
      message: "Account created. Verify your email with the OTP sent to your inbox.",
      requiresEmailVerification: true,
      email: user.email,
      user: publicUser(user),
      ...devOtpPayload(otp)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/send-verification-otp", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (user.emailVerified) {
      return res.json({ message: "Email is already verified.", emailVerified: true });
    }

    const otp = await issueEmailVerificationOtp(user);
    res.json({
      message: "Verification OTP sent.",
      requiresEmailVerification: true,
      email: user.email,
      ...devOtpPayload(otp)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (user.emailVerified) {
      return res.json({ message: "Email is already verified.", emailVerified: true });
    }

    if (isExpired(user.emailVerificationOtpExpiresAt)) {
      return res.status(400).json({ message: "Verification OTP expired. Request a new OTP." });
    }

    const matches = await verifyOtp(otp, user.emailVerificationOtpHash);
    if (!matches) {
      return res.status(400).json({ message: "Invalid verification OTP." });
    }

    user.emailVerified = true;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationOtpExpiresAt = undefined;
    await user.save();
    await sendWelcomeEmail(user);

    res.json({
      message: "Email verified. You can now login.",
      emailVerified: true
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.status !== "active" || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.emailVerified) {
      const otp = await issueEmailVerificationOtp(user);
      return res.status(202).json({
        message: "Verify your email before login. A verification OTP has been sent.",
        requiresEmailVerification: true,
        email: user.email,
        ...devOtpPayload(otp)
      });
    }

    const otp = await issueLoginOtp(user);

    res.status(202).json({
      message: "Login OTP sent to your email.",
      requiresOtp: true,
      email: user.email,
      ...devOtpPayload(otp)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/firebase-login", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Firebase sign-in token is required." });
    }

    let decoded;
    try {
      decoded = await getFirebaseAdminAuth().verifyIdToken(idToken, true);
    } catch (error) {
      if (error.code === "FIREBASE_NOT_CONFIGURED") {
        return res.status(503).json({ message: error.message });
      }
      if (String(error.code || "").startsWith("auth/")) {
        return res.status(401).json({ message: "Your social sign-in expired. Please try again." });
      }
      throw error;
    }

    const provider = decoded.firebase?.sign_in_provider;
    if (!["google.com", "facebook.com"].includes(provider)) {
      return res.status(403).json({ message: "Please continue with Google or Facebook." });
    }

    const email = decoded.email?.trim().toLowerCase();
    if (!email || !decoded.email_verified) {
      return res.status(403).json({ message: "Use a verified email address with your Google or Facebook account." });
    }

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.firebaseUid = decoded.uid;
        user.emailVerified = true;
        await user.save();
      } else {
        const randomPassword = crypto.randomBytes(48).toString("hex");
        user = await User.create({
          name: decoded.name?.trim() || email.split("@")[0],
          email,
          passwordHash: await bcrypt.hash(randomPassword, 12),
          firebaseUid: decoded.uid,
          role: "client",
          emailVerified: true
        });
      }
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "This account is currently unavailable. Contact the Festive Events team." });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/password/forgot", passwordResetLimiter, async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Enter the email address for your account." });
    }

    const user = await User.findOne({ email, passwordHash: { $type: "string", $ne: "" } });
    if (!user) {
      return res.json({ message: "If an account matches this email, a password reset link will be sent shortly." });
    }

    if (!canSendMail()) {
      return res.status(503).json({ message: "Password reset email is not configured. Ask the site administrator to set up Resend email." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const baseUrl = (process.env.CLIENT_URL || "http://localhost:5180").replace(/\/$/, "");
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`;

    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    } catch (error) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetTokenExpiresAt = undefined;
      await user.save();
      console.error("Password reset email could not be delivered:", error.code || error.message);
      return res.status(503).json({ message: "Password reset email could not be delivered. Check the email provider settings and try again." });
    }

    res.json({ message: "If an account matches this email, a password reset link will be sent shortly." });
  } catch (error) {
    next(error);
  }
});

router.post("/password/reset", passwordResetLimiter, async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { token, password } = req.body;
    if (!email || !token || typeof password !== "string") {
      return res.status(400).json({ message: "This password reset link is invalid or has expired. Request a new link." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Choose a password with at least 8 characters." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email,
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired. Request a new link." });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    await user.save();

    res.json({ message: "Your password has been changed. You can now log in." });
  } catch (error) {
    next(error);
  }
});

router.post("/login/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "Invalid login request." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: "Email must be verified first." });
    }

    if (isExpired(user.loginOtpExpiresAt)) {
      return res.status(400).json({ message: "Login OTP expired. Please login again." });
    }

    const matches = await verifyOtp(otp, user.loginOtpHash);
    if (!matches) {
      return res.status(400).json({ message: "Invalid login OTP." });
    }

    user.loginOtpHash = undefined;
    user.loginOtpExpiresAt = undefined;
    await user.save();

    res.json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/profile", protect, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.get("/users", protect, authorize("admin"), async (_req, res, next) => {
  try {
    const users = await User.find()
      .select("-passwordHash -emailVerificationOtpHash -loginOtpHash")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post("/users", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { name, email, phone, password, role, companyName, serviceCategory } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, passwordHash, role, companyName, emailVerified: true });

    if (role === "vendor") {
      await Vendor.create({
        user: user._id,
        name,
        email,
        phone,
        companyName,
        serviceCategory: serviceCategory || "General"
      });
    }

    await sendWelcomeEmail(user);

    res.status(201).json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/status", protect, authorize("admin"), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select(
      "-passwordHash -emailVerificationOtpHash -loginOtpHash"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
