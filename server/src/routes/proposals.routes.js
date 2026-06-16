import express from "express";
import Proposal from "../models/Proposal.js";
import EventRequest from "../models/EventRequest.js";
import { protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import { canAccessClientResource } from "../utils/access.js";
import { getOrCreateInvoiceFromProposal } from "../utils/invoices.js";
import { calculateTotals } from "../utils/money.js";
import { sendInvoiceEmail, sendProposalEmail } from "../utils/mailer.js";

const router = express.Router();

router.use(requireDatabase);
router.use(protect);

const proposalQueryForRole = (user) => {
  if (user.role === "client") {
    return { client: user._id };
  }

  return {};
};

router.post("/", authorize("admin", "staff"), async (req, res, next) => {
  try {
    const event = await EventRequest.findById(req.body.event);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const totals = calculateTotals({
      items: req.body.items,
      taxRate: req.body.taxRate,
      discount: req.body.discount
    });

    const proposal = await Proposal.create({
      event: event._id,
      client: event.client || req.body.client,
      title: req.body.title,
      summary: req.body.summary,
      items: totals.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      terms: req.body.terms,
      validUntil: req.body.validUntil,
      status: req.body.status || "sent",
      createdBy: req.user._id
    });

    event.status = "proposal_sent";
    await event.save();

    await sendProposalEmail({
      to: event.email,
      name: event.name,
      proposal
    });

    res.status(201).json(proposal);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const proposals = await Proposal.find(proposalQueryForRole(req.user))
      .populate("event", "eventType eventDate location status")
      .populate("client", "name email phone")
      .sort({ createdAt: -1 });

    res.json(proposals);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate("event")
      .populate("client", "name email phone");

    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found." });
    }

    if (!canAccessClientResource(req.user, proposal)) {
      return res.status(403).json({ message: "You do not have access to this proposal." });
    }

    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", authorize("admin", "staff"), async (req, res, next) => {
  try {
    const updates = { ...req.body };

    if (updates.items) {
      const totals = calculateTotals({
        items: updates.items,
        taxRate: updates.taxRate,
        discount: updates.discount
      });
      Object.assign(updates, totals);
    }

    const proposal = await Proposal.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found." });
    }

    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/approve", async (req, res, next) => {
  try {
    const body = req.body || {};
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found." });
    }

    if (!canAccessClientResource(req.user, proposal)) {
      return res.status(403).json({ message: "You do not have access to this proposal." });
    }

    proposal.status = "approved";
    proposal.approvedAt = new Date();
    await proposal.save();

    await EventRequest.findByIdAndUpdate(proposal.event, { status: "confirmed" });

    const { invoice, alreadyIssued } = await getOrCreateInvoiceFromProposal(proposal, body);

    if (!alreadyIssued) {
      const event = await EventRequest.findById(proposal.event);
      await sendInvoiceEmail({
        to: event?.email,
        name: event?.name,
        invoice
      });
    }

    res.json({ proposal, invoice });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/reject", async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found." });
    }

    if (!canAccessClientResource(req.user, proposal)) {
      return res.status(403).json({ message: "You do not have access to this proposal." });
    }

    proposal.status = "rejected";
    proposal.rejectedAt = new Date();
    await proposal.save();

    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

export default router;
