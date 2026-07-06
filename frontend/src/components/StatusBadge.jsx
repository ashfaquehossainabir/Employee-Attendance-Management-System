export default function StatusBadge({ status }) {
  const label = (status || 'absent').replace('-', ' ');
  return (
    <span className={`badge badge-${status || 'absent'}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
