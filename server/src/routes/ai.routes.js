import express from "express";
import EventRequest from "../models/EventRequest.js";
import Package from "../models/Package.js";
import Service from "../models/Service.js";
import { optionalProtect, protect, authorize } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import { buildGuidedChatReply, generateChatReply } from "../utils/chat.js";
import { createProposalDraft } from "../utils/ai.js";

const router = express.Router();

const unrelatedQuestionReply =
  "I can help with Festive event planning, weddings, corporate events, private celebrations, concerts and festivals, packages, budgets, bookings, and event support. Tell me your event type, date, guest count, location, and budget so I can guide you.";

const isFestiveRelatedQuestion = (input) => {
  const text = String(input || "").toLowerCase().trim();
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text)) {
    return true;
  }

  const festiveKeywords = [
    "event", "wedding", "corporate", "private celebration", "concert", "festival", "package", "proposal",
    "invoice", "payment", "budget", "booking", "quote", "vendor", "venue", "guest", "planner", "decor",
    "catering", "stage", "logistics", "celebration", "planning", "price", "cost", "birthday", "service",
    "dashboard", "receipt", "enquiry", "inquiry"
  ];

  return festiveKeywords.some((keyword) => text.includes(keyword));
};

const buildBookingSummary = (bookings) => {
  if (!bookings.length) {
    return "I can’t see a previous booking on this account yet. You can submit an event inquiry from Get Quote.";
  }

  return `Your recent event requests are: ${bookings
    .map((booking) => {
      const date = booking.eventDate ? new Date(booking.eventDate).toLocaleDateString("en-IN") : "date not set";
      return `${booking.eventType || "Event"} on ${date}, status ${booking.status || "pending"}${booking.location ? ` in ${booking.location}` : ""}`;
    })
    .join("; ")}. For changes, cancellations, refunds, or invoice questions, please contact the Festive team.`;
};

router.post("/chat", optionalProtect, async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) {
    return res.status(400).json({ message: "Message is required." });
  }
  if (message.length > 2000) {
    return res.status(400).json({ message: "Please keep your message under 2,000 characters." });
  }

  if (!isFestiveRelatedQuestion(message)) {
    return res.json({ reply: unrelatedQuestionReply, source: "guided-fallback" });
  }

  let services = [];
  let packages = [];
  let bookingSummary;
  const databaseAvailable = Boolean(global.__dbConnected);

  if (databaseAvailable) {
    try {
      [services, packages] = await Promise.all([
        Service.find().select("title category basePrice").lean(),
        Package.find().select("name price").lean()
      ]);

      if (req.user?.role === "client") {
        const bookings = await EventRequest.find({ client: req.user._id })
          .select("eventType eventDate location status")
          .sort({ eventDate: -1, createdAt: -1 })
          .limit(10)
          .lean();
        bookingSummary = buildBookingSummary(bookings);
      }
    } catch (error) {
      console.warn("Chat context unavailable:", error.name || "database query failed");
    }
  }

  const systemPrompt = `You are Festive Events’ customer-service representative. Help customers with event planning, services, packages, budgeting, booking steps, proposals, invoices, payments, and their previous bookings. Be warm, professional, concise, and practical. Use only the service, package, and booking information supplied below. Treat prices as indicative; never promise availability, a final price, a confirmed booking, a refund, or a delivery time. Do not invent policies or contact details. For changes, cancellations, refunds, or detailed invoice questions, suggest contacting the Festive team. Ask for event type, date, guest count, location, and budget when needed. Recommend Get Quote for a formal quote or human follow-up. If the customer asks something unrelated to Festive or event planning, politely redirect them to Festive services. Do not claim to be human or say you completed an action you cannot perform.

Services: ${services.length ? services.map((item) => `${item.title} (${item.category}, from INR ${item.basePrice || 0})`).join("; ") : "weddings, corporate events, private celebrations, and concerts or festivals"}
Packages: ${packages.length ? packages.map((item) => `${item.name} (INR ${item.price || 0})`).join("; ") : "Essential, Signature, and Luxury; ask the customer to check the Packages section for current details"}
Booking context: ${bookingSummary || (req.user?.role === "client" ? "Booking history could not be loaded." : "The customer is not signed in, so no booking history is available.")}`;

  const generated = await generateChatReply({ message, systemPrompt });
  if (generated?.reply) {
    return res.json(generated);
  }

  const reply = buildGuidedChatReply({
    message,
    services,
    packages,
    bookingSummary,
    isSignedIn: req.user?.role === "client"
  });

  return res.json({ reply, source: "guided-fallback" });
});

router.use(protect);

router.post("/proposal-draft", authorize("admin", "staff"), requireDatabase, async (req, res, next) => {
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
