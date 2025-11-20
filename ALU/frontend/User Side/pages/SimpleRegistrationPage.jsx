import { useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Check, X, ArrowRight, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/auth.css';

export default function SimpleRegistrationPage({ onBack, onAutoLogin }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    hasMiddleInitial: false,
    middleInitial: '',
    lastName: '',
    email: '',
    verificationCode: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (pwd) => {
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
  };

  const passwordChecks = validatePassword(formData.password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleSendCode = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/quick-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send code');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: formData.verificationCode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!isPasswordValid) {
      setError("Please meet all password requirements");
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 1. Set Password
      const res = await fetch(`${API_URL}/api/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          middleInitial: formData.hasMiddleInitial ? formData.middleInitial : '',
          lastName: formData.lastName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      
      // 2. Auto Login
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.email,
          password: formData.password
        })
      });
      const loginData = await loginRes.json();
      
      if (!loginRes.ok) {
         // Fallback if auto-login fails
         navigate('/login');
         return;
      }

      // 3. Update App State
      if (onAutoLogin) {
        onAutoLogin(loginData.user);
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="auth-card__step">
      <div className="auth-card__field">
        <label htmlFor="firstName">First Name</label>
        <div className="auth-card__input">
          <User size={18} />
          <input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>
      </div>

      <div className="auth-card__checkbox-wrapper">
        <label className="auth-card__checkbox">
          <input
            type="checkbox"
            name="hasMiddleInitial"
            checked={formData.hasMiddleInitial}
            onChange={handleChange}
          />
          <span>I have a middle initial</span>
        </label>
      </div>

      {formData.hasMiddleInitial && (
        <div className="auth-card__field">
          <label htmlFor="middleInitial">Middle Initial</label>
          <div className="auth-card__input">
            <User size={18} />
            <input
              id="middleInitial"
              name="middleInitial"
              type="text"
              maxLength={3}
              placeholder="M.I."
              value={formData.middleInitial}
              onChange={handleChange}
            />
          </div>
        </div>
      )}

      <div className="auth-card__field">
        <label htmlFor="lastName">Last Name (Surname)</label>
        <div className="auth-card__input">
          <User size={18} />
          <input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="auth-card__field">
        <label htmlFor="email">Email Address</label>
        <div className="auth-card__input">
          <Mail size={18} />
          <input
            id="email"
            name="email"
            type="email"
            placeholder="your.email@company.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <button 
        type="button" 
        className="auth-card__submit" 
        onClick={handleSendCode} 
        disabled={loading || !formData.firstName || !formData.lastName || !formData.email}
      >
        {loading ? 'Sending...' : 'Send Verification Code'}
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="auth-card__step">
      <div className="auth-card__field">
        <label htmlFor="verificationCode">Verification Code</label>
        <p className="auth-card__hint">Enter the 6-digit code sent to {formData.email}</p>
        <div className="auth-card__input">
          <Lock size={18} />
          <input
            id="verificationCode"
            name="verificationCode"
            type="text"
            placeholder="000000"
            value={formData.verificationCode}
            onChange={handleChange}
            required
            maxLength={6}
            autoFocus
          />
        </div>
      </div>

      <div className="auth-card__actions">
        <button type="button" className="auth-card__back-btn" onClick={() => setStep(1)}>
          Back
        </button>
        <button 
          type="button" 
          className="auth-card__submit" 
          onClick={handleVerifyCode} 
          disabled={loading || formData.verificationCode.length < 6}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="auth-card__step">
      <div className="auth-card__field">
        <label htmlFor="password">Password</label>
        <div className="auth-card__input">
          <Lock size={18} />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            required
            autoFocus
          />
          <button
            type="button"
            className="auth-card__password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="auth-card__password-reqs">
        <div className={`req-item ${passwordChecks.length ? 'met' : ''}`}>
          {passwordChecks.length ? <Check size={14} /> : <div className="dot" />}
          At least 8 characters
        </div>
        <div className={`req-item ${passwordChecks.upper ? 'met' : ''}`}>
          {passwordChecks.upper ? <Check size={14} /> : <div className="dot" />}
          Uppercase letter (A-Z)
        </div>
        <div className={`req-item ${passwordChecks.lower ? 'met' : ''}`}>
          {passwordChecks.lower ? <Check size={14} /> : <div className="dot" />}
          Lowercase letter (a-z)
        </div>
        <div className={`req-item ${passwordChecks.number ? 'met' : ''}`}>
          {passwordChecks.number ? <Check size={14} /> : <div className="dot" />}
          Number (0-9)
        </div>
        <div className={`req-item ${passwordChecks.special ? 'met' : ''}`}>
          {passwordChecks.special ? <Check size={14} /> : <div className="dot" />}
          Special character (!@#$%)
        </div>
      </div>

      <div className="auth-card__field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className="auth-card__input">
          <Lock size={18} />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="auth-card__actions">
        <button type="button" className="auth-card__back-btn" onClick={() => setStep(2)}>
          Back
        </button>
        <button 
          type="submit" 
          className="auth-card__submit" 
          onClick={handleCreateAccount}
          disabled={loading || !isPasswordValid || !formData.confirmPassword}
        >
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <div className="auth-page__header-inner">
          <button type="button" className="auth-page__back" onClick={step === 1 ? onBack : () => setStep(step - 1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="auth-page__title">
            <h1>Create Account</h1>
          </div>
        </div>
      </header>

      <main className="auth-page__body">
        <div className="auth-page__inner">
          <div className="auth-card">
            <div className="auth-card__header">
              <h2>
                {step === 1 && "Create Your Account"}
                {step === 2 && "Verify Email"}
                {step === 3 && "Secure Your Account"}
              </h2>
              <p>
                {step === 1 && "Join the Associated Labor Union with just a few basic details"}
                {step === 2 && "We sent a code to your email address"}
                {step === 3 && "Set a strong password for your account"}
              </p>
            </div>

            <div className="auth-card__progress">
              <div className={`auth-card__progress-step ${step >= 1 ? 'active' : ''}`} />
              <div className={`auth-card__progress-step ${step >= 2 ? 'active' : ''}`} />
              <div className={`auth-card__progress-step ${step >= 3 ? 'active' : ''}`} />
            </div>

            <form className="auth-card__form">
              {error && (
                <div className="auth-card__alert auth-card__alert--error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </form>

            {step === 1 && (
              <div className="auth-card__footer">
                <span>Already have an account?</span>
                <Link to="/login">Sign In</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

SimpleRegistrationPage.propTypes = {
  onSubmit: PropTypes.func,
  onBack: PropTypes.func.isRequired,
};

SimpleRegistrationPage.defaultProps = {
  onSubmit: () => {},
};
