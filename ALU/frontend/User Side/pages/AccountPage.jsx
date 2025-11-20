import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  Camera,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  ExternalLink,
  LogOut,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  User,
} from 'lucide-react';
import AppLayout from '@components/AppLayout';
import '../styles/account.css';

const formatDate = (value, options) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US', options);
};

const getInitials = (firstName = '', lastName = '') => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase();
  return initials || 'ALU';
};

function AccountModal({ title, tone, size, icon: Icon, onClose, children }) {
  return (
    <div className="account-modal">
      <div className="account-modal__backdrop" role="presentation" onClick={onClose} />
      <div className={`account-modal__panel account-modal__panel--${tone} account-modal__panel--${size}`}>
        <header>
          <div className="account-modal__icon">
            <Icon size={18} />
          </div>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </header>
        <div className="account-modal__content">{children}</div>
      </div>
    </div>
  );
}

AccountModal.propTypes = {
  title: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['blue', 'green', 'purple']).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  icon: PropTypes.elementType.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

AccountModal.defaultProps = {
  size: 'md',
};

export default function AccountPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [showPersonal, setShowPersonal] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showEmployment, setShowEmployment] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedAspects, setSelectedAspects] = useState([]);
  const [allowFollowUp, setAllowFollowUp] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(false);
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    smsAlerts: false,
    monthlyDigest: true,
    betaFeatures: false,
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState({ error: '', success: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordRequirements = useMemo(
    () => [
      {
        label: 'At least 8 characters',
        test: (value) => value.length >= 8,
      },
      {
        label: 'One uppercase letter',
        test: (value) => /[A-Z]/.test(value),
      },
      {
        label: 'One lowercase letter',
        test: (value) => /[a-z]/.test(value),
      },
      {
        label: 'One number',
        test: (value) => /[0-9]/.test(value),
      },
      {
        label: 'One special character',
        test: (value) => /[^A-Za-z0-9]/.test(value),
      },
    ],
    [],
  );

  const togglePreference = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const preferenceOptions = useMemo(
    () => [
      {
        key: 'emailAlerts',
        label: 'Email notifications',
        description: 'Receive account updates, approvals, and reminders through your registered email.',
      },
      {
        key: 'smsAlerts',
        label: 'SMS alerts',
        description: 'Get urgent announcements and time-sensitive notices via text message.',
      },
      {
        key: 'monthlyDigest',
        label: 'Monthly activity digest',
        description: 'Summary of dues, benefits, and new features sent at the start of every month.',
      },
      {
        key: 'betaFeatures',
        label: 'Preview beta features',
        description: 'Help test upcoming tools before public launch and share product feedback.',
      },
    ],
    [],
  );

  const ratingLabels = useMemo(
    () => ({
      1: 'Very dissatisfied',
      2: 'Needs improvement',
      3: 'Average experience',
      4: 'Good experience',
      5: 'Excellent experience',
    }),
    [],
  );

  const feedbackTags = useMemo(
    () => [
      'Ease of use',
      'Navigation',
      'Visual design',
      'Member services info',
      'Speed & performance',
      'Mobile responsiveness',
    ],
    [],
  );

  const ratingHint = rating ? ratingLabels[rating] : 'Tap a star to rate your experience';
  const trimmedFeedback = feedback.trim();
  const trimmedCurrentPassword = passwordForm.current.trim();
  const trimmedNewPassword = passwordForm.next.trim();
  const trimmedConfirmPassword = passwordForm.confirm.trim();
  const currentPasswordReady = trimmedCurrentPassword.length > 0;
  const newPasswordIsValid = trimmedNewPassword.length > 0 && passwordRequirements.every(({ test }) => test(trimmedNewPassword));
  const confirmPasswordMatches =
    trimmedConfirmPassword.length > 0 && trimmedNewPassword === trimmedConfirmPassword;

  const toggleAspect = (tag) => {
    setSelectedAspects((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const resetRatingState = () => {
    setRating(0);
    setFeedback('');
    setSelectedAspects([]);
    setAllowFollowUp(false);
    setSubmittedFeedback(false);
  };

  const handleSubmitRating = () => {
    setFeedback((current) => current.trim());
    setSubmittedFeedback(true);
  };

  const updatePasswordForm = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordStatus({ error: '', success: '' });
  };

  const resetPasswordState = () => {
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordStatus({ error: '', success: '' });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChangePasswordSubmit = (event) => {
    event.preventDefault();
    const current = passwordForm.current.trim();
    const next = passwordForm.next.trim();
    const confirm = passwordForm.confirm.trim();

    if (!current || !next || !confirm) {
      setPasswordStatus({ error: 'Please fill in every field before updating your password.', success: '' });
      return;
    }

    const unmetRequirement = passwordRequirements.find(({ test }) => !test(next));
    if (unmetRequirement) {
      setPasswordStatus({
        error: `New password must include ${unmetRequirement.label.toLowerCase()}.`,
        success: '',
      });
      return;
    }

    if (next !== confirm) {
      setPasswordStatus({ error: 'New password and confirmation do not match.', success: '' });
      return;
    }

    setPasswordStatus({
      error: '',
      success: 'Password updated. This change will apply once backend integration is enabled.',
    });
    setPasswordForm({ current: '', next: '', confirm: '' });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const faqEntries = [
    {
      question: 'How do I complete my membership profile after logging in?',
      answer:
        'Open the Membership Form from the dashboard or Quick Access panel and supply your employment, contact, and emergency contact details. Submit the form so the admin team can verify your application.',
    },
    {
      question: 'Where can I see the status of my registration or approval?',
      answer:
        'Visit the Dashboard or the Membership Form page. Pending items display status banners, and you will receive email notices once the admin approves your membership.',
    },
    {
      question: 'How are monthly dues tracked inside the portal?',
      answer:
        'The Dues Tracker shows every contribution, payroll deduction, or outstanding balance. You can download statements or contact the finance desk for reconciliation.',
    },
    {
      question: 'How do I request union assistance or benefits?',
      answer:
        'Navigate to the Benefits section and click “Request Assistance.” Choose the program, describe your request, and upload supporting documents. You will receive updates through the portal and email.',
    },
    {
      question: 'How can I get a digital or physical union ID?',
      answer:
        'After approval, go to the Digital ID page to access your QR-enabled card. For physical IDs, submit a request through admin or the ID Issuance queue, and you will receive collection instructions.',
    },
  ];

  const memberSinceYear = useMemo(() => {
    if (!user.membershipDate) return '—';
    const date = new Date(user.membershipDate);
    return Number.isNaN(date.getTime()) ? user.membershipDate : date.getFullYear();
  }, [user.membershipDate]);

  const profileSections = [
    {
      title: 'Personal Information',
      subtitle: 'Basic details and personal data',
      icon: User,
      tone: 'blue',
      action: () => setShowPersonal(true),
    },
    {
      title: 'Contact & Address',
      subtitle: 'Phone, email, and location details',
      icon: Mail,
      tone: 'green',
      action: () => setShowContact(true),
    },
    {
      title: 'Employment Details',
      subtitle: 'Company, role, and union profile',
      icon: Briefcase,
      tone: 'purple',
      action: () => setShowEmployment(true),
    },
  ];

  const menuItems = [
    {
      title: 'Benefits & Services',
      subtitle: 'View available member benefits',
      icon: Award,
      action: () => navigate('/benefits'),
    },
    {
      title: 'FAQs',
      subtitle: 'Frequently asked questions',
      icon: HelpCircle,
      action: () => setShowFaq(true),
    },
    {
      title: 'About ALU',
      subtitle: 'Learn more about our union',
      icon: Info,
      action: () => setShowAbout(true),
    },
    {
      title: 'Contact Support',
      subtitle: 'Get help and assistance',
      icon: Phone,
      action: () => setShowSupport(true),
    },
    {
      title: 'Rate our Website',
      subtitle: 'Share your experience with us',
      icon: Star,
      action: () => setShowRate(true),
    },
    {
      title: 'Settings',
      subtitle: 'Notifications and preferences',
      icon: Settings,
      action: () => setShowSettings(true),
    },
    {
      title: 'Log out',
      subtitle: 'Sign out of your account',
      icon: LogOut,
      action: onLogout,
      danger: true,
    },
  ];

  const aboutDetails = [
    {
      label: 'Who we are',
      value:
        'The Associated Labor Unions (ALU) is the largest labor federation in the Philippines, advocating for workers’ rights and welfare since 1954.',
    },
    {
      label: 'What we do',
      value:
        'We provide collective bargaining support, legal and medical assistance, emergency relief, and training programs to empower members across Luzon.',
    },
    {
      label: 'Digital services',
      value:
        'ALUzon centralizes membership registration, dues tracking, digital IDs, and benefits requests so members stay connected wherever they are.',
    },
    {
      label: 'Regional office',
      value: '262 15th Ave, Cubao, Quezon City, 1109 Metro Manila',
      mapUrl: 'https://www.google.com/maps?q=262+15th+Ave,+Cubao,+Quezon+City,+1109+Metro+Manila',
    },
  ];

  const supportContacts = [
    { icon: Phone, label: 'Hotline', value: '(02) 8123-4567' },
    { icon: Mail, label: 'Email', value: 'support@aluzon.ph' },
    { icon: Building2, label: 'Office Hours', value: 'Mon – Fri • 8:00 AM – 5:00 PM' },
  ];

  const isVerified = user?.isApproved === 'active' || user?.isApproved === 'approved' || user?.isApproved === true || user?.isApproved === 1 || user?.isApproved === '1';
  const isIncomplete = user?.isApproved === 'incomplete';

  return (
    <AppLayout title="Account" user={user} onLogout={onLogout}>
      <div className="account-page">
        <section className="account-page__hero">
          <div className="account-page__hero-content">
            <button
              type="button"
              className="account-page__avatar"
              onClick={() => setShowPersonal(true)}
            >
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Member" />
              ) : (
                <span>{getInitials(user.firstName, user.lastName)}</span>
              )}
              <span className="account-page__avatar-edit">
                <Camera size={14} />
              </span>
            </button>
            <div>
              <h1>Hi, {user.firstName}!</h1>
              <div className="account-page__contact">
                <span>
                  <Phone size={14} />
                  {user.phone ?? '+63 ••••••••••'}
                </span>
                <span>
                  <Mail size={14} />
                  {user.email}
                </span>
                <span>
                  <ShieldCheck size={14} />
                  {user.digitalId ?? 'ALU-000000'}
                </span>
              </div>
            </div>
          </div>

          <div className="account-page__stats">
            <div>
              <span>Member Since</span>
              <strong>{memberSinceYear}</strong>
            </div>
            <div>
              <span>Union Position</span>
              <strong>{user.unionPosition ?? 'Member'}</strong>
            </div>
            <div>
              <span>Company</span>
              <strong>{user.company ?? 'Associated Labor Unions'}</strong>
            </div>
          </div>
        </section>

        <div className="account-page__layout">
          <div className="account-page__column">
            <div className="account-page__section-heading">
              <h2>Profile Information</h2>
              <p>Access and review your membership details</p>
            </div>
            <div className="account-page__cards">
              {profileSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.title}
                    type="button"
                    className={`account-card account-card--${section.tone}`}
                    onClick={section.action}
                  >
                    <div className="account-card__icon">
                      <Icon size={18} />
                    </div>
                    <div className="account-card__body">
                      <strong>{section.title}</strong>
                      <span>{section.subtitle}</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="account-page__column">
            <div className="account-page__section-heading">
              <h2>App Features &amp; Settings</h2>
              <p>Manage tools, preferences, and quick actions</p>
            </div>
            <div className="account-menu">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    className={`account-menu__item${item.danger ? ' account-menu__item--danger' : ''}`}
                    onClick={item.action}
                  >
                    <div className="account-menu__icon">
                      <Icon size={18} />
                    </div>
                    <div className="account-menu__details">
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                );
              })}
            </div>

            <div className="account-quick">
              <h3>Quick Access</h3>
              <div className="account-quick__grid">
                <button type="button" onClick={() => navigate('/digital-id')}>
                  <QrCode size={18} />
                  Digital ID
                </button>
                <button type="button" onClick={() => navigate('/dues')}>
                  <Calendar size={18} />
                  Dues Tracker
                </button>
                <button type="button" onClick={() => navigate('/news')}>
                  <Info size={18} />
                  Union News
                </button>
                <button type="button" onClick={() => navigate(isIncomplete ? '/complete-profile' : '/membership-form')}>
                  <PenIcon size={18} />
                  {isIncomplete ? 'Complete Verification' : 'Update Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="account-page__verification">
          <div className="account-page__verification-icon">
            <Shield size={22} />
          </div>
          <div>
            <h3>{isVerified ? 'Verified Member' : (isIncomplete ? 'Verification Required' : 'Pending Approval')}</h3>
            <p>{isVerified 
                ? `Your documents were confirmed on ${formatDate(user.verifiedDate ?? user.membershipDate, { month: 'long', day: 'numeric', year: 'numeric' })}.`
                : (isIncomplete 
                    ? "Please complete your profile to verify your membership." 
                    : "Your application is currently under review.")
            }</p>
          </div>
          <button type="button" className="button button--secondary" onClick={() => navigate(isVerified ? '/digital-id' : (isIncomplete ? '/complete-profile' : '/membership-form'))}>
            {isVerified ? 'View Digital ID' : (isIncomplete ? 'Complete Verification' : 'View Application')}
          </button>
        </section>
      </div>

      {showPersonal && (
        <AccountModal
          title="Personal Details"
          tone="blue"
          icon={User}
          onClose={() => setShowPersonal(false)}
        >
          <div className="account-modal__profile">
            <div className="account-modal__photo">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Member" />
              ) : (
                <User size={32} />
              )}
            </div>
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              <span>{user.digitalId ?? 'ALU-000000'}</span>
            </div>
          </div>
          <div className="account-modal__list">
            <div>
              <span>Date of Birth</span>
              <strong>{formatDate(user.dateOfBirth, { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
            </div>
            <div>
              <span>Gender</span>
              <strong>{user.gender ?? 'Not provided'}</strong>
            </div>
            <div>
              <span>Marital Status</span>
              <strong>{user.maritalStatus ?? 'Not provided'}</strong>
            </div>
            {user.numberOfChildren != null && (
              <div>
                <span>Children</span>
                <strong>{user.numberOfChildren}</strong>
              </div>
            )}
            {user.religion && (
              <div>
                <span>Religion</span>
                <strong>{user.religion}</strong>
              </div>
            )}
            {user.education && (
              <div>
                <span>Education</span>
                <strong>{user.education}</strong>
              </div>
            )}
          </div>
        </AccountModal>
      )}

      {showContact && (
        <AccountModal
          title="Contact & Address"
          tone="green"
          icon={Mail}
          onClose={() => setShowContact(false)}
        >
          <div className="account-modal__list">
            <div>
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{user.phone ?? 'Not provided'}</strong>
            </div>
            <div>
              <span>Address</span>
              <strong>{user.address ?? 'Not provided'}</strong>
            </div>
          </div>
          {user.emergencyContact && (
            <div className="account-modal__emergency">
              <h3>Emergency Contact</h3>
              <div className="account-modal__list">
                <div>
                  <span>Name</span>
                  <strong>{user.emergencyContact.name}</strong>
                </div>
                <div>
                  <span>Relationship</span>
                  <strong>{user.emergencyContact.relationship}</strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{user.emergencyContact.phone}</strong>
                </div>
              </div>
            </div>
          )}
        </AccountModal>
      )}

      {showEmployment && (
        <AccountModal
          title="Employment Details"
          tone="purple"
          icon={Briefcase}
          onClose={() => setShowEmployment(false)}
        >
          <div className="account-modal__list">
            <div>
              <span>Company</span>
              <strong>{user.company ?? 'Not provided'}</strong>
            </div>
            <div>
              <span>Position</span>
              <strong>{user.position ?? 'Not provided'}</strong>
            </div>
            {user.department && (
              <div>
                <span>Department</span>
                <strong>{user.department}</strong>
              </div>
            )}
            {user.yearsEmployed != null && (
              <div>
                <span>Years Employed</span>
                <strong>{user.yearsEmployed}</strong>
              </div>
            )}
          </div>
          <div className="account-modal__list account-modal__list--accent">
            <div>
              <span>Union Position</span>
              <strong>{user.unionPosition ?? 'Member'}</strong>
            </div>
            <div>
              <span>Member Since</span>
              <strong>{formatDate(user.membershipDate, { month: 'long', year: 'numeric' })}</strong>
            </div>
            {user.unionAffiliation && (
              <div>
                <span>Affiliation</span>
                <strong>{user.unionAffiliation}</strong>
              </div>
            )}
          </div>
        </AccountModal>
      )}

      {showFaq && (
        <AccountModal
          title="Frequently Asked Questions"
          tone="blue"
          size="lg"
          icon={HelpCircle}
          onClose={() => setShowFaq(false)}
        >
          <div className="account-modal__list">
            {faqEntries.map((entry) => (
              <div key={entry.question}>
                <span>{entry.question}</span>
                <strong>{entry.answer}</strong>
              </div>
            ))}
          </div>
        </AccountModal>
      )}

      {showAbout && (
        <AccountModal
          title="About Associated Labor Unions"
          tone="purple"
          size="lg"
          icon={Info}
          onClose={() => setShowAbout(false)}
        >
          <div className="account-modal__list">
            {aboutDetails.map((entry) => (
              <div key={entry.label}>
                <span>{entry.label}</span>
                {entry.mapUrl ? (
                  <strong>
                    <a
                      className="account-modal__address-link"
                      href={entry.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {entry.value}
                      <ExternalLink size={14} />
                    </a>
                  </strong>
                ) : (
                  <strong>{entry.value}</strong>
                )}
              </div>
            ))}
          </div>
          <div className="account-modal__list account-modal__list--accent">
            {supportContacts.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <span>{label}</span>
                <strong>
                  <Icon size={14} style={{ marginRight: 8 }} />
                  {value}
                </strong>
              </div>
            ))}
          </div>
          <p className="account-modal__footnote">
            ALU is a proud founding affiliate of the Trade Union Congress of the Philippines, representing workers in
            19,000+ workplaces across Luzon.
          </p>
        </AccountModal>
      )}

      {showSupport && (
        <AccountModal
          title="Contact Member Support"
          tone="green"
          size="lg"
          icon={Phone}
          onClose={() => setShowSupport(false)}
        >
          <div className="account-modal__list account-modal__list--accent">
            {supportContacts.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <span>{label}</span>
                <strong>
                  <Icon size={14} style={{ marginRight: 8 }} />
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <div className="account-modal__list">
            <div>
              <span>Emergency Assistance</span>
              <strong>Dial hotline and press 1 for urgent medical or legal support. Available 24/7.</strong>
            </div>
            <div>
              <span>Member Services Desk</span>
              <strong>Email documents to benefits@aluzon.ph for faster processing of claims and requests.</strong>
            </div>
            <div>
              <span>Regional Offices</span>
              <strong>
                Luzon HQ, ALU-AFILUTE Building, 262 15th Ave., Cubao, Quezon City
              </strong>
            </div>
          </div>

          <p className="account-modal__footnote">
            Tip: Attach your membership ID or digital ID screenshot when emailing to speed up verification.
          </p>
        </AccountModal>
      )}

      {showSettings && (
        <AccountModal
          title="Account Settings"
          tone="blue"
          size="lg"
          icon={Settings}
          onClose={() => setShowSettings(false)}
        >
          <div className="account-settings">
            <div className="account-settings__group">
              {preferenceOptions.map(({ key, label, description }) => (
                <label key={key} className="account-toggle">
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={() => togglePreference(key)}
                    aria-label={label}
                  />
                  <span className="account-toggle__switch">
                    <span className="account-toggle__thumb" />
                  </span>
                  <div className="account-toggle__meta">
                    <strong>{label}</strong>
                    <p>{description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="account-settings__cta">
              <div className="account-settings__cta-text">
                <strong>Keep your account secure</strong>
                <span>Refresh your password regularly to protect your membership information.</span>
              </div>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setShowSettings(false);
                  setShowChangePassword(true);
                }}
              >
                Change password
              </button>
            </div>
          </div>

          <div className="account-modal__list account-modal__list--accent">
            <div>
              <span>Last password update</span>
              <strong>{formatDate(user.passwordUpdatedAt ?? user.verifiedDate, { month: 'long', year: 'numeric' })}</strong>
            </div>
            <div>
              <span>Session devices</span>
              <strong>ALU Web Portal • Chrome • Manila</strong>
            </div>
            <div>
              <span>Two-factor authentication</span>
              <strong>Contact support to enable SMS verification.</strong>
            </div>
          </div>

          <p className="account-modal__footnote">
            Preference changes are stored locally until backend integration is enabled. Contact support for security updates.
          </p>
        </AccountModal>
      )}

      {showChangePassword && (
        <AccountModal
          title="Change Password"
          tone="purple"
          size="md"
          icon={Shield}
          onClose={() => {
            setShowChangePassword(false);
            resetPasswordState();
          }}
        >
          <form className="account-modal__form" onSubmit={handleChangePasswordSubmit}>
            <div
              className={`account-modal__field${currentPasswordReady ? ' account-modal__field--valid' : ''}`}
            >
              <label htmlFor="account-password-current">Current password</label>
              <input
                id="account-password-current"
                type="password"
                value={passwordForm.current}
                onChange={(event) => updatePasswordForm('current', event.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
            </div>
            <div
              className={`account-modal__field${newPasswordIsValid ? ' account-modal__field--valid' : ''}`}
            >
              <label htmlFor="account-password-new">New password</label>
              <div className="account-modal__input-group">
                <input
                  id="account-password-new"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.next}
                  onChange={(event) => updatePasswordForm('next', event.target.value)}
                  placeholder="Choose a new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="account-modal__input-toggle"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="account-password-reqs">
              <strong>Password Requirements:</strong>
              <ul>
                {passwordRequirements.map(({ label, test }) => {
                  const met = test(trimmedNewPassword);
                  return (
                    <li
                      key={label}
                      className={`account-password-req${met ? ' account-password-req--met' : ''}`}
                    >
                      <span className="account-password-req__icon" aria-hidden="true">
                        {met ? '✓' : '•'}
                      </span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div
              className={`account-modal__field${
                confirmPasswordMatches ? ' account-modal__field--valid' : ''
              }`}
            >
              <label htmlFor="account-password-confirm">Confirm new password</label>
              <div className="account-modal__input-group">
                <input
                  id="account-password-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirm}
                  onChange={(event) => updatePasswordForm('confirm', event.target.value)}
                  placeholder="Re-enter the new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="account-modal__input-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {passwordStatus.error ? (
              <p className="account-modal__status account-modal__status--error">{passwordStatus.error}</p>
            ) : null}
            {passwordStatus.success ? (
              <p className="account-modal__status account-modal__status--success">{passwordStatus.success}</p>
            ) : null}

            <div className="account-modal__actions">
              <button type="submit" className="button button--secondary">
                Update password
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setShowChangePassword(false);
                  resetPasswordState();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </AccountModal>
      )}

      {showRate && (
        <AccountModal
          title="Rate our Website"
          tone="blue"
          size="lg"
          icon={Star}
          onClose={() => {
            setShowRate(false);
            resetRatingState();
          }}
        >
          <div className="account-rating__hero">
            <div className="account-rating__icon">⭐</div>
            <div className="account-rating__summary">
              <h3>Overall experience</h3>
              <p>Tell us how well the ALUzon member portal supports your needs today.</p>
              <div
                className="account-rating__stars"
                role="radiogroup"
                aria-label="Overall website experience rating"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={`account-rating__star${rating >= value ? ' account-rating__star--active' : ''}`}
                    onClick={() => setRating(value)}
                    aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                    aria-pressed={rating === value}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="account-rating__hint">{ratingHint}</p>
            </div>
          </div>

          <div className="account-rating__section">
            <header>
              <h4>Focus areas</h4>
              <p>Select the parts of the experience you want us to improve or keep strong.</p>
            </header>
            <div
              className="account-rating__chips"
              role="group"
              aria-label="Focus areas for feedback"
            >
              {feedbackTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={`account-rating__chip${selectedAspects.includes(tag) ? ' account-rating__chip--active' : ''}`}
                  onClick={() => toggleAspect(tag)}
                >
                  <span className="account-rating__chip-dot" aria-hidden="true" />
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="account-rating__section">
            <header>
              <h4>Share more details</h4>
              <p>Describe what worked well or what we should improve for your next visit.</p>
            </header>
            <textarea
              className="account-rating__textarea"
              rows={4}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Share what you liked or what we can improve…"
            />
            <label htmlFor="account-rating-followup" className="account-rating__toggle">
              <input
                id="account-rating-followup"
                type="checkbox"
                checked={allowFollowUp}
                onChange={(event) => setAllowFollowUp(event.target.checked)}
              />
              <span>Allow the ALU digital team to follow up via your registered email.</span>
            </label>
          </div>

          {submittedFeedback ? (
            <div className="account-rating__thanks">
              <h3>Thank you for the feedback!</h3>
              <p>We recorded a {rating}-star experience.</p>
              {selectedAspects.length > 0 ? (
                <p>
                  Focus areas noted: <strong>{selectedAspects.join(', ')}</strong>
                </p>
              ) : null}
              {trimmedFeedback ? <p>“{trimmedFeedback}”</p> : null}
              <p>
                {allowFollowUp
                  ? 'Our digital team may reach out through your registered email for clarifications.'
                  : 'We continuously iterate on ALUzon based on member stories like yours.'}
              </p>
            </div>
          ) : (
            <div className="account-rating__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={handleSubmitRating}
                disabled={rating === 0}
              >
                Submit response
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setShowRate(false);
                  resetRatingState();
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </AccountModal>
      )}
    </AppLayout>
  );
}

const PenIcon = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

PenIcon.propTypes = {
  className: PropTypes.string,
};

PenIcon.defaultProps = {
  className: undefined,
};

AccountPage.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    address: PropTypes.string,
    company: PropTypes.string,
    position: PropTypes.string,
    department: PropTypes.string,
    unionPosition: PropTypes.string,
    unionAffiliation: PropTypes.string,
    membershipDate: PropTypes.string,
    verifiedDate: PropTypes.string,
    profilePicture: PropTypes.string,
    digitalId: PropTypes.string,
    dateOfBirth: PropTypes.string,
    gender: PropTypes.string,
    maritalStatus: PropTypes.string,
    numberOfChildren: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    religion: PropTypes.string,
    education: PropTypes.string,
    yearsEmployed: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    emergencyContact: PropTypes.shape({
      name: PropTypes.string,
      relationship: PropTypes.string,
      phone: PropTypes.string,
    }),
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};
