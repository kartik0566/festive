import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "./config/db.js";
import { seedDefaults } from "./config/seed.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import eventRoutes from "./routes/events.routes.js";
import proposalRoutes from "./routes/proposals.routes.js";
import invoiceRoutes from "./routes/invoices.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import vendorRoutes from "./routes/vendors.routes.js";
import reviewRoutes from "./routes/reviews.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { getChatProviderStatus } from "./utils/chat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(projectRoot, ".env"), override: false });
dotenv.config({ path: path.join(projectRoot, "server", ".env"), override: false });

if (process.env.RENDER_EXTERNAL_HOSTNAME) {
  process.env.NODE_ENV = "production";
}

const app = express();

const renderOrigin = process.env.RENDER_EXTERNAL_HOSTNAME
  ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
  : undefined;
const allowedOrigins = [process.env.CLIENT_URL, renderOrigin, "http://localhost:5173", "http://localhost:5180"].filter(Boolean);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-zA-Z0-9-_.]+\.vercel\.app$/.test(origin)) return true;
  return false;
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"]
      }
    }
  })
);
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 400,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: global.__dbConnected ? "connected" : "not_connected",
    payments: process.env.RAZORPAY_KEY_ID ? "razorpay" : "demo",
    ai: getChatProviderStatus().provider
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/catalog", catalogRoutes);

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get(/^\/(?!api).*/, (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

// Connect DB once per cold start (cached for serverless warm reuse)
let dbReady = false;
export const ensureDB = async () => {
  if (dbReady) return;
  await connectDB();
  if (global.__dbConnected) {
    await seedDefaults();
  }
  dbReady = true;
};

export default app;
