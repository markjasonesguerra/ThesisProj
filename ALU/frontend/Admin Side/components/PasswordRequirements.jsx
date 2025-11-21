import PropTypes from 'prop-types';
import { Check, Circle } from 'lucide-react';
import '../styles/admin-base.css';

export default function PasswordRequirements({ password }) {
  const requirements = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One lowercase letter", valid: /[a-z]/.test(password) },
    { label: "One special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  return (
    <div className="admin-password-requirements">
      {requirements.map((req, index) => (
        <div key={index} className={`admin-requirement ${req.valid ? 'is-valid' : ''}`}>
          {req.valid ? (
            <Check size={14} className="admin-req-icon" />
          ) : (
            <Circle size={6} className="admin-req-dot" fill="currentColor" />
          )}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
}

PasswordRequirements.propTypes = {
  password: PropTypes.string.isRequired,
};
