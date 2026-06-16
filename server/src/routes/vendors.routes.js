import express from "express";
import Vendor from "../models/Vendor.js";
import VendorAssignment from "../models/VendorAssignment.js";
import { protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";

const router = express.Router();

router.use(requireDatabase);
router.use(protect);

router.get("/", authorize("admin", "staff"), async (_req, res, next) => {
  try {
    const vendors = await Vendor.find().populate("user", "name email role status").sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    next(error);
  }
});

router.post("/", authorize("admin"), async (req, res, next) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json(vendor);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", authorize("admin", "staff"), async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    res.json(vendor);
  } catch (error) {
    next(error);
  }
});

router.post("/assignments", authorize("admin", "staff"), async (req, res, next) => {
  try {
    const assignment = await VendorAssignment.create(req.body);
    const populated = await assignment.populate([
      { path: "event", select: "eventType eventDate location status" },
      { path: "vendor", select: "name serviceCategory email phone companyName" }
    ]);

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

router.get("/assignments", async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === "vendor") {
      const vendor = await Vendor.findOne({ user: req.user._id });
      query.vendor = vendor?._id || null;
    }

    const assignments = await VendorAssignment.find(query)
      .populate("event", "eventType eventDate location status")
      .populate("vendor", "name serviceCategory email phone companyName user")
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    next(error);
  }
});

router.patch("/assignments/:id", async (req, res, next) => {
  try {
    const assignment = await VendorAssignment.findById(req.params.id).populate("vendor");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    const isAssignedVendor = assignment.vendor?.user?.toString() === req.user._id.toString();
    if (req.user.role === "vendor" && !isAssignedVendor) {
      return res.status(403).json({ message: "You do not have access to this assignment." });
    }

    const allowed = req.user.role === "vendor" ? ["status", "notes"] : ["status", "notes", "quoteAmount", "dueDate"];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        assignment[key] = req.body[key];
      }
    });

    await assignment.save();
    await assignment.populate([
      { path: "event", select: "eventType eventDate location status" },
      { path: "vendor", select: "name serviceCategory email phone companyName user" }
    ]);

    res.json(assignment);
  } catch (error) {
    next(error);
  }
});

export default router;

