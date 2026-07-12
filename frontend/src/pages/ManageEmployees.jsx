import { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatMoney } from '../utils/format';

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  name: '',
  email: '',
  password: '',
  department: '',
  role: 'employee',
  baseSalary: '',
  overtimeRate: '',
  joiningDate: todayISO(),
  weekendDays: [0, 6],
};

const DAY_LABELS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function ManageEmployees() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      setError('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleWeekendDay = (day) => {
    setForm((f) => {
      const has = f.weekendDays.includes(day);
      const weekendDays = has ? f.weekendDays.filter((d) => d !== day) : [...f.weekendDays, day];
      return { ...f, weekendDays };
    });
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      department: user.department || '',
      role: user.role,
      baseSalary: user.baseSalary ?? '',
      overtimeRate: user.overtimeRate ?? '',
      joiningDate: user.joiningDate ? user.joiningDate.slice(0, 10) : todayISO(),
      weekendDays: user.weekendDays?.length ? user.weekendDays : [0, 6],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, {
          name: form.name,
          department: form.department,
          role: form.role,
          baseSalary: form.baseSalary,
          overtimeRate: form.overtimeRate,
          joiningDate: form.joiningDate,
          weekendDays: form.weekendDays,
        });
      } else {
        await api.post('/users', form);
      }
      setShowModal(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      await load();
    } catch (err) {
      setError('Failed to update employee.');
    }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Remove ${user.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove employee.');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p>Manage accounts, roles, joining dates, weekends, and salary configuration.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add employee
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-block">Loading employees…</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Joined</th>
                  <th>Weekend</th>
                  <th>Base salary</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="employee-table-name">
                        <span className="employee-avatar">{u.name.slice(0, 1).toUpperCase()}</span>
                        {u.name}
                      </div>
                    </td>
                    <td className="mono-cell">{u.employeeId}</td>
                    <td>{u.department}</td>
                    <td className="mono-cell">{fmtDate(u.joiningDate)}</td>
                    <td className="mono-cell">
                      {(u.weekendDays || [0, 6])
                        .slice()
                        .sort()
                        .map((d) => DAY_LABELS.find((x) => x.value === d)?.label)
                        .join(', ')}
                    </td>
                    <td className="mono-cell">{formatMoney(u.baseSalary, u.currency)}/mo</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-present' : 'badge-absent'}`}>
                        <span className="badge-dot" />
                        {u.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
                          Edit
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeUser(u)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 16 }}>{editingUser ? 'Edit employee' : 'Add employee'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={form.name} onChange={update('name')} required />
              </div>

              {!editingUser && (
                <>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temporary password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={form.password}
                      onChange={update('password')}
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={form.department} onChange={update('department')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={update('role')}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Base salary (monthly)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.baseSalary}
                    onChange={update('baseSalary')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Overtime rate (per hour)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.overtimeRate}
                    onChange={update('overtimeRate')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Joining date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.joiningDate}
                  onChange={update('joiningDate')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Weekend days</label>
                <div className="weekday-picker">
                  {DAY_LABELS.map((d) => (
                    <button
                      type="button"
                      key={d.value}
                      className={`weekday-chip ${form.weekendDays.includes(d.value) ? 'active' : ''}`}
                      onClick={() => toggleWeekendDay(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <span className="card-subtitle" style={{ marginTop: 4 }}>
                  These days are excluded from working-day and payroll calculations for this employee.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : editingUser ? 'Save changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
