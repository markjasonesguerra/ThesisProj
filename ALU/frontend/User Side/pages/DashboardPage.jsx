import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  Megaphone,
  Newspaper,
  QrCode,
  Shield,
  User,
} from 'lucide-react';
import AppLayout from '@components/AppLayout';
import '../styles/dashboard.css';

const QUICK_ACTIONS = [
  {
    label: 'Digital ID',
    description: 'View your QR-ready union card',
    icon: QrCode,
    color: 'blue',
    path: '/digital-id',
  },
  {
    label: 'Membership Form',
    description: 'Review your registration details',
    icon: FileText,
    color: 'indigo',
    path: '/membership-form',
  },
  {
    label: 'Track Dues',
    description: 'Monitor payments and balances',
    icon: CreditCard,
    color: 'green',
    path: '/dues',
  },
  {
    label: 'Union News',
    description: 'Latest updates and advisories',
    icon: Newspaper,
    color: 'orange',
    path: '/news',
  },
];

const SUPPORT_ENTRIES = [
  { label: 'Support Hotline', value: '(02) 8123 4567' },
  { label: 'Email', value: 'support@aluzon.ph' },
  { label: 'Office Hours', value: 'Mon - Fri • 8:00 AM - 5:00 PM' },
];

export default function DashboardPage({ user, notifications, dues, onLogout }) {
  const navigate = useNavigate();

  const isVerified = user.isApproved === 'active' || user.isApproved === 'approved' || user.isApproved === true || user.isApproved === 1 || user.isApproved === '1';
  const isIncomplete = user.isApproved === 'incomplete';

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const nextDue = dues.find((entry) => entry.status !== 'paid');
  const paidCount = dues.filter((entry) => entry.status === 'paid').length;
  const upcomingEvents = notifications.slice(0, 2);

  return (
    <AppLayout title="Dashboard" user={user} unreadNotifications={unreadCount} onLogout={onLogout}>
      <div className="dashboard-page">
        <section className="dashboard-page__overview">
          <div className="dashboard-page__welcome">
            <div className="dashboard-page__welcome-main">
              <div className="dashboard-page__avatar">
                <User size={28} />
              </div>
              <div>
                <span className="dashboard-page__eyebrow">Welcome back</span>
                <h2>{user.firstName} {user.lastName}</h2>
                <p>{user.unionPosition ?? 'Member'} • {user.company ?? 'Associated Labor Unions'}</p>
              </div>
            </div>
            <div className="dashboard-page__welcome-actions">
              {!isVerified ? (
                <>
                  <button type="button" className="button--primary" onClick={() => navigate('/complete-profile')}>
                    Complete Verification
                  </button>
                  <button type="button" className="button--secondary" onClick={() => navigate('/digital-id')}>
                    View Digital ID
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => navigate('/digital-id')}>
                    View Digital ID
                  </button>
                  <button type="button" onClick={() => navigate('/complete-profile')}>
                    Update Profile
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="dashboard-page__membership">
            <div className="dashboard-page__membership-header">
              <div>
                <h3>Membership Status</h3>
                <p>{user.membershipDate ? `Active since ${new Date(user.membershipDate).toLocaleDateString()}` : (isIncomplete ? 'Verification Required' : 'Membership Pending')}</p>
              </div>
              <div className={`dashboard-page__status-chip${!isVerified ? ' dashboard-page__status-chip--pending' : ''}`}>
                <CheckCircle size={16} />
                {isVerified ? 'Verified Member' : (isIncomplete ? 'Incomplete' : 'Pending Approval')}
              </div>
            </div>
            <div className="dashboard-page__membership-details">
              <div>
                <span>Member ID</span>
                <strong>{user.digitalId ?? 'Not assigned'}</strong>
              </div>
              <div>
                <span>Union Role</span>
                <strong>{user.unionPosition ?? 'Member'}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div>
                <span>QR Code</span>
                <strong>{user.qrCode ?? '—'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-page__content">
          <div className="dashboard-page__main">
            <div className="dashboard-page__quick">
              <h3>Quick Access</h3>
              <div className="dashboard-page__quick-grid">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      className={`dashboard-page__quick-card dashboard-page__quick-card--${action.color}`}
                      onClick={() => navigate(action.path)}
                    >
                      <span>
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>{action.label}</strong>
                        <p>{action.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="dashboard-page__panels">
              <article className="dashboard-page__card">
                <header>
                  <div>
                    <h4>Dues Summary</h4>
                    <p>Track your recent payments and balance</p>
                  </div>
                  <button type="button" onClick={() => navigate('/dues')}>
                    Manage Dues
                  </button>
                </header>
                <div className="dashboard-page__stats">
                  <div>
                    <span>Payments recorded</span>
                    <strong>{paidCount}</strong>
                  </div>
                  <div>
                    <span>Outstanding balance</span>
                    <strong>{nextDue ? nextDue.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) : 'PHP 0.00'}</strong>
                  </div>
                  <div>
                    <span>Next due date</span>
                    <strong>{nextDue?.dueDate ?? 'You are up to date'}</strong>
                  </div>
                </div>
                <ul className="dashboard-page__list">
                  {dues.slice(0, 4).map((item) => (
                    <li key={item.billingPeriod}>
                      <div>
                        <strong>{item.billingPeriod}</strong>
                        <span>{item.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</span>
                      </div>
                      <span className={`dashboard-page__badge dashboard-page__badge--${item.status}`}>
                        {item.status === 'paid' ? 'Paid' : item.status === 'overdue' ? 'Overdue' : 'Pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="dashboard-page__card">
                <header>
                  <div>
                    <h4>Upcoming Events</h4>
                    <p>Stay engaged with regional activities</p>
                  </div>
                </header>
                <div className="dashboard-page__event-grid">
                  {upcomingEvents.length === 0 ? (
                    <div className="dashboard-page__empty">
                      <Calendar size={18} />
                      <p>No scheduled events yet. Check back soon.</p>
                    </div>
                  ) : (
                    upcomingEvents.map((event) => (
                      <div key={event.id} className="dashboard-page__event">
                        <div className="dashboard-page__event-icon">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <strong>{event.title}</strong>
                          <span>{event.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </div>

          <aside className="dashboard-page__sidebar">
            <div className="dashboard-page__card dashboard-page__card--stack">
              <header>
                <div>
                  <h4>Notifications</h4>
                  <p>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                </div>
                <button type="button" onClick={() => navigate('/news')}>
                  View All
                </button>
              </header>
              <ul className="dashboard-page__list dashboard-page__list--notifications">
                {notifications.slice(0, 4).map((notification) => (
                  <li key={notification.id}>
                    <div className="dashboard-page__notif-icon">
                      <Megaphone size={16} />
                    </div>
                    <div>
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                    </div>
                  </li>
                ))}
                {notifications.length === 0 && (
                  <li className="dashboard-page__empty">
                    <Megaphone size={18} />
                    <p>No announcements yet.</p>
                  </li>
                )}
              </ul>
            </div>

            <div className="dashboard-page__card dashboard-page__card--support">
              <header>
                <div>
                  <h4>Member Support</h4>
                  <p>We are here to help you</p>
                </div>
              </header>
              <div className="dashboard-page__support">
                <div className="dashboard-page__support-icon">
                  <Shield size={20} />
                </div>
                <ul>
                  {SUPPORT_ENTRIES.map((entry) => (
                    <li key={entry.label}>
                      <span>{entry.label}</span>
                      <strong>{entry.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              {!isVerified && (
                <div className="dashboard-page__alert">
                  <AlertCircle size={16} />
                  <p>
                    {isIncomplete 
                      ? "Your membership profile is incomplete. Please verify your details to unlock all services."
                      : "Your membership is pending approval. You will be notified once approved."}
                  </p>
                  {isIncomplete && (
                    <button type="button" onClick={() => navigate('/complete-profile')}>
                      Complete Verification
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </AppLayout>
  );
}

DashboardPage.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    unionPosition: PropTypes.string,
    company: PropTypes.string,
    membershipDate: PropTypes.string,
    email: PropTypes.string,
    digitalId: PropTypes.string,
    qrCode: PropTypes.string,
    isApproved: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  }).isRequired,
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      message: PropTypes.string,
      timestamp: PropTypes.string,
      isRead: PropTypes.bool,
    }),
  ).isRequired,
  dues: PropTypes.arrayOf(
    PropTypes.shape({
      billingPeriod: PropTypes.string,
      amount: PropTypes.number,
      status: PropTypes.string,
      dueDate: PropTypes.string,
    }),
  ).isRequired,
  onLogout: PropTypes.func.isRequired,
};
