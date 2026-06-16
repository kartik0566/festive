import express from "express";
import EventRequest from "../models/EventRequest.js";
import Invoice from "../models/Invoice.js";
import Proposal from "../models/Proposal.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import VendorAssignment from "../models/VendorAssignment.js";
import { protect } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";

const router = express.Router();

router.use(requireDatabase);
router.use(protect);

router.get("/overview", async (req, res, next) => {
  try {
    if (req.user.role === "client") {
      const eventQuery = { client: req.user._id };
      const invoiceQuery = { client: req.user._id };
      const [events, proposals, invoices, reviews] = await Promise.all([
        EventRequest.find(eventQuery).sort({ eventDate: 1 }),
        Proposal.find({ client: req.user._id }).sort({ createdAt: -1 }),
        Invoice.find(invoiceQuery).sort({ createdAt: -1 }),
        Review.find({ client: req.user._id }).sort({ createdAt: -1 })
      ]);

      return res.json({
        stats: {
          events: events.length,
          proposals: proposals.length,
          invoices: invoices.length,
          balance: invoices.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.amountPaid, 0), 0)
        },
        events,
        proposals,
        invoices,
        reviews
      });
    }

    if (req.user.role === "vendor") {
      const vendor = await Vendor.findOne({ user: req.user._id });
      const assignments = vendor
        ? await VendorAssignment.find({ vendor: vendor._id })
            .populate("event", "eventType eventDate location status")
            .populate("vendor", "name serviceCategory")
        : [];

      return res.json({
        stats: {
          assignments: assignments.length,
          active: assignments.filter((item) => !["completed", "cancelled"].includes(item.status)).length,
          completed: assignments.filter((item) => item.status === "completed").length,
          quoteValue: assignments.reduce((sum, item) => sum + (item.quoteAmount || 0), 0)
        },
        assignments
      });
    }

    const eventQuery = req.user.role === "staff" ? { assignedStaff: req.user._id } : {};
    const [events, proposals, invoices, vendors, users, reviews, assignments] = await Promise.all([
      EventRequest.find(eventQuery).sort({ eventDate: 1 }).populate("assignedStaff", "name"),
      Proposal.find({}).sort({ createdAt: -1 }).limit(10),
      Invoice.find({}).sort({ createdAt: -1 }).limit(10),
      Vendor.countDocuments({ status: "active" }),
      User.countDocuments({ status: "active" }),
      Review.countDocuments({ status: "pending" }),
      VendorAssignment.find({}).populate("event", "eventType eventDate location").populate("vendor", "name")
    ]);

    res.json({
      stats: {
        events: events.length,
        confirmed: events.filter((event) => event.status === "confirmed").length,
        revenue: invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
        pendingReviews: reviews,
        vendors,
        users
      },
      events,
      proposals,
      invoices,
      assignments
    });
  } catch (error) {
    next(error);
  }
});

export default router;

