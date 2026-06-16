import express from "express";
import EventRequest from "../models/EventRequest.js";
import Vendor from "../models/Vendor.js";
import VendorAssignment from "../models/VendorAssignment.js";
import { protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import { canAccessClientResource } from "../utils/access.js";
import { sendLeadNotification } from "../utils/mailer.js";

const router = express.Router();

router.use(requireDatabase);

const canSeeEvent = (user, event) => {
  if (canAccessClientResource(user, event)) {
    return true;
  }

  return false;
};

router.post("/public-inquiry", protect, async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      client: req.user.role === "client" ? req.user._id : req.body.client,
      name: req.body.name || req.user.name,
      email: req.body.email || req.user.email,
      phone: req.body.phone || req.user.phone
    };

    const event = await EventRequest.create(payload);
    await sendLeadNotification(event);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      client: req.user.role === "client" ? req.user._id : req.body.client,
      name: req.body.name || req.user.name,
      email: req.body.email || req.user.email,
      phone: req.body.phone || req.user.phone
    };

    const event = await EventRequest.create(payload);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.get("/", protect, async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === "client") {
      query.client = req.user._id;
    }

    if (req.user.role === "staff") {
      query.assignedStaff = req.user._id;
    }

    if (req.user.role === "vendor") {
      const vendor = await Vendor.findOne({ user: req.user._id });
      const assignments = vendor ? await VendorAssignment.find({ vendor: vendor._id }).select("event") : [];
      query._id = { $in: assignments.map((assignment) => assignment.event) };
    }

    const events = await EventRequest.find(query)
      .populate("client", "name email phone")
      .populate("assignedStaff", "name email")
      .sort({ eventDate: 1, createdAt: -1 });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", protect, async (req, res, next) => {
  try {
    const event = await EventRequest.findById(req.params.id)
      .populate("client", "name email phone")
      .populate("assignedStaff", "name email");

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (!canSeeEvent(req.user, event)) {
      return res.status(403).json({ message: "You do not have access to this event." });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", protect, authorize("admin", "staff"), async (req, res, next) => {
  try {
    const allowed = ["status", "assignedStaff", "eventDate", "budget", "guestCount", "location", "message"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    if (req.body.note) {
      updates.$push = {
        notes: {
          body: req.body.note,
          author: req.user._id
        }
      };
    }

    const event = await EventRequest.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate("client", "name email phone")
      .populate("assignedStaff", "name email");

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

export default router;
