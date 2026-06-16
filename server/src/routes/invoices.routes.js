import express from "express";
import PDFDocument from "pdfkit";
import Invoice from "../models/Invoice.js";
import Proposal from "../models/Proposal.js";
import { protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import { canAccessClientResource } from "../utils/access.js";
import { getOrCreateInvoiceFromProposal } from "../utils/invoices.js";

const router = express.Router();

router.use(requireDatabase);
router.use(protect);

const invoiceQueryForRole = (user) => {
  if (user.role === "client") {
    return { client: user._id };
  }

  return {};
};

const ensureInvoiceAccess = (user, invoice) => {
  return canAccessClientResource(user, invoice);
};

router.post("/from-proposal/:proposalId", authorize("admin", "staff"), async (req, res, next) => {
  try {
    const body = req.body || {};
    const proposal = await Proposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found." });
    }

    const { invoice } = await getOrCreateInvoiceFromProposal(proposal, body);

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const invoices = await Invoice.find(invoiceQueryForRole(req.user))
      .populate("event", "eventType eventDate location")
      .populate("client", "name email phone")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("event", "eventType eventDate location")
      .populate("client", "name email phone");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    if (!ensureInvoiceAccess(req.user, invoice)) {
      return res.status(403).json({ message: "You do not have access to this invoice." });
    }

    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("event", "eventType eventDate location")
      .populate("client", "name email phone");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    if (!ensureInvoiceAccess(req.user, invoice)) {
      return res.status(403).json({ message: "You do not have access to this invoice." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 48 });
    doc.pipe(res);

    doc.fontSize(22).text("Festive Events", { continued: true }).fontSize(12).text("Invoice", { align: "right" });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice: ${invoice.invoiceNumber}`);
    doc.text(`Status: ${invoice.status}`);
    doc.text(`Due date: ${invoice.dueDate ? invoice.dueDate.toDateString() : "Not set"}`);
    doc.moveDown();
    doc.text(`Bill to: ${invoice.client?.name || "Client"}`);
    doc.text(`Email: ${invoice.client?.email || "N/A"}`);
    doc.text(`Event: ${invoice.event?.eventType || "Event"}`);
    doc.text(`Location: ${invoice.event?.location || "N/A"}`);
    doc.moveDown();

    invoice.items.forEach((item) => {
      doc.text(`${item.name} x ${item.quantity} - INR ${item.total.toLocaleString("en-IN")}`);
    });

    doc.moveDown();
    doc.text(`Subtotal: INR ${invoice.subtotal.toLocaleString("en-IN")}`, { align: "right" });
    doc.text(`Discount: INR ${invoice.discount.toLocaleString("en-IN")}`, { align: "right" });
    doc.text(`GST (${invoice.taxRate}%): INR ${invoice.taxAmount.toLocaleString("en-IN")}`, { align: "right" });
    doc.fontSize(16).text(`Total: INR ${invoice.total.toLocaleString("en-IN")}`, { align: "right" });
    doc.fontSize(12).text(`Paid: INR ${invoice.amountPaid.toLocaleString("en-IN")}`, { align: "right" });
    doc.text(`Balance: INR ${invoice.balance.toLocaleString("en-IN")}`, { align: "right" });
    doc.end();
  } catch (error) {
    next(error);
  }
});

export default router;
