import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ClockCard from '../components/ClockCard';
import AttendanceTable from '../components/AttendanceTable';
import StatCard from '../components/StatCard';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadToday = async () => {
    const { data } = await api.get('/attendance/today');
    setRecord(data.record);
  };

  const loadMonthSummary = async () => {
    const { data } = await api.get('/reports/my', { params: { period: 'monthly' } });
    setSummary(data.summary);
  };

  const loadHistory = async () => {
    const { data } = await api.get('/attendance/history');
    setHistory(data.records.slice(0, 10));
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadToday(), loadMonthSummary(), loadHistory()]);
    } catch (err) {
      setError('Could not load your attendance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClockIn = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/attendance/clock-in');
      await Promise.all([loadToday(), loadHistory()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Clock in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/attendance/clock-out');
      await Promise.all([loadToday(), loadHistory(), loadMonthSummary()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Clock out failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Hi {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's your attendance snapshot for today.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="dashboard-grid">
        <ClockCard record={record} onClockIn={handleClockIn} onClockOut={handleClockOut} busy={busy} />

        <div className="dashboard-side-col">
          <div className="stat-grid">
            <StatCard label="Present days (this month)" value={summary?.present ?? '—'} accent="#2f7a6d" />
            <StatCard label="Late arrivals (this month)" value={summary?.late ?? '—'} accent="#b8862f" />
            <StatCard
              label="Overtime logged"
              value={summary ? `${Math.floor((summary.totalOvertimeMinutes || 0) / 60)}h` : '—'}
              accent="#c1442d"
            />
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent attendance</div>
                <div className="card-subtitle">Your last 10 recorded days</div>
              </div>
            </div>
            {loading ? (
              <div className="loading-block">Loading history…</div>
            ) : (
              <AttendanceTable records={history} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
