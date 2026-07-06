import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatCard from '../components/StatCard';
import AttendanceTable from '../components/AttendanceTable';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/overview');
      setOverview(data);
    } catch (err) {
      setError('Failed to load dashboard overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Team Overview</h1>
          <p>A live snapshot of who's clocked in today.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading && !overview ? (
        <div className="loading-block">Loading overview…</div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Total employees" value={overview?.totalEmployees ?? 0} accent="#b8862f" />
            <StatCard label="Present today" value={overview?.presentToday ?? 0} accent="#2f7a6d" />
            <StatCard label="Currently clocked in" value={overview?.clockedIn ?? 0} accent="#2f7a6d" />
            <StatCard label="Late today" value={overview?.lateToday ?? 0} accent="#c1442d" />
            <StatCard label="Not clocked in yet" value={overview?.notClockedInYet ?? 0} accent="#64748b" />
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Today's attendance</div>
                <div className="card-subtitle">Updates automatically every minute</div>
              </div>
            </div>
            <AttendanceTable records={overview?.todayRecords || []} showEmployee />
          </div>
        </>
      )}
    </>
  );
}
