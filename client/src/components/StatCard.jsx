const StatCard = ({ icon, label, value }) => (
  <div className="stat-card">
    <span className="stat-icon">{icon}</span>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default StatCard;

