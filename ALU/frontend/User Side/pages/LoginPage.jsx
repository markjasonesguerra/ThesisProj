import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import '../styles/auth.css';

export default function LoginPage({ onSubmit, onCreateAccount, onBack, submitting, submitError }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState('email');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ identifier, password, method });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onCreateAccount();
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <div className="auth-page__header-inner">
          <button type="button" className="auth-page__back" onClick={handleBack} aria-label="Back to landing">
            <ArrowLeft size={18} />
          </button>
          <div className="auth-page__title">
            <div className="auth-page__title-icon">
              <Shield size={18} />
            </div>
            <div>
              <h1>ALUzon Login</h1>
              <p>Secure member access</p>
            </div>
          </div>
        </div>
      </header>

      <main className="auth-page__body">
        <div className="auth-page__inner">
          <section className="auth-page__intro">
            <div className="auth-page__badge">Secure Member Access</div>
            <h2>Welcome back to ALUzon</h2>
            <p>
              Sign in using your registered email or mobile number to manage your membership profile, dues, and
              benefits. Your login is protected using industry standard encryption.
            </p>
            <ul>
              <li>
                <ShieldCheck size={18} />
                Protected login with multi-layer security safeguards.
              </li>
              <li>
                <ShieldCheck size={18} />
                Access personalized dashboards and your digital union ID.
              </li>
            </ul>
          </section>

          <section className="auth-page__form">
            <div className="auth-card">
              <div className="auth-card__toggle">
                <button
                  type="button"
                  className={method === 'email' ? 'auth-card__toggle-btn auth-card__toggle-btn--active' : 'auth-card__toggle-btn'}
                  onClick={() => setMethod('email')}
                >
                  <Mail size={16} />
                  Email Login
                </button>
                <button
                  type="button"
                  className={method === 'mobile' ? 'auth-card__toggle-btn auth-card__toggle-btn--active' : 'auth-card__toggle-btn'}
                  onClick={() => setMethod('mobile')}
                >
                  <Phone size={16} />
                  Phone Login
                </button>
              </div>

              <form onSubmit={handleSubmit} className="auth-card__form">
                {submitError && (
                  <div className="auth-card__alert auth-card__alert--error" style={{ color: 'red', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    <span>{submitError}</span>
                  </div>
                )}
                <label htmlFor="identifier">{method === 'email' ? 'Email address' : 'Phone number'}</label>
                <div className="auth-card__input">
                  {method === 'email' ? <Mail size={18} /> : <Phone size={18} />}
                  <input
                    id="identifier"
                    type={method === 'email' ? 'email' : 'tel'}
                    placeholder={method === 'email' ? 'juan.delacruz@alu.org' : '+63 900 000 0000'}
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    required
                  />
                </div>

                <label htmlFor="password">Password</label>
                <div className="auth-card__input">
                  <Lock size={18} />
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your secure password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="auth-card__submit" disabled={submitting}>
                  {submitting ? 'Signing in...' : 'Continue'}
                  {!submitting && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="auth-card__footer">
                <span>Need an account?</span>
                <button type="button" onClick={onCreateAccount}>
                  <UserPlus size={16} />
                  Start Registration
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="auth-page__footer">
        <p>Need help? Contact your union representative</p>
        <p>Associated Labor Union - Luzon Regional</p>
      </footer>
    </div>
  );
}

LoginPage.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCreateAccount: PropTypes.func.isRequired,
  onBack: PropTypes.func,
  submitting: PropTypes.bool,
  submitError: PropTypes.string,
};

LoginPage.defaultProps = {
  onBack: null,
  submitting: false,
  submitError: '',
};
