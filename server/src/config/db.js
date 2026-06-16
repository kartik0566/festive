import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    global.__dbConnected = false;
    console.warn("MONGO_URI is missing. API is running, but database-backed routes will fail until configured.");
    return;
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 7000
  });

  global.__dbConnected = true;
  console.log("MongoDB connected");
};

