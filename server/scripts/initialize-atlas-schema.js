import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import path from "node:path";
import EventRequest from "../src/models/EventRequest.js";
import Invoice from "../src/models/Invoice.js";
import Package from "../src/models/Package.js";
import Payment from "../src/models/Payment.js";
import Proposal from "../src/models/Proposal.js";
import Review from "../src/models/Review.js";
import Service from "../src/models/Service.js";
import User from "../src/models/User.js";
import Vendor from "../src/models/Vendor.js";
import VendorAssignment from "../src/models/VendorAssignment.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../.env") });
const dnsServers = (process.env.MONGO_DNS_SERVERS || "").split(",").map((server) => server.trim()).filter(Boolean);
if (dnsServers.length) {
  dns.setServers(dnsServers);
}

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("MONGO_URI is missing from server/.env");
}

const models = [EventRequest, Invoice, Package, Payment, Proposal, Review, Service, User, Vendor, VendorAssignment];
mongoose.set("autoIndex", false);

try {
  await mongoose.connect(uri, { dbName: "festive", serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;

  for (const model of models) {
    const collectionName = model.collection.collectionName;
    const exists = await db.listCollections({ name: collectionName }, { nameOnly: true }).hasNext();
    if (!exists) {
      await db.createCollection(collectionName);
    }
    await model.createIndexes();
    console.log(`Initialized ${collectionName}`);
  }

  console.log("Atlas schema initialization completed for database festive. No application documents were seeded.");
} finally {
  await mongoose.disconnect();
}
