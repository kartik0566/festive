// Vercel serverless entry point — wraps the Express app
import app, { ensureDB } from "../src/app.js";

export default async function handler(req, res) {
  await ensureDB();
  return app(req, res);
}
