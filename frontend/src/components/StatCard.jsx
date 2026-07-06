export default function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" style={accent ? { '--accent': accent } : undefined}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
