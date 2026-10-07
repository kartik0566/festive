const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";

const proposalDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "itemName", "itemDescription", "quantity", "unitPrice", "discount", "taxRate", "terms"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    itemName: { type: "string" },
    itemDescription: { type: "string" },
    quantity: { type: "number" },
    unitPrice: { type: "number" },
    discount: { type: "number" },
    taxRate: { type: "number" },
    terms: { type: "string" }
  }
};

const currencyNumber = (value, fallback = 0) => {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) {
    return Math.round(direct);
  }

  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
};

const eventContext = (event) =>
  [
    `Event type: ${event.eventType}`,
    `Client: ${event.name}`,
    `Date: ${event.eventDate ? new Date(event.eventDate).toDateString() : "Not set"}`,
    `Guest count: ${event.guestCount || "Not set"}`,
    `Budget: ${event.budget || "Not set"}`,
    `Location: ${event.location || "Not set"}`,
    `Selected package: ${event.selectedPackage?.name || "Custom event"}`,
    `Package price: ${event.selectedPackage?.price || "Not set"}`,
    `Requirements: ${event.message || "No detailed requirements shared yet."}`
  ].join("\n");

const fallbackDraft = (event) => {
  const basePrice = currencyNumber(event.selectedPackage?.price || event.budget, 75000);
  const eventName = event.eventType || "Event";

  return {
    title: `${eventName} Planning Proposal`,
    summary: `Complete planning and coordination support for ${event.name}'s ${eventName.toLowerCase()} event, including vendor coordination, timeline planning, guest flow, and event-day supervision.`,
    itemName: `${eventName} planning package`,
    itemDescription: `Planning consultation, vendor coordination, logistics support, event timeline, guest flow planning, and on-site coordination for up to ${event.guestCount || "the expected"} guests.`,
    quantity: 1,
    unitPrice: basePrice,
    discount: 0,
    taxRate: 18,
    terms: "50% advance to confirm booking. Balance due before the event date. Final scope, guest count, and vendor costs may adjust the final invoice."
  };
};

const extractResponseText = (data) => {
  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.output_text) {
    return data.output_text;
  }

  if (typeof data.message?.content === "string") {
    return data.message.content;
  }

  if (Array.isArray(data.message?.content)) {
    return data.message.content
      .map((part) => (typeof part === "string" ? part : part?.text || part?.content || ""))
      .join("\n");
  }

  const message = data.output?.find((item) => item.type === "message");
  const textPart = message?.content?.find((part) => part.type === "output_text");
  if (textPart?.text) {
    return textPart.text;
  }

  if (Array.isArray(data.choices)) {
    const choice = data.choices[0];
    if (typeof choice?.message?.content === "string") {
      return choice.message.content;
    }
  }

  return "";
};

const cleanJsonText = (text = "") => {
  const trimmed = String(text).trim();
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
};

const parseDraft = (text) => {
  const cleaned = cleanJsonText(text);

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerError) {
        throw new Error("AI response could not be parsed.");
      }
    }
    throw new Error("AI response could not be parsed.");
  }
};

const localTemplateResult = (event, note) => ({
  source: "local-template",
  model: "fallback",
  note,
  draft: fallbackDraft(event)
});

const ollamaBaseUrl = () => (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");

const ollamaModel = () => process.env.OLLAMA_MODEL || process.env.AI_MODEL || process.env.LLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

export const createProposalDraft = async (event) => {
  const model = ollamaModel();

  try {
    const response = await fetch(`${ollamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: proposalDraftSchema,
        options: {
          temperature: 0.2
        },
        messages: [
          {
            role: "system",
            content:
              "You are an expert Indian event planning proposal writer. Return only valid JSON matching the requested schema. Keep amounts realistic in INR. Use concise language that an admin can edit before sending to the client."
          },
          {
            role: "user",
            content: `Create a proposal draft for this event.\n\n${eventContext(event)}`
          }
        ]
      })
    });

    if (!response.ok) {
      const details = await response.text();
      return localTemplateResult(event, `Ollama did not return a draft: ${details || response.statusText}`);
    }

    const data = await response.json();
    const text = extractResponseText(data);

    if (!text) {
      return localTemplateResult(event, "Ollama returned an empty response.");
    }

    return {
      source: "ollama",
      model,
      draft: parseDraft(text)
    };
  } catch (error) {
    return localTemplateResult(event, `Ollama is not available yet: ${error.message}`);
  }
};

export const getAiStatus = () => ({
  provider: "ollama",
  model: ollamaModel()
});
