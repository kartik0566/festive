const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const CHAT_TIMEOUT_MS = 20000;

const isLoopbackUrl = (value) => {
  try {
    const hostname = new URL(value).hostname;
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
  } catch (_error) {
    return false;
  }
};

const ollamaBaseUrl = () => (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");

export const getChatProviderStatus = () => {
  if (process.env.AI_API_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL) {
    return { provider: "openai-compatible", model: process.env.AI_MODEL };
  }

  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", model: process.env.OPENAI_MODEL || "gpt-4o-mini" };
  }

  const configuredOllamaUrl = process.env.OLLAMA_BASE_URL;
  if (configuredOllamaUrl && !(process.env.NODE_ENV === "production" && isLoopbackUrl(configuredOllamaUrl))) {
    return {
      provider: "ollama",
      model: process.env.OLLAMA_MODEL || process.env.LLAMA_MODEL || "llama3.2:latest"
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return { provider: "ollama", model: process.env.OLLAMA_MODEL || "llama3.2:latest" };
  }

  return { provider: "guided-fallback", model: "event-planning-help" };
};

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const postJson = async (url, body, apiKey) => {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  return response.json();
};

const contentFrom = (data) => {
  const value = data?.message?.content || data?.choices?.[0]?.message?.content || data?.output_text;
  return typeof value === "string" ? value.trim() : "";
};

export const generateChatReply = async ({ message, systemPrompt }) => {
  const provider = getChatProviderStatus();
  if (provider.provider === "guided-fallback") {
    return null;
  }

  try {
    let data;
    if (provider.provider === "openai-compatible") {
      const baseUrl = process.env.AI_API_BASE_URL.replace(/\/+$/, "");
      data = await postJson(
        `${baseUrl}/chat/completions`,
        {
          model: process.env.AI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.4
        },
        process.env.AI_API_KEY
      );
    } else if (provider.provider === "openai") {
      data = await postJson(
        "https://api.openai.com/v1/chat/completions",
        {
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.4
        },
        process.env.OPENAI_API_KEY
      );
    } else {
      const baseUrl = ollamaBaseUrl();
      data = await postJson(
        `${baseUrl}/api/chat`,
        {
          model: provider.model,
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        },
        process.env.OLLAMA_API_KEY
      );
    }

    const reply = contentFrom(data);
    return reply ? { reply, source: provider.provider } : null;
  } catch (error) {
    console.warn("Chat AI unavailable:", error.name === "AbortError" ? "request timed out" : error.message);
    return null;
  }
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);

export const buildGuidedChatReply = ({ message, services = [], packages = [], bookingSummary, isSignedIn }) => {
  const text = String(message || "").toLowerCase();

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text.trim())) {
    return "Hi! I can help you plan a wedding, corporate event, private celebration, concert, or festival. What are you planning?";
  }

  if (/\b(price|prices|cost|costs|budget|package|packages|pricing|how much)\b/.test(text)) {
    const packageList = packages.length
      ? packages.map((item) => `${item.name}: ${formatCurrency(item.price)}`).join(" · ")
      : "Our team can tailor a package to your event";
    return `Our listed packages are ${packageList}. Prices are indicative; the final quote depends on your event details. Share the event type, date, guest count, location, and budget, or use Get Quote for a tailored proposal.`;
  }

  if (/\b(my booking|my bookings|booking status|previous booking|event status)\b/.test(text)) {
    if (!isSignedIn) {
      return "Log in to check your event details. Once signed in, I can use the booking information linked to your account.";
    }
    return bookingSummary || "I can’t see a previous booking on this account yet. You can submit an event inquiry from Get Quote.";
  }

  if (/\b(service|services|wedding|corporate|birthday|concert|festival|celebration|decor|catering|venue)\b/.test(text)) {
    const serviceList = services.length
      ? services.map((item) => `${item.title} (from ${formatCurrency(item.basePrice)})`).join(" · ")
      : "weddings, corporate events, private celebrations, and concerts or festivals";
    return `Festive can help with ${serviceList}. Tell me your event date, guest count, location, and budget, and I can point you toward the right next step.`;
  }

  if (/\b(invoice|payment|pay|receipt|dashboard)\b/.test(text)) {
    return "Invoices and payment updates are available in your client dashboard after you log in. For a new event, use Get Quote and our team will prepare the next steps.";
  }

  if (/\b(quote|book|booking|plan|planning|inquiry|enquiry)\b/.test(text)) {
    return "To get started, share the event type, date, approximate guest count, location, and budget. Choose Get Quote to send those details to the Festive team for a tailored proposal.";
  }

  return "I can help with event services, packages, quotes, and booking steps. What type of event are you planning, and when and where will it take place?";
};
