import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AttendanceTable from '../components/AttendanceTable';
import { formatMinutesLabel } from '../utils/format';

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [period, setPeriod] = useState('weekly');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      api
        .get('/users')
        .then(({ data }) => setEmployees(data.users.filter((u) => u.role === 'employee')))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (isAdmin) {
          const { data } = await api.get('/reports/team', {
            params: { period, userId: selectedEmployee || undefined },
          });
          setData(data);
        } else {
          const { data } = await api.get('/reports/my', { params: { period } });
          setData(data);
        }
      } catch (err) {
        setError('Failed to load report.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, selectedEmployee, isAdmin]);

  const summary = isAdmin ? data?.overallSummary : data?.summary;

  const exportCsv = async () => {
    const path = isAdmin ? '/reports/team/export' : '/reports/my/export';
    const { data: blob } = await api.get(path, {
      params: { period, userId: isAdmin ? selectedEmployee || undefined : undefined },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{isAdmin ? 'Team Reports' : 'My Reports'}</h1>
          <p>Attendance, lateness, and overtime broken down by period.</p>
        </div>
        <button className="btn btn-ghost" onClick={exportCsv} disabled={!data}>
          Export CSV
        </button>
      </div>

      <div className="filters-row">
        <div className="segmented">
          {['daily', 'weekly', 'monthly'].map((p) => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {isAdmin && (
          <select
            className="form-select"
            style={{ maxWidth: 220 }}
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeId})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {summary && (
        <div className="summary-strip">
          <span>
            Days recorded: <b>{summary.totalDays}</b>
          </span>
          <span>
            Present: <b>{summary.present}</b>
          </span>
          <span>
            Late: <b>{summary.late}</b>
          </span>
          <span>
            Absent: <b>{summary.absent}</b>
          </span>
          <span>
            Worked: <b>{formatMinutesLabel(summary.totalWorkedMinutes)}</b>
          </span>
          <span>
            Overtime: <b>{formatMinutesLabel(summary.totalOvertimeMinutes)}</b>
          </span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Attendance records</div>
            <div className="card-subtitle">
              {data?.from && data?.to
                ? `${new Date(data.from).toLocaleDateString()} — ${new Date(data.to).toLocaleDateString()}`
                : ''}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="loading-block">Loading report…</div>
        ) : (
          <AttendanceTable records={data?.records || []} showEmployee={isAdmin} />
        )}
      </div>

      {isAdmin && data?.byEmployee?.length > 0 && !selectedEmployee && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Per-employee breakdown</div>
              <div className="card-subtitle">Late & overtime totals for this period</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Absent</th>
                  <th>Worked</th>
                  <th>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {data.byEmployee.map((row) => (
                  <tr key={row.user?._id}>
                    <td>
                      <div className="employee-table-name">
                        <span className="employee-avatar">
                          {(row.user?.name || '?').slice(0, 1).toUpperCase()}
                        </span>
                        {row.user?.name}
                      </div>
                    </td>
                    <td className="mono-cell">{row.summary.present}</td>
                    <td className="mono-cell">{row.summary.late}</td>
                    <td className="mono-cell">{row.summary.absent}</td>
                    <td className="mono-cell">{formatMinutesLabel(row.summary.totalWorkedMinutes)}</td>
                    <td className="mono-cell">{formatMinutesLabel(row.summary.totalOvertimeMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
