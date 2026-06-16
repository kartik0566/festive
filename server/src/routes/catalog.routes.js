import express from "express";
import Service from "../models/Service.js";
import Package from "../models/Package.js";
import { protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";

const router = express.Router();

router.use(requireDatabase);

router.get("/services", async (_req, res, next) => {
  try {
    const services = await Service.find({ active: true }).sort({ createdAt: 1 });
    res.json(services);
  } catch (error) {
    next(error);
  }
});

router.post("/services", protect, authorize("admin"), async (req, res, next) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
});

router.patch("/services/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    res.json(service);
  } catch (error) {
    next(error);
  }
});

router.get("/packages", async (_req, res, next) => {
  try {
    const packages = await Package.find({ active: true }).sort({ price: 1 });
    res.json(packages);
  } catch (error) {
    next(error);
  }
});

router.post("/packages", protect, authorize("admin"), async (req, res, next) => {
  try {
    const created = await Package.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.patch("/packages/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const updated = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Package not found." });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;

