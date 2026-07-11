import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatMoney, monthName } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import PayslipModal from '../components/PayslipModal';

const now = new Date();
const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

export default function Payroll() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);

  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterStatus, setFilterStatus] = useState('');

  const [genYear, setGenYear] = useState(now.getFullYear());
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [genEmployee, setGenEmployee] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      api
        .get('/users')
        .then(({ data }) => setEmployees(data.users.filter((u) => u.role === 'employee')))
        .catch(() => {});
    }
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAdmin) {
        const { data } = await api.get('/payroll', {
          params: { year: filterYear || undefined, status: filterStatus || undefined },
        });
        setPayslips(data.payslips);
      } else {
        const { data } = await api.get('/payroll/my');
        setPayslips(data.payslips);
      }
    } catch (err) {
      setError('Failed to load payroll data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filterYear, filterStatus]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/payroll/generate', {
        year: genYear,
        month: genMonth,
        userId: genEmployee || undefined,
      });
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate payroll.');
    } finally {
      setGenerating(false);
    }
  };

  const saveAdjustments = async (id, payload) => {
    try {
      const { data } = await api.patch(`/payroll/${id}`, payload);
      setSelected(data.payslip);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save adjustments.');
    }
  };

  const markPaid = async (id) => {
    try {
      const { data } = await api.patch(`/payroll/${id}/mark-paid`);
      setSelected(data.payslip);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as paid.');
    }
  };

  const removePayslip = async (id) => {
    if (!window.confirm('Delete this payslip?')) return;
    try {
      await api.delete(`/payroll/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete payslip.');
    }
  };

  const totalNetThisView = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.netPay || 0), 0),
    [payslips]
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Payroll</h1>
          <p>{isAdmin ? 'Generate and manage employee payslips.' : 'View and download your payslips.'}</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {notice && (
        <div className="summary-strip" style={{ color: 'var(--color-teal)' }}>
          {notice}
        </div>
      )}

      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Generate payslips</div>
              <div className="card-subtitle">
                Computed automatically from attendance and approved leave for the selected month
              </div>
            </div>
          </div>
          <form onSubmit={handleGenerate}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Month</label>
                <select className="form-select" value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {monthName(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-select" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Employee</label>
                <select className="form-select" value={genEmployee} onChange={(e) => setGenEmployee(e.target.value)}>
                  <option value="">All active employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={generating}>
              {generating ? 'Generating…' : 'Generate payslip(s)'}
            </button>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="filters-row">
          <select className="form-select" style={{ maxWidth: 140 }} value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="segmented">
            {['', 'pending', 'paid'].map((s) => (
              <button key={s || 'all'} className={filterStatus === s ? 'active' : ''} onClick={() => setFilterStatus(s)}>
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>
      )}

      {payslips.length > 0 && (
        <div className="summary-strip">
          <span>
            Payslips: <b>{payslips.length}</b>
          </span>
          <span>
            Total net pay: <b>{formatMoney(totalNetThisView, payslips[0]?.currency)}</b>
          </span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{isAdmin ? 'All payslips' : 'Your payslips'}</div>
          </div>
        </div>

        {loading ? (
          <div className="loading-block">Loading payroll…</div>
        ) : payslips.length === 0 ? (
          <div className="empty-state">No payslips yet.</div>
        ) : (
          <div className="leave-list">
            {payslips.map((p) => (
              <div className="leave-item" key={p._id}>
                <div className="leave-item-head">
                  <div className="leave-item-employee">
                    {isAdmin && (
                      <span className="employee-avatar">{(p.user?.name || '?').slice(0, 1).toUpperCase()}</span>
                    )}
                    <div>
                      {isAdmin && <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.user?.name}</div>}
                      <div className="leave-item-dates">
                        {monthName(p.month)} {p.year}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="leave-type-tag mono-cell">{formatMoney(p.netPay, p.currency)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>

                <div className="leave-item-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(p)}>
                    View payslip
                  </button>
                  {isAdmin && p.status === 'pending' && (
                    <button className="btn btn-danger btn-sm" onClick={() => removePayslip(p._id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <PayslipModal
          payslip={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onSaveAdjustments={saveAdjustments}
          onMarkPaid={markPaid}
        />
      )}
    </>
  );
}
