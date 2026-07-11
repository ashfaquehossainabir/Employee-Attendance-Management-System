import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register(form);
      navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark">TK</div>
          <span className="sidebar-brand-text" style={{ color: 'var(--color-ink)' }}>
            TimeKeep
          </span>
        </div>

        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to clock in and track your attendance.'
            : 'The first person to register becomes the workspace admin.'}
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={update('name')}
                  required
                  placeholder="Jordan Ade"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  className="form-input"
                  value={form.department}
                  onChange={update('department')}
                  placeholder="Engineering"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={update('email')}
              required
              placeholder="you@company.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-hint">
          Note: To sign in on this attendance platform, you'll need to contact with 
          your administrator. 
          <br/>
          Contact- ashfaquehossainabirr@gmail.com
        </div>

        {/* <div className="auth-switch">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button onClick={() => setMode('register')}>Create an account</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')}>Sign in</button>
            </>
          )}
        </div> */}

        {/* <div className="auth-hint">
          Tip: run <code>npm run seed</code> in /backend to create a default
          admin@company.com account with password Admin@123.
        </div> */}
      </div>
    </div>
  );
}
