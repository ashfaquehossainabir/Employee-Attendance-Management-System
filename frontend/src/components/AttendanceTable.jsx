import StatusBadge from './StatusBadge';

const fmtDate = (d) =>
  new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtMinutes = (m = 0) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
};

export default function AttendanceTable({ records, showEmployee = false }) {
  if (!records || records.length === 0) {
    return <div className="empty-state">No attendance records for this period yet.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            {showEmployee && <th>Employee</th>}
            <th>Status</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Worked</th>
            <th>Overtime</th>
            <th>Late By</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r._id}>
              <td className="mono-cell">{fmtDate(r.date)}</td>
              {showEmployee && (
                <td>
                  <div className="employee-table-name">
                    <span className="employee-avatar">
                      {(r.user?.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    {r.user?.name || 'Unknown'}
                  </div>
                </td>
              )}
              <td>
                <StatusBadge status={r.status} />
              </td>
              <td className="mono-cell">{fmtTime(r.clockIn)}</td>
              <td className="mono-cell">{fmtTime(r.clockOut)}</td>
              <td className="mono-cell">{fmtMinutes(r.workedMinutes)}</td>
              <td className="mono-cell">{r.overtimeMinutes ? fmtMinutes(r.overtimeMinutes) : '—'}</td>
              <td className="mono-cell">{r.isLate ? `${r.lateByMinutes}m` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
