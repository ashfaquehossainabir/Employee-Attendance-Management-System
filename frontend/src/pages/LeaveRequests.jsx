import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const emptyForm = { leaveType: 'casual', startDate: '', endDate: '', reason: '' };

const fmtDate = (d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

export default function LeaveRequests() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAdmin) {
        const { data } = await api.get('/leaves', { params: { status: statusFilter || undefined } });
        setLeaves(data.leaves);
      } else {
        const { data } = await api.get('/leaves/my');
        setLeaves(data.leaves);
      }
    } catch (err) {
      setError('Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, statusFilter]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/leaves', form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelLeave = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await api.delete(`/leaves/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel request.');
    }
  };

  const review = async (id, status) => {
    try {
      await api.patch(`/leaves/${id}`, { status, reviewNote });
      setReviewingId(null);
      setReviewNote('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update request.');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leave Requests</h1>
          <p>{isAdmin ? "Review your team's time-off requests." : 'Request time off and track approval status.'}</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {!isAdmin && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">New request</div>
              <div className="card-subtitle">Submit a leave request for approval</div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Leave type</label>
                <select className="form-select" value={form.leaveType} onChange={update('leaveType')}>
                  <option value="casual">Casual</option>
                  <option value="sick">Sick</option>
                  <option value="vacation">Vacation</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  onChange={update('startDate')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">End date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.endDate}
                  onChange={update('endDate')}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.reason}
                onChange={update('reason')}
                required
                placeholder="Briefly describe the reason for your leave"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="segmented">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <button key={s || 'all'} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{isAdmin ? 'All requests' : 'Your requests'}</div>
            <div className="card-subtitle">{leaves.length} request{leaves.length === 1 ? '' : 's'}</div>
          </div>
        </div>

        {loading ? (
          <div className="loading-block">Loading leave requests…</div>
        ) : leaves.length === 0 ? (
          <div className="empty-state">No leave requests found.</div>
        ) : (
          <div className="leave-list">
            {leaves.map((leave) => (
              <div className="leave-item" key={leave._id}>
                <div className="leave-item-head">
                  <div className="leave-item-employee">
                    {isAdmin && (
                      <span className="employee-avatar">
                        {(leave.user?.name || '?').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div>
                      {isAdmin && <div style={{ fontWeight: 600, fontSize: 13.5 }}>{leave.user?.name}</div>}
                      <div className="leave-item-dates">
                        {fmtDate(leave.startDate)} — {fmtDate(leave.endDate)} · {leave.days}d
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="leave-type-tag">{leave.leaveType}</span>
                    <StatusBadge status={leave.status} />
                  </div>
                </div>

                <p className="leave-item-reason">{leave.reason}</p>

                {leave.reviewNote && (
                  <div className="leave-item-note">
                    <strong>Review note:</strong> {leave.reviewNote}
                  </div>
                )}

                <div className="leave-item-meta">
                  <span>Submitted {fmtDate(leave.createdAt)}</span>
                  {leave.reviewedBy?.name && <span>Reviewed by {leave.reviewedBy.name}</span>}
                </div>

                {!isAdmin && leave.status === 'pending' && (
                  <div className="leave-item-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => cancelLeave(leave._id)}>
                      Cancel request
                    </button>
                  </div>
                )}

                {isAdmin && leave.status === 'pending' && (
                  <>
                    {reviewingId === leave._id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          className="form-input"
                          placeholder="Optional note for the employee"
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                        />
                        <div className="leave-item-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => review(leave._id, 'approved')}>
                            Confirm approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => review(leave._id, 'rejected')}>
                            Confirm reject
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setReviewingId(null);
                              setReviewNote('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="leave-item-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => setReviewingId(leave._id)}>
                          Approve / Reject
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
