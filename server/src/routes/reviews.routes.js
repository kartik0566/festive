import express from "express";
import Review from "../models/Review.js";
import EventRequest from "../models/EventRequest.js";
import { protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import { canAccessClientResource } from "../utils/access.js";

const router = express.Router();

router.use(requireDatabase);

router.get("/", async (req, res, next) => {
  try {
    const reviews = await Review.find({ status: "approved" })
      .populate("event", "eventType eventDate")
      .populate("client", "name")
      .sort({ featured: -1, createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.get("/manage", protect, authorize("admin", "staff"), async (_req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate("event", "eventType eventDate")
      .populate("client", "name")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, async (req, res, next) => {
  try {
    const event = req.body.event ? await EventRequest.findById(req.body.event) : null;

    if (event && !canAccessClientResource(req.user, event)) {
      return res.status(403).json({ message: "You can review only your own event." });
    }

    const review = await Review.create({
      client: req.user._id,
      event: req.body.event,
      name: req.body.name || req.user.name,
      rating: req.body.rating,
      comment: req.body.comment
    });

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
        featured: req.body.featured
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
});

export default router;
