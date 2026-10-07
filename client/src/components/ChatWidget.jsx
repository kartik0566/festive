import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { apiClient } from "../api/client.js";

const initialMessages = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hi! I’m Festive Customer Care. I can help with services, packages, planning questions, and next steps for requesting a quote."
  }
];

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      text: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await apiClient.post("/ai/chat", {
        message: trimmed
      });

      const assistantMessage = {
        id: `${Date.now()}-bot`,
        role: "assistant",
        text: data.reply || "I’m here to help with your event planning questions."
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          text:
            error?.response?.data?.message ||
            "I could not reach the assistant right now. Please try again in a moment."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-widget">
      {!isOpen ? (
        <button type="button" className="chat-launcher" onClick={() => setIsOpen(true)}>
          <Sparkles size={18} />
          Chat with AI
        </button>
      ) : (
        <div className="chat-window">
          <div className="chat-header">
            <div>
              <span className="eyebrow">Festive AI</span>
              <strong>Event assistant</strong>
            </div>
            <button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="Close AI chat">
              <X size={18} />
            </button>
          </div>

          <div className="chat-body">
            {messages.map((message) => (
              <div key={message.id} className={`chat-bubble ${message.role}`}>
                {message.text}
              </div>
            ))}
            {loading && <div className="chat-bubble assistant pending">Thinking...</div>}
          </div>

          <div className="chat-input-row">
            <textarea
              rows="2"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="How can we help with your event?"
            />
            <button type="button" className="button primary compact" onClick={sendMessage} disabled={loading || !input.trim()}>
              <Send size={16} />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
