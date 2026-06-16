import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication token is required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-me");
    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "User is not authorized." });
    }

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission for this action." });
    }

    next();
  };
};

