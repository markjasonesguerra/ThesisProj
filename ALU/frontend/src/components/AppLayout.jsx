import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Newspaper,
  QrCode,
  History,
  User,
  LogOut,
  Bell,
  HeartHandshake,
} from 'lucide-react';
import '@userStyles/layout.css';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'News', icon: Newspaper, path: '/news' },
  { label: 'Digital ID', icon: QrCode, path: '/digital-id', isCenter: true },
  { label: 'Dues', icon: History, path: '/dues' },
  { label: 'Request & Assistance', icon: HeartHandshake, path: '/request-assistance' },
  { label: 'Account', icon: User, path: '/account' },
];

export default function AppLayout({ title, user, unreadNotifications = 0, onLogout, children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleNavigate = (path) => {
    if (pathname !== path) {
      navigate(path);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">ALU</div>
          <div>
            <p className="sidebar__title">Associated Labor Unions</p>
            <span className="sidebar__subtitle">Member Portal</span>
          </div>
        </div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                className={`sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          {user && (
            <div className="sidebar__user">
              <div className="sidebar__avatar">{user.firstName?.[0]}{user.lastName?.[0]}</div>
              <div>
                <p className="sidebar__user-name">{user.firstName} {user.lastName}</p>
                <span className="sidebar__user-role">{user.unionPosition ?? 'Member'}</span>
              </div>
            </div>
          )}
          {onLogout && (
            <button type="button" className="sidebar__logout" onClick={onLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1 className="topbar__title">{title}</h1>
            {user?.company && <p className="topbar__subtitle">{user.company}</p>}
          </div>
          <div className="topbar__actions">
            <button type="button" className="topbar__notifications" aria-label="Notifications">
              <Bell size={18} />
              {unreadNotifications > 0 && <span>{unreadNotifications}</span>}
            </button>
            {user && (
              <div className="topbar__chip">
                <span className="topbar__chip-label">Member since</span>
                <span className="topbar__chip-value">{user.membershipDate ?? '—'}</span>
              </div>
            )}
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              className={`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}${
                item.isCenter ? ' bottom-nav__item--primary' : ''
              }`}
              onClick={() => handleNavigate(item.path)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

AppLayout.propTypes = {
  title: PropTypes.string.isRequired,
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    unionPosition: PropTypes.string,
    company: PropTypes.string,
    membershipDate: PropTypes.string,
  }),
  unreadNotifications: PropTypes.number,
  onLogout: PropTypes.func,
  children: PropTypes.node.isRequired,
};

AppLayout.defaultProps = {
  user: null,
  unreadNotifications: 0,
  onLogout: null,
};
