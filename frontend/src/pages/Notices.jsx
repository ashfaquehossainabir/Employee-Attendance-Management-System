import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { IconPin } from '../components/Icons';

const emptyForm = { title: '', message: '', priority: 'normal', pinned: false };

const priorityAccent = {
  urgent: '#c1442d',
  important: '#b8862f',
  normal: '#2f7a6d',
};

const fmtDateTime = (d) =>
  new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Notices() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notices');
      setNotices(data.notices);
    } catch (err) {
      setError('Failed to load notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (notice) => {
    setEditing(notice);
    setForm({
      title: notice.title,
      message: notice.message,
      priority: notice.priority,
      pinned: notice.pinned,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.patch(`/notices/${editing._id}`, form);
      } else {
        await api.post('/notices', form);
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save notice.');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (notice) => {
    try {
      await api.patch(`/notices/${notice._id}`, { pinned: !notice.pinned });
      await load();
    } catch (err) {
      setError('Failed to update notice.');
    }
  };

  const remove = async (notice) => {
    if (!window.confirm(`Delete "${notice.title}"?`)) return;
    try {
      await api.delete(`/notices/${notice._id}`);
      await load();
    } catch (err) {
      setError('Failed to delete notice.');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Notices & Announcements</h1>
          <p>{isAdmin ? 'Post updates for the whole team.' : 'Stay up to date with company announcements.'}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            + New notice
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Latest updates</div>
            <div className="card-subtitle">Pinned notices appear first</div>
          </div>
        </div>

        {loading ? (
          <div className="loading-block">Loading notices…</div>
        ) : notices.length === 0 ? (
          <div className="empty-state">No notices yet.</div>
        ) : (
          <div className="notice-list">
            {notices.map((notice) => (
              <div
                className="notice-card"
                key={notice._id}
                style={{ '--accent': priorityAccent[notice.priority] || priorityAccent.normal }}
              >
                <div className="notice-card-head">
                  <div className="notice-title-row">
                    {notice.pinned && (
                      <span className="notice-pin" title="Pinned">
                        <IconPin />
                      </span>
                    )}
                    <span className="notice-title">{notice.title}</span>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => togglePin(notice)}>
                        {notice.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(notice)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(notice)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <p className="notice-message">{notice.message}</p>

                <div className="notice-meta">
                  Posted by {notice.postedBy?.name || 'Admin'} · {fmtDateTime(notice.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 16 }}>{editing ? 'Edit notice' : 'New notice'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={update('title')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={form.message}
                  onChange={update('message')}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={update('priority')}>
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={form.pinned} onChange={update('pinned')} />
                    Pin to top
                  </label>
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
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Post notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
