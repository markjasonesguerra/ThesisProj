import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import LandingPage from '@userPages/LandingPage.jsx';
import LoginPage from '@userPages/LoginPage.jsx';
import RegistrationPage from '@userPages/RegistrationPage.jsx';
import SimpleRegistrationPage from '@userPages/SimpleRegistrationPage.jsx';
import RegistrationSuccessPage from '@userPages/RegistrationSuccessPage.jsx';
import DashboardPage from '@userPages/DashboardPage.jsx';
import DigitalIdPage from '@userPages/DigitalIdPage.jsx';
import DuesTrackingPage from '@userPages/DuesTrackingPage.jsx';
import NewsPage from '@userPages/NewsPage.jsx';
import AccountPage from '@userPages/AccountPage.jsx';
import BenefitsPage from '@userPages/BenefitsPage.jsx';
import MembershipFormPage from '@userPages/MembershipFormPage.jsx';
import RequestAssistancePage from '@userPages/RequestAssistance.jsx';
import AdminLayout from '@adminComponents/AdminLayout.jsx';
import AdminDashboard from '@adminPages/Dashboard.jsx';
import MembersTable from '@adminPages/MembersTable.jsx';
import RegistrationReview from '@adminPages/RegistrationReview.jsx';
import ProponentQueue from '@adminPages/ProponentQueue.jsx';
import AdminFinalApprovalQueue from '@adminPages/AdminFinalApprovalQueue.jsx';
import TicketDetail from '@adminPages/TicketDetail.jsx';
import ReportsAnalytics from '@adminPages/ReportsAnalytics.jsx';
import AuditLog from '@adminPages/AuditLog.jsx';
import BenefitsAssistance from '@adminPages/BenefitsAssistance.jsx';
import BenefitsAssistanceTriage from '@adminPages/BenefitsAssistanceTriage.jsx';
import DuesFinance from '@adminPages/DuesFinance.jsx';
import EventManagement from '@adminPages/EventManagement.jsx';
import IDCardManagement from '@adminPages/IDCardManagement.jsx';
import MemberProfile from '@adminPages/MemberProfile.jsx';
import AdminSettings from '@adminPages/AdminSettings.jsx';
import { login, signup, updateUserProfile } from './api/auth';
// (membership application API still available if needed)
import { mockUser, mockDues, mockNotifications, mockNews } from './data/mockData';

function Protected({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function VerifiedOnly({ user, children }) {
  // Check if user is approved/active.
  // We treat 'pending', '0', false, or null as unverified.
  // Adjust 'active' if your DB uses a different string for approved users.
  const isVerified = user?.isApproved === 'active' || user?.isApproved === 'approved' || user?.isApproved === true || user?.isApproved === 1 || user?.isApproved === '1';

  if (!isVerified) {
    return (
      <div className="verification-prompt" style={{ 
        padding: '4rem 2rem', 
        textAlign: 'center', 
        maxWidth: '600px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Verification Required</h2>
        <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
          Your membership status is currently pending verification. 
          Please complete your profile and wait for admin approval to access this feature.
        </p>
        <Link 
          to="/complete-profile" 
          style={{ 
            display: 'inline-block',
            backgroundColor: '#2563eb', 
            color: 'white', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Complete Profile
        </Link>
        <Link to="/dashboard" style={{ color: '#6b7280', textDecoration: 'underline' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return children;
}

function AdminDashboardRoute() {
  const outletContext = useOutletContext();
  const onNavigate = outletContext?.onNavigate;
  return <AdminDashboard onNavigate={onNavigate} />;
}

function App() {
  const [user, setUser] = useState(null);
  const [dues] = useState(mockDues);
  const [notifications] = useState(mockNotifications);
  const [news] = useState(mockNews);

  const isAuthenticated = Boolean(user);

  const handleLogout = () => {
    setUser(null);
  };

  const DashboardRoute = () => (
    <DashboardPage
      user={user}
      dues={dues}
      notifications={notifications}
      onLogout={handleLogout}
    />
  );

  const DigitalIdRoute = () => <DigitalIdPage user={user} onLogout={handleLogout} />;

  const DuesRoute = () => <DuesTrackingPage user={user} dues={dues} onLogout={handleLogout} />;

  const NewsRoute = () => <NewsPage user={user} news={news} onLogout={handleLogout} />;

  const AccountRoute = () => <AccountPage user={user} onLogout={handleLogout} />;

  const BenefitsRoute = () => <BenefitsPage user={user} onLogout={handleLogout} />;

  const MembershipFormRoute = () => (
    <MembershipFormPage
      user={user}
      onLogout={handleLogout}
    />
  );

  const CompleteProfileRoute = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Transform user object to form state structure if needed
    const initialData = useMemo(() => {
      if (!user) return null;
      // Map user fields to form fields if they differ
      // For now assuming they match mostly, but dateOfBirth needs splitting
      const dob = user.dateOfBirth ? new Date(user.dateOfBirth) : null;
      return {
        ...user,
        dateOfBirth: dob ? {
          month: String(dob.getMonth() + 1).padStart(2, '0'),
          day: String(dob.getDate()).padStart(2, '0'),
          year: String(dob.getFullYear())
        } : { month: '', day: '', year: '' },
        emergencyContact: {
          name: user.emergencyContactName || '',
          relationship: user.emergencyContactRelationship || '',
          phone: user.emergencyContactPhone || '',
          address: user.emergencyContactAddress || ''
        }
      };
    }, [user]);

    const handleUpdate = async (formData) => {
      setError('');
      setLoading(true);
      try {
        await updateUserProfile(user.id, formData);
        // Update local user state
        setUser(prev => ({ ...prev, ...formData })); // Ideally fetch fresh user data
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.message || 'Update failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <RegistrationPage
        initialData={initialData}
        onSubmit={handleUpdate}
        onBack={() => navigate('/dashboard')}
        submitting={loading}
        submitError={error}
      />
    );
  };

  const RequestAssistanceRoute = () => <RequestAssistancePage user={user} onLogout={handleLogout} />;

  const LandingRoute = () => {
    const navigate = useNavigate();
    return (
      <LandingPage
        onGetStarted={() => navigate('/register')}
        onLogin={() => navigate('/login')}
      />
    );
  };

  const LoginRoute = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    return (
      <LoginPage
        submitError={error}
        submitting={loading}
        onSubmit={async ({ identifier, password }) => {
          setError('');
          setLoading(true);
          try {
            const { data } = await login({ identifier, password });
            setUser(data.user);
            navigate('/dashboard');
          } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
          } finally {
            setLoading(false);
          }
        }}
        onBack={() => navigate('/')}
        onCreateAccount={() => navigate('/register')}
      />
    );
  };

  const RegistrationRoute = () => {
    const navigate = useNavigate();

    const handleAutoLogin = (user) => {
      setUser(user);
      navigate('/dashboard');
    };

    return (
      <SimpleRegistrationPage
        onBack={() => navigate('/')}
        onAutoLogin={handleAutoLogin}
      />
    );
  };

  const RegistrationSuccessRoute = () => {
    const navigate = useNavigate();
    return (
      <RegistrationSuccessPage
        onContinue={() => {
          if (user) {
            navigate('/dashboard');
          } else {
            navigate('/login');
          }
        }}
      />
    );
  };

  const defaultRoute = useMemo(() => (isAuthenticated ? '/dashboard' : '/'), [isAuthenticated]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegistrationRoute />} />
        <Route path="/registration-success" element={<RegistrationSuccessRoute />} />
        <Route
          path="/dashboard"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <DashboardRoute />
            </Protected>
          )}
        />
        <Route
          path="/digital-id"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <DigitalIdRoute />
            </Protected>
          )}
        />
        <Route
          path="/dues"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <DuesRoute />
            </Protected>
          )}
        />
        <Route
          path="/news"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <NewsRoute />
            </Protected>
          )}
        />
        <Route
          path="/account"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <AccountRoute />
            </Protected>
          )}
        />
        <Route
          path="/benefits"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <BenefitsRoute />
            </Protected>
          )}
        />
        <Route
          path="/membership-form"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <MembershipFormRoute />
            </Protected>
          )}
        />
        <Route
          path="/complete-profile"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <CompleteProfileRoute />
            </Protected>
          )}
        />
        <Route
          path="/request-assistance"
          element={(
            <Protected isAuthenticated={isAuthenticated}>
              <RequestAssistanceRoute />
            </Protected>
          )}
        />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardRoute />} />
          <Route path="members" element={<MembersTable />} />
          <Route path="members/:memberId" element={<MemberProfile />} />
          <Route path="registration-review" element={<RegistrationReview />} />
          <Route path="proponent-queue" element={<ProponentQueue />} />
          <Route path="final-approval-queue" element={<AdminFinalApprovalQueue />} />
          <Route path="ticket-detail" element={<TicketDetail />} />
          <Route path="reports-analytics" element={<ReportsAnalytics />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="benefits-assistance" element={<BenefitsAssistance />} />
          <Route path="benefits-triage" element={<BenefitsAssistanceTriage />} />
          <Route path="dues-finance" element={<DuesFinance />} />
          <Route path="event-management" element={<EventManagement />} />
          <Route path="id-card-management" element={<IDCardManagement />} />
          <Route path="admin-settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
