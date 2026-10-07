import mongoose from "mongoose";
import dns from "node:dns";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async () => {
  const fallbackUri = process.env.NODE_ENV === "production" ? "" : "mongodb://127.0.0.1:27017/festive";
  const uri = process.env.MONGO_URI || fallbackUri;
  const dbName = process.env.MONGO_DB_NAME || "festive";

  if (!uri) {
    global.__dbConnected = false;
    console.warn("MONGO_URI is missing. API is running, but database-backed routes will fail until configured.");
    return;
  }

  mongoose.set("strictQuery", true);
  const dnsServers = (process.env.MONGO_DNS_SERVERS || "").split(",").map((server) => server.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== "production" && dnsServers.length) {
    dns.setServers(dnsServers);
  }

  const maxAttempts = Number(process.env.DB_CONNECT_RETRIES || 15);
  const retryDelayMs = Number(process.env.DB_CONNECT_RETRY_MS || 1500);
  const timeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: timeoutMs
      });

      global.__dbConnected = true;
      console.log("MongoDB connected");
      return;
    } catch (error) {
      global.__dbConnected = false;

      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(
        `MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${retryDelayMs}ms...`
      );
      await delay(retryDelayMs);
    }
  }
};
