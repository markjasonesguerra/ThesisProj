import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import client from '../../src/api/client';
import '../styles/admin-base.css';

export default function AdminForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // Placeholder API call - replace with actual endpoint when available
      // await client.post('/api/admin/auth/forgot-password', { email });
      
      // Simulate success for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStatus({
        type: 'success',
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to process request. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-logo-circle">
            <ShieldCheck size={32} color="#2563eb" />
          </div>
          <h1>Reset Password</h1>
          <p>Enter your email to receive reset instructions</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {status && (
            <div className={`admin-alert is-${status.type}`}>
              {status.message}
            </div>
          )}

          <div className="admin-form-group">
            <label htmlFor="email">Email Address</label>
            <div className="admin-input-wrapper">
              <Mail size={18} className="admin-input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="admin-input"
              />
            </div>
          </div>

          <button type="submit" className="admin-button is-primary is-full-width" disabled={loading}>
            {loading ? <Loader2 size={18} className="admin-spin" /> : 'Send Instructions'}
          </button>

          <div className="admin-login-footer">
            <Link to="/admin/login" className="admin-link-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
