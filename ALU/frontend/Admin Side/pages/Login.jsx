import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Loader2, ShieldCheck } from 'lucide-react';
import client from '../../src/api/client';
import PasswordRequirements from '../components/PasswordRequirements';
import '../styles/admin-base.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await client.post('/api/admin/auth/login', {
        email,
        password,
      });

      const { token, admin } = response.data;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(admin));
      
      // Configure client to use the token
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Login error details:', err);
      const msg = err.response?.data?.message 
        ? `Server Error: ${err.response.data.message}`
        : `Network/Client Error: ${err.message}`;
      setError(msg);
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
          <h1>Admin Portal</h1>
          <p>Secure access for authorized personnel only</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          {error && <div className="admin-alert is-error">{error}</div>}

          <div className="admin-form-group">
            <label htmlFor="email">Email Address</label>
            <div className="admin-input-wrapper">
              <User size={18} className="admin-input-icon" />
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

          <div className="admin-form-group">
            <div className="admin-form-header">
              <label htmlFor="password">Password</label>
              <Link to="/admin/forgot-password" className="admin-forgot-password">Forgot Password?</Link>
            </div>
            <div className="admin-input-wrapper">
              <Lock size={18} className="admin-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="admin-input"
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && <PasswordRequirements password={password} />}
          </div>

          <button type="submit" className="admin-button is-primary is-full-width" disabled={loading}>
            {loading ? <Loader2 size={18} className="admin-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>Union Local 305 &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
