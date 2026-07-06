import { useEffect, useState } from 'react';
import api from '../api/axios';

const emptyForm = { name: '', email: '', password: '', department: '', role: 'employee' };

export default function ManageEmployees() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/users', form);
      setShowModal(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee.');
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
          <p>Manage accounts, roles, and access.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
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
                    <td>{u.email}</td>
                    <td>{u.department}</td>
                    <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-present' : 'badge-absent'}`}>
                        <span className="badge-dot" />
                        {u.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
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
            <h2 style={{ marginBottom: 16 }}>Add employee</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={form.name} onChange={update('name')} required />
              </div>
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
                  {saving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
