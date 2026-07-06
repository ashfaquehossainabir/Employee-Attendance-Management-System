import { useEffect, useState } from 'react';

const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatDate = (date) =>
  date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatClockValue = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ClockCard({ record, onClockIn, onClockOut, busy }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clockedIn = Boolean(record?.clockIn);
  const clockedOut = Boolean(record?.clockOut);

  let statusText = 'You have not clocked in yet today.';
  if (clockedIn && !clockedOut) statusText = 'Currently clocked in — have a productive day.';
  if (clockedOut) statusText = 'Shift complete. See you tomorrow.';

  return (
    <div className="punch-card">
      <span className="eyebrow" style={{ color: '#d9b877' }}>Today</span>
      <div className="punch-card-clock">{formatTime(now)}</div>
      <div className="punch-card-date">{formatDate(now)}</div>

      {!clockedIn && (
        <button className="punch-button" onClick={onClockIn} disabled={busy}>
          {busy ? 'Working…' : 'Clock In'}
        </button>
      )}

      {clockedIn && !clockedOut && (
        <button className="punch-button clocked-in" onClick={onClockOut} disabled={busy}>
          {busy ? 'Working…' : 'Clock Out'}
        </button>
      )}

      {clockedIn && clockedOut && (
        <button className="punch-button" disabled>
          Done
        </button>
      )}

      <p className="punch-card-status">{statusText}</p>

      <div className="punch-times">
        <div>
          In
          <strong>{formatClockValue(record?.clockIn)}</strong>
        </div>
        <div>
          Out
          <strong>{formatClockValue(record?.clockOut)}</strong>
        </div>
        {record?.isLate && (
          <div>
            Late by
            <strong>{record.lateByMinutes}m</strong>
          </div>
        )}
      </div>
    </div>
  );
}
