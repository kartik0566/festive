import express from "express";
import EventRequest from "../models/EventRequest.js";
import { optionalProtect, protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import { createProposalDraft } from "../utils/ai.js";

const router = express.Router();

const unrelatedQuestionReply =
  "I can help with Festive event planning, wedding planning, corporate events, private celebrations, concerts & festivals, packages, budgeting, bookings, proposals, and event support. Tell me your event type, date, guest count, location, and budget so I can guide you better.";

const isFestiveRelatedQuestion = (input) => {
  const text = String(input || "").toLowerCase();
  if (!text.trim()) {
    return false;
  }

  const festiveKeywords = [
    "event",
    "wedding",
    "corporate",
    "private celebration",
    "concert",
    "festival",
    "package",
    "proposal",
    "invoice",
    "payment",
    "budget",
    "booking",
    "quote",
    "vendor",
    "venue",
    "guest",
    "planner",
    "decor",
    "catering",
    "stage",
    "logistics",
    "celebration",
    "planning"
  ];

  return festiveKeywords.some((keyword) => text.includes(keyword));
};

router.use(requireDatabase);

router.post("/chat", optionalProtect, async (req, res, next) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Message is required." });
    }

    let bookingContext = "The customer is not signed in, so no booking history is available.";
    if (req.user?.role === "client") {
      const bookings = await EventRequest.find({ client: req.user._id })
        .select("eventType eventDate location status selectedPackage budget guestCount createdAt")
        .sort({ eventDate: -1, createdAt: -1 })
        .limit(10)
        .lean();

      bookingContext = bookings.length
        ? `The signed-in customer's previous bookings are:\n${bookings
            .map(
              (booking, index) =>
                `${index + 1}. ${booking.eventType || "Event"} on ${booking.eventDate ? new Date(booking.eventDate).toDateString() : "date not set"}; status: ${booking.status}; location: ${booking.location || "not set"}; package: ${booking.selectedPackage?.name || "custom"}; guests: ${booking.guestCount || "not set"}; budget: ${booking.budget || "not set"}`
            )
            .join("\n")}`
        : "The signed-in customer has no previous bookings.";
    }

    const result = await fetch(`${process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || process.env.AI_MODEL || process.env.LLAMA_MODEL || "llama3.2:latest",
        stream: false,
        messages: [
          {
            role: "system",
            content:
              `You are Festive Events’ customer-service representative. Help customers with questions about event planning, services, packages, budgeting, booking steps, proposals, invoices, payments, and their previous bookings. Be warm, professional, concise, and practical. Festive offers Wedding Planning, Corporate Events, Private Celebrations, and Concerts & Festivals. Packages are Essential, Signature, and Luxury. Treat displayed prices as indicative only; never promise availability, a final price, a confirmed booking, a refund, or a delivery time unless the customer provides official details or the application explicitly confirms it. Do not invent policies, contact details, discounts, or package features. Use the booking context below to answer questions about the signed-in customer's bookings. Only discuss bookings included in that context, and explain that staff support is needed for changes, cancellations, refunds, or detailed invoice questions. Ask for the event type, date, guest count, location, and budget when those details are needed. Recommend that the customer use Get Quote or log in to submit an inquiry when they want a formal quote or human follow-up. If a customer asks something unrelated to Festive or event planning, do not answer the unrelated topic. Instead politely redirect them back to Festive services and say: "I can help with Festive event planning, wedding planning, corporate events, private celebrations, concerts & festivals, packages, budgeting, bookings, proposals, and event support. Tell me your event type, date, guest count, location, and budget so I can guide you better." If you cannot answer, say so clearly and suggest requesting a quote. Do not claim to be human or claim that you completed an action you cannot perform.\n\nBooking context:\n${bookingContext}`
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    if (!result.ok) {
      const details = await result.text();
      return res.status(502).json({ message: `Ollama request failed: ${details || result.statusText}` });
    }

    const data = await result.json();
    const reply = data?.message?.content || data?.content || "I’m here to help with your event planning needs.";
    const normalizedReply = String(reply).trim() || "I’m here to help with your event planning needs.";

    if (!isFestiveRelatedQuestion(message)) {
      return res.json({ reply: unrelatedQuestionReply });
    }

    res.json({ reply: normalizedReply });
  } catch (error) {
    next(error);
  }
});

router.use(protect);

router.post("/proposal-draft", authorize("admin", "staff"), async (req, res, next) => {
  try {
    const event = await EventRequest.findById(req.body.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const result = await createProposalDraft(event);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
