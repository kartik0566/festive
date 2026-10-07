// Local development server — not used by Vercel
import app, { ensureDB } from "./app.js";

const port = process.env.PORT || 5000;

const start = async () => {
  await ensureDB();

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
