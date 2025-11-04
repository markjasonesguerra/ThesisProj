import { useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft } from 'lucide-react';
import '../../src/App.css';
import '../styles/auth.css';
import '../styles/quick-registration.css';

export default function QuickRegistrationPage({ onBack, onNext, submitting }) {
  const [firstName, setFirstName] = useState('');
  const [hasMiddle, setHasMiddle] = useState(false);
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const disabled = !firstName.trim() || !lastName.trim() || !email.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled || submitting) return;
    onNext({ firstName: firstName.trim(), middleInitial: hasMiddle ? middleInitial.trim() || null : null, lastName: lastName.trim(), email: email.trim() });
  };

  return (
    <div className="quick-registration-page auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <button type="button" className="auth-back" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="auth-icon">🔵</div>
        <h1>Create Your Account</h1>
        <p className="muted">Join the Associated Labor Union with just a few basic details</p>

        <div className="form-grid">
          <label className="form-field">
            <span>First Name</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter your first name" />
          </label>

          <label className="form-field form-field--checkbox">
            <input type="checkbox" checked={hasMiddle} onChange={(e) => setHasMiddle(e.target.checked)} />
            <span>I have a middle initial</span>
          </label>

          {hasMiddle && (
            <label className="form-field">
              <span>Middle Initial</span>
              <input value={middleInitial} maxLength={2} onChange={(e) => setMiddleInitial(e.target.value)} placeholder="M" />
            </label>
          )}

          <label className="form-field">
            <span>Last Name (Surname)</span>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter your last name" />
          </label>

          <label className="form-field">
            <span>Email Address</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@company.com" />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={disabled || submitting}>
            {submitting ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>

        <div className="card-note">
          <strong>What happens next?</strong>
          <ul>
            <li>We'll send a verification code to your email</li>
            <li>Enter the code to verify your email address</li>
            <li>Set up a secure password for your account</li>
          </ul>
        </div>
      </form>
    </div>
  );
}

QuickRegistrationPage.propTypes = {
  onBack: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

QuickRegistrationPage.defaultProps = { submitting: false };
