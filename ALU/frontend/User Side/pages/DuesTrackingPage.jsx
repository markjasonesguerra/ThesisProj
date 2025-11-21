import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import AppLayout from '@components/AppLayout';
import '../styles/dues.css';

const STATUS_META = {
  paid: {
    label: 'Paid',
    tone: 'green',
    icon: CheckCircle2,
    helper: 'Recorded via payroll deduction',
  },
  pending: {
    label: 'Pending',
    tone: 'amber',
    icon: Clock3,
    helper: 'Scheduled for upcoming payroll',
  },
  overdue: {
    label: 'Overdue',
    tone: 'red',
    icon: AlertTriangle,
    helper: 'Please contact finance to settle',
  },
};

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(value)) {
    return '₱0.00';
  }
  return value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const getStatusMeta = (status) => STATUS_META[status] ?? STATUS_META.pending;

const getNextPayment = (records) => {
  if (!records.length) {
    return null;
  }
  const next = records.find((entry) => entry.status !== 'paid') ?? records[0];
  const label = next.dueDate
    ? formatDate(next.dueDate)
    : next.billingPeriod;
  return {
    label: label ?? 'To be scheduled',
    amount: next.amount,
  };
};

export default function DuesTrackingPage({ user, dues, onLogout }) {
  const navigate = useNavigate();
  const isApproved = user?.isApproved !== false;

  const totals = useMemo(() => {
    return dues.reduce(
      (acc, entry) => {
        acc.total += entry.amount;
        if (entry.status === 'paid') {
          acc.paid += entry.amount;
          acc.paidCount += 1;
        } else if (entry.status === 'overdue') {
          acc.overdue += entry.amount;
          acc.overdueCount += 1;
        } else {
          acc.pending += entry.amount;
          acc.pendingCount += 1;
        }
        return acc;
      },
      {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
      },
    );
  }, [dues]);

  const monthlyAmount = dues[0]?.amount ?? 0;
  const yearlyProjection = monthlyAmount * 12;
  const nextPayment = getNextPayment(dues);

  const isVerified = user?.isApproved === 'active' || user?.isApproved === 'approved' || user?.isApproved === true || user?.isApproved === 1 || user?.isApproved === '1';
  const isIncomplete = user?.isApproved === 'incomplete' || ((user?.isApproved === 'pending' || user?.isApproved === 0 || user?.isApproved === false) && !user?.dateOfBirth);

  if (!isVerified) {
    return (
      <AppLayout title="Dues Tracking" user={user} onLogout={onLogout}>
        <div className="dues-page">
          <header className="dues-page__hero">
            <div className="dues-page__hero-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1>Your contribution history</h1>
              <p>Monitor monthly union dues, keep track of payroll deductions, and stay current with payment schedules.</p>
            </div>
          </header>

          <div className="verification-prompt" style={{ 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            maxWidth: '600px', 
            margin: '2rem auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ color: '#f59e0b' }}>
              <AlertCircle size={48} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
              {isIncomplete ? "Verification Required" : "Application Under Review"}
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
              {isIncomplete 
                ? "To access your dues history, your membership status must be verified. Please complete your profile to unlock this feature."
                : "Your membership application is currently under review. You will be able to access your dues history once your membership is approved."}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {isIncomplete ? (
                <button 
                  type="button"
                  onClick={() => navigate('/complete-profile')}
                  style={{ 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '0.375rem',
                    border: 'none',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Complete Verification
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={() => navigate('/membership-form')}
                  style={{ 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '0.375rem',
                    border: 'none',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  View Application
                </button>
              )}
              <button 
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{ 
                  backgroundColor: 'white', 
                  color: '#374151', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dues Tracking" user={user} onLogout={onLogout}>
      <div className="dues-page">
        <header className="dues-page__hero">
          <div className="dues-page__hero-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1>Your contribution history</h1>
            <p>Monitor monthly union dues, keep track of payroll deductions, and stay current with payment schedules.</p>
          </div>
          <button type="button" className="dues-page__hero-action">
            Download Statement
            <ChevronRight size={16} />
          </button>
        </header>

        <div className="dues-page__layout">
          <div className="dues-page__content">
            <section className="dues-summary">
              <article className="dues-summary__card dues-summary__card--paid">
                <span>Paid</span>
                <strong>{formatCurrency(totals.paid)}</strong>
                <small>{totals.paidCount} recorded payments</small>
              </article>
              <article className="dues-summary__card dues-summary__card--pending">
                <span>Pending</span>
                <strong>{formatCurrency(totals.pending)}</strong>
                <small>{totals.pendingCount} scheduled deductions</small>
              </article>
              <article className="dues-summary__card dues-summary__card--overdue">
                <span>Overdue</span>
                <strong>{formatCurrency(totals.overdue)}</strong>
                <small>{totals.overdueCount} items need attention</small>
              </article>
            </section>

            <section className="dues-card">
              <header>
                <div className="dues-card__icon">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2>Membership dues information</h2>
                  <p>Payroll deductions recorded under your membership profile.</p>
                </div>
              </header>
              <div className="dues-card__grid">
                <div>
                  <span>Member</span>
                  <strong>{user.firstName} {user.lastName}</strong>
                </div>
                <div>
                  <span>Company</span>
                  <strong>{user.company ?? 'ALU Member'}</strong>
                </div>
                <div>
                  <span>Monthly Amount</span>
                  <strong>{formatCurrency(monthlyAmount)}</strong>
                </div>
                <div>
                  <span>Payment Method</span>
                  <strong>{user.paymentMethod ?? 'Payroll deduction'}</strong>
                </div>
                <div>
                  <span>Member ID</span>
                  <strong>{user.digitalId ?? 'ALU-000000'}</strong>
                </div>
                <div>
                  <span>Payroll Reference</span>
                  <strong>{user.payrollReference ?? 'HR-ALU'}</strong>
                </div>
              </div>
            </section>

            <section className="dues-notice">
              <div className="dues-notice__icon">
                <Banknote size={18} />
              </div>
              <div>
                <h3>Automatic payroll deduction is active</h3>
                <p>Your dues are automatically deducted every 5th of the month. Please ensure your payroll profile remains updated to avoid payment delays.</p>
              </div>
            </section>

            <section className="dues-history">
              <header className="dues-history__header">
                <div className="dues-history__title">
                  <CalendarDays size={18} />
                  <div>
                    <h2>Payment history</h2>
                    <p>Latest contributions and payroll transactions</p>
                  </div>
                </div>
                <span>Total contributions: {formatCurrency(totals.total)}</span>
              </header>
              <div className="dues-history__list">
                {dues.map((entry) => {
                  const meta = getStatusMeta(entry.status);
                  const StatusIcon = meta.icon;
                  const paidDate = formatDate(entry.paidAt);
                  const helperText = paidDate
                    ? `Paid on ${paidDate}`
                    : meta.helper;
                  return (
                    <article
                      key={`${entry.billingPeriod}-${entry.reference ?? entry.status}`}
                      className="dues-history__item"
                    >
                      <div className={`dues-history__icon dues-history__icon--${meta.tone}`}>
                        <StatusIcon size={18} />
                      </div>
                      <div className="dues-history__details">
                        <div className="dues-history__period">{entry.billingPeriod}</div>
                        <div className="dues-history__meta">
                          <span>{helperText}</span>
                          <span>Ref: {entry.reference ?? 'Not provided'}</span>
                        </div>
                      </div>
                      <div className="dues-history__amount">
                        <strong>{formatCurrency(entry.amount)}</strong>
                        <span className={`status-badge status-badge--${meta.tone}`}>
                          {meta.label}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="dues-sidebar">
            <div className="dues-sidebar__card">
              <h3>Quick stats</h3>
              <div className="dues-sidebar__stats">
                <div>
                  <span>Payments made</span>
                  <strong>{totals.paidCount}</strong>
                </div>
                <div>
                  <span>Monthly</span>
                  <strong>{formatCurrency(monthlyAmount)}</strong>
                </div>
                <div>
                  <span>Yearly</span>
                  <strong>{formatCurrency(yearlyProjection)}</strong>
                </div>
              </div>
            </div>

            <div className="dues-sidebar__card">
              <h3>Payment schedule</h3>
              <div className="dues-sidebar__schedule">
                <div>
                  <span>Next deduction</span>
                  <strong>{nextPayment ? nextPayment.label : 'To be scheduled'}</strong>
                </div>
                <div>
                  <span>Expected amount</span>
                  <strong>{formatCurrency(nextPayment?.amount ?? monthlyAmount)}</strong>
                </div>
                <p>Automatic deduction processed through payroll every 5th of the month.</p>
              </div>
            </div>

            <div className="dues-sidebar__card">
              <h3>Need assistance?</h3>
              <div className="dues-sidebar__contact">
                <p>ALU Finance Department</p>
                <span>
                  <Phone size={16} />
                  (02) 8123-4567
                </span>
                <span>
                  <Mail size={16} />
                  finance@alu.org.ph
                </span>
                <span>Mon–Fri • 8:00 AM – 5:00 PM</span>
              </div>
            </div>
          </aside>
        </div>

        <section className="dues-mobile-next">
          <div>
            <h3>Next payment</h3>
            <p>{nextPayment ? `${nextPayment.label} • ${formatCurrency(nextPayment.amount)}` : 'Waiting for next payroll cycle'}</p>
          </div>
          <span className="status-badge status-badge--blue">Auto deduction active</span>
        </section>
      </div>
    </AppLayout>
  );
}

DuesTrackingPage.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    company: PropTypes.string,
    digitalId: PropTypes.string,
    paymentMethod: PropTypes.string,
    payrollReference: PropTypes.string,
    isApproved: PropTypes.bool,
  }).isRequired,
  dues: PropTypes.arrayOf(
    PropTypes.shape({
      billingPeriod: PropTypes.string,
      amount: PropTypes.number,
      status: PropTypes.string,
      paidAt: PropTypes.string,
      dueDate: PropTypes.string,
      reference: PropTypes.string,
    })
  ).isRequired,
  onLogout: PropTypes.func.isRequired,
};
