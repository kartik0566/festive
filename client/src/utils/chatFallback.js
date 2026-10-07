export const buildChatFallback = (message) => {
  const text = String(message || "").toLowerCase();

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text.trim())) {
    return "Hi! I can help with weddings, corporate events, private celebrations, concerts, and festivals. What are you planning?";
  }
  if (/\b(price|prices|cost|budget|package|packages|pricing|how much)\b/.test(text)) {
    return "Festive offers Essential, Signature, and Luxury packages. Prices are indicative and depend on your date, guest count, location, and event details. Open Packages for current prices, or send a quote request for a tailored plan.";
  }
  if (/\b(my booking|my bookings|booking status|previous booking|event status)\b/.test(text)) {
    return "Log in to view event updates in your dashboard. For a new booking, choose Get Quote and share your event date, guest count, location, and budget.";
  }
  if (/\b(invoice|payment|pay|receipt|dashboard)\b/.test(text)) {
    return "Invoices and payment updates appear in your client dashboard after you log in. For a new event, use Get Quote and the team will prepare the next steps.";
  }
  if (/\b(service|services|wedding|corporate|birthday|concert|festival|celebration|decor|catering|venue)\b/.test(text)) {
    return "Festive plans weddings, corporate events, private celebrations, concerts, and festivals. Tell us the date, guest count, location, and budget to get pointed toward the right service.";
  }
  if (/\b(quote|book|booking|plan|planning|inquiry|enquiry)\b/.test(text)) {
    return "To get started, share the event type, date, approximate guest count, location, and budget. Choose Get Quote to send those details to the Festive team.";
  }

  return "I can help with event services, packages, quotes, and booking steps. What type of event are you planning, and when and where will it take place?";
};
