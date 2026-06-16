import { Sparkles } from "lucide-react";

const EmptyState = ({ title = "Nothing here yet", body = "New activity will appear here as you use the platform." }) => (
  <div className="empty-state">
    <Sparkles size={24} />
    <strong>{title}</strong>
    <p>{body}</p>
  </div>
);

export default EmptyState;

