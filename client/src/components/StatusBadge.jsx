const labels = {
  new: "New",
  reviewing: "Reviewing",
  proposal_sent: "Proposal Sent",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  issued: "Issued",
  partially_paid: "Part Paid",
  paid: "Paid",
  assigned: "Assigned",
  accepted: "Accepted",
  pending: "Pending",
  active: "Active",
  blocked: "Blocked"
};

const StatusBadge = ({ value }) => {
  const key = value || "new";
  return <span className={`status ${key}`}>{labels[key] || key}</span>;
};

export default StatusBadge;

