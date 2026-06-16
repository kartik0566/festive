import crypto from "crypto";
import express from "express";
import Razorpay from "razorpay";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import { protect } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import { canAccessClientResource, idsMatch } from "../utils/access.js";
import { toAmount } from "../utils/money.js";

const router = express.Router();

router.use(requireDatabase);
router.use(protect);

const hasRazorpay = () => process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

router.post("/create-order", async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.body.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    if (!canAccessClientResource(req.user, invoice)) {
      return res.status(403).json({ message: "You do not have access to this invoice." });
    }

    const balance = Math.max(invoice.total - invoice.amountPaid, 0);
    const amount = Math.min(toAmount(req.body.amount || balance), balance);

    if (amount <= 0) {
      return res.status(400).json({ message: "Invoice is already paid." });
    }

    const currency = process.env.RAZORPAY_CURRENCY || "INR";

    if (!hasRazorpay()) {
      const orderId = `demo_order_${Date.now()}`;
      const payment = await Payment.create({
        invoice: invoice._id,
        client: invoice.client,
        provider: "demo",
        amount,
        currency,
        providerOrderId: orderId,
        status: "created"
      });

      return res.status(201).json({
        provider: "demo",
        keyId: "demo",
        orderId,
        amount,
        currency,
        paymentId: payment._id
      });
    }

    const order = await getRazorpay().orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceId: invoice._id.toString()
      }
    });

    const payment = await Payment.create({
      invoice: invoice._id,
      client: invoice.client,
      provider: "razorpay",
      amount,
      currency,
      providerOrderId: order.id,
      status: "created",
      raw: order
    });

    res.status(201).json({
      provider: "razorpay",
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount,
      currency,
      paymentId: payment._id
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const {
      invoiceId,
      paymentId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature
    } = req.body;

    const payment = await Payment.findById(paymentId);
    const invoice = await Invoice.findById(invoiceId);

    if (!payment || !invoice) {
      return res.status(404).json({ message: "Payment or invoice not found." });
    }

    if (!idsMatch(payment.invoice, invoice._id)) {
      return res.status(400).json({ message: "Payment does not belong to this invoice." });
    }

    if (!canAccessClientResource(req.user, invoice)) {
      return res.status(403).json({ message: "You do not have access to this invoice." });
    }

    let verified = payment.provider === "demo";

    if (payment.provider === "razorpay") {
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");
      verified = expected === razorpaySignature;
    }

    if (!verified) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ message: "Payment verification failed." });
    }

    payment.status = "paid";
    payment.providerOrderId = razorpayOrderId || payment.providerOrderId;
    payment.providerPaymentId = razorpayPaymentId || `demo_payment_${Date.now()}`;
    payment.providerSignature = razorpaySignature;
    await payment.save();

    invoice.amountPaid = Math.min(invoice.total, invoice.amountPaid + payment.amount);
    invoice.status = invoice.amountPaid >= invoice.total ? "paid" : "partially_paid";
    await invoice.save();

    res.json({ payment, invoice });
  } catch (error) {
    next(error);
  }
});

router.get("/invoice/:invoiceId", async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    if (!canAccessClientResource(req.user, invoice)) {
      return res.status(403).json({ message: "You do not have access to this invoice." });
    }

    const payments = await Payment.find({ invoice: req.params.invoiceId }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    next(error);
  }
});

export default router;
