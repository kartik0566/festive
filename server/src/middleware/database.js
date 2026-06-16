export const requireDatabase = (_req, res, next) => {
  if (!global.__dbConnected) {
    return res.status(503).json({
      message: "Database is not connected. Add MONGO_URI in server/.env and restart the server."
    });
  }

  next();
};

