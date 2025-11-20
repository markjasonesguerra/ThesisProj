import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Download,
  Mail,
  QrCode,
  RotateCcw,
  Shield,
  ShieldCheck,
  User,
  AlertCircle,
} from 'lucide-react';
import AppLayout from '@components/AppLayout';
import '../styles/digital-id.css';

const formatMembershipDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return value ?? 'N/A';
  }
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const getMemberInitials = (firstName = '', lastName = '') => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase();
  return initials || 'ALU';
};

export default function DigitalIdPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [showBack, setShowBack] = useState(false);

  const profilePhoto = useMemo(
    () => user.photo || user.profilePicture || user.avatar || null,
    [user.photo, user.profilePicture, user.avatar],
  );

  const qrImage = useMemo(() => {
    if (!user.qrCode) return null;
    if (user.qrCode.startsWith('data:') || user.qrCode.startsWith('http')) {
      return user.qrCode;
    }
    return null;
  }, [user.qrCode]);

  const qrReference = user.qrReference || user.qrCode || 'QR-0000';
  const companyName = user.company || user.union || 'ALU Member';
  const memberPosition = user.unionPosition || user.position || 'Member';

  const memberId = useMemo(() => {
    if (!user.digitalId) return 'ALU-000000';
    return user.digitalId;
  }, [user.digitalId]);

  const shortMemberId = useMemo(() => memberId.split('-').pop() ?? memberId, [memberId]);

  const isVerified = user?.isApproved === 'active' || user?.isApproved === 'approved' || user?.isApproved === true || user?.isApproved === 1 || user?.isApproved === '1';
  const isIncomplete = user?.isApproved === 'incomplete' || ((user?.isApproved === 'pending' || user?.isApproved === 0 || user?.isApproved === false) && !user?.dateOfBirth);

  if (!isVerified) {
    return (
      <AppLayout title="Digital Union ID" user={user} onLogout={onLogout}>
        <div className="digital-id-page">
          <header className="digital-id-page__hero">
            <div className="digital-id-page__hero-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1>Official ALU Membership ID</h1>
              <p>Tap to flip between the identity card and QR verification screen. Present together with a valid government ID.</p>
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
                ? "To access your Digital ID, your membership status must be verified. Please complete your profile to unlock this feature."
                : "Your membership application is currently under review. You will be able to access your Digital ID once your membership is approved."}
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
    <AppLayout title="Digital Union ID" user={user} onLogout={onLogout}>
      <div className="digital-id-page">
        <header className="digital-id-page__hero">
          <div className="digital-id-page__hero-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1>Official ALU Membership ID</h1>
            <p>Tap to flip between the identity card and QR verification screen. Present together with a valid government ID.</p>
          </div>
          <button type="button" onClick={() => setShowBack((prev) => !prev)}>
            <RotateCcw size={18} />
            {showBack ? 'Show Front' : 'Show QR Code'}
          </button>
        </header>

        <div className="digital-id-page__layout">
          <section
            className={`digital-id-card${showBack ? ' digital-id-card--flipped' : ''}`}
            onClick={() => setShowBack((prev) => !prev)}
            role="presentation"
          >
            <div className="digital-id-card__inner">
              <div className="digital-id-card__face digital-id-card__face--front">
                <div className="digital-id-card__header">
                  <div className="digital-id-card__seal">
                    <span>ALU</span>
                    <small>TUCP</small>
                  </div>
                  <div>
                    <p>ASSOCIATED LABOR UNIONS</p>
                    <span>No. 262, 15th Ave., Brgy. Silangan, Cubao, Quezon City</span>
                  </div>
                </div>
                <div className="digital-id-card__member-banner">MEMBER</div>
                <div className="digital-id-card__body">
                  <div className="digital-id-card__photo">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Member" />
                    ) : (
                      <div className="digital-id-card__initials">{getMemberInitials(user.firstName, user.lastName)}</div>
                    )}
                  </div>
                  <div className="digital-id-card__info">
                    <div className="digital-id-card__info-row">
                      <span>ID No.</span>
                      <strong>{shortMemberId}</strong>
                    </div>
                    <h2>
                      {user.firstName?.toUpperCase()} {user.lastName?.toUpperCase()}
                    </h2>
                    <div className="digital-id-card__meta">
                      <span>
                        <Building2 size={14} />
                        {companyName}
                      </span>
                      <span>
                        <User size={14} />
                        {memberPosition}
                      </span>
                      <span>
                        <CalendarDays size={14} />
                        Member since {formatMembershipDate(user.membershipDate)}
                      </span>
                      <span>
                        <QrCode size={14} />
                        QR Ref {qrReference}
                      </span>
                    </div>
                    <div className="digital-id-card__status">
                      <span className="digital-id-card__status-dot" />
                      Verified Member
                    </div>
                    <div className="digital-id-card__signature">Authorized Signature</div>
                  </div>
                </div>
              </div>

              <div className="digital-id-card__face digital-id-card__face--back">
                <div className="digital-id-card__header digital-id-card__header--back">
                  <div className="digital-id-card__seal">
                    <span>ALU</span>
                    <small>1954</small>
                  </div>
                  <div>
                    <p>ALU DIGITAL ID</p>
                    <span>Official Verification Code</span>
                  </div>
                </div>
                <div className="digital-id-card__qr">
                  <div className="digital-id-card__qr-box">
                    {qrImage ? <img src={qrImage} alt="Membership QR" /> : <QrCode size={168} />}
                  </div>
                  <div className="digital-id-card__qr-info">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <span>{memberId}</span>
                    <small>Scan to verify membership status</small>
                  </div>
                </div>
                <div className="digital-id-card__footer">
                  <ShieldCheck size={16} />
                  <span>ALU-TUCP © 2025 • Official Digital Identification</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="digital-id-sidebar">
            <div className="digital-id-sidebar__card">
              <h3>Manage your digital ID</h3>
              <div className="digital-id-sidebar__actions">
                <button type="button" className="digital-id-sidebar__action">
                  <Download size={16} />
                  Download PDF Copy
                </button>
                <button type="button" className="digital-id-sidebar__action">
                  <Mail size={16} />
                  Send to your email
                </button>
              </div>
              <p>Need a physical card? You can request one from the union office or during assemblies.</p>
            </div>

            <div className="digital-id-sidebar__card">
              <h3>How to use your ID</h3>
              <ul>
                <li>
                  <span className="dot dot--blue" />
                  Present during union assemblies, seminars, and benefit claims.
                </li>
                <li>
                  <span className="dot dot--green" />
                  Use the QR code for quick verification at partner offices.
                </li>
                <li>
                  <span className="dot dot--purple" />
                  Keep your profile photo updated for identification.
                </li>
                <li>
                  <span className="dot dot--orange" />
                  Report lost devices immediately to revoke access.
                </li>
              </ul>
            </div>

            <div className="digital-id-sidebar__cta">
              <div>
                <h4>Need help with verification?</h4>
                <p>Contact the membership desk for assistance with your digital credentials.</p>
              </div>
              <button type="button">
                Message Support
                <ChevronRight size={16} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

DigitalIdPage.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    position: PropTypes.string,
    company: PropTypes.string,
    photo: PropTypes.string,
    membershipDate: PropTypes.string,
    digitalId: PropTypes.string,
    qrCode: PropTypes.string,
    isApproved: PropTypes.bool,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};
