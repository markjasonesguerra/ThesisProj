import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../styles/auth.css';
import '../styles/email-verification.css';

export default function EmailVerificationPage({ email, onVerify, onResend, onBack }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const handleChange = (idx, value) => {
    const v = value.replace(/\D/g, '').slice(0, 1);
    setCode((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    // auto-focus next input when user types
    if (v && idx < 5) {
      const nextInput = document.getElementById(`verify-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const digits = paste.replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    const next = ['','','','','',''];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setCode(next);
  };

  const joined = code.join('');
  const isValid = joined.length === 6;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    // in demo mode accept 123456 or 000000
    if (joined === '123456' || joined === '000000') {
      onVerify();
    } else {
      // for now accept any code to progress (or you can add validation)
      onVerify();
    }
  };

  const handleResend = () => {
    setSeconds(60);
    onResend && onResend(email);
  };

  return (
    <div className="email-verification-page auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <button type="button" className="auth-back" onClick={onBack}>Back</button>
        <div className="auth-icon">✉️</div>
        <h1>Verify Your Email</h1>
        <p className="muted">Enter the verification code sent to your email address</p>

        <div className="verify-email-card">
          <div className="verify-email-to">Code sent to: <strong>{email}</strong></div>
          <div className="verify-code-inputs" onPaste={handlePaste}>
            {code.map((c, i) => (
              <input
                key={i}
                id={`verify-${i}`}
                className="verify-input"
                inputMode="numeric"
                pattern="[0-9]*"
                value={c}
                onChange={(e) => handleChange(i, e.target.value)}
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          <button type="submit" className="button button--primary" disabled={!isValid}>Verify & Create Account</button>

          <div className="resend">
            {!seconds ? (
              <button type="button" className="button button--link" onClick={handleResend}>Resend</button>
            ) : (
              <button type="button" className="button button--outline" disabled>Resend in {seconds}s</button>
            )}
          </div>

          
        </div>
      </form>
    </div>
  );
}

EmailVerificationPage.propTypes = {
  email: PropTypes.string.isRequired,
  onVerify: PropTypes.func.isRequired,
  onResend: PropTypes.func,
  onBack: PropTypes.func.isRequired,
};
