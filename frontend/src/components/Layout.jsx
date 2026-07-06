import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconHome,
  IconClock,
  IconReport,
  IconUsers,
  IconLogout,
  IconMenu,
  IconCalendar,
  IconBell,
} from './Icons';

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const links = isAdmin
    ? [
        { to: '/admin', label: 'Overview', icon: IconHome, end: true },
        { to: '/admin/reports', label: 'Reports', icon: IconReport },
        { to: '/admin/employees', label: 'Employees', icon: IconUsers },
        { to: '/admin/leaves', label: 'Leave Requests', icon: IconCalendar },
        { to: '/admin/notices', label: 'Notices', icon: IconBell },
      ]
    : [
        { to: '/', label: 'Clock In/Out', icon: IconClock, end: true },
        { to: '/reports', label: 'My Reports', icon: IconReport },
        { to: '/leaves', label: 'Leave Requests', icon: IconCalendar },
        { to: '/notices', label: 'Notices', icon: IconBell },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">TK</div>
          <span className="sidebar-brand-text">TimeKeep</span>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <IconLogout />
            Log out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(true)}>
            <IconMenu />
          </button>
          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">TK</div>
          </div>
          <div style={{ width: 40 }} />
        </div>

        <div className="page-container">
          <Outlet />
        </div>
      </div>

      <nav className="bottom-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
