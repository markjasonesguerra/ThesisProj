import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { useMemo, useState } from 'react';
import LandingPage from '@userPages/LandingPage.jsx';
import LoginPage from '@userPages/LoginPage.jsx';
import QuickRegistrationPage from '@userPages/QuickRegistrationPage.jsx';
import EmailVerificationPage from '@userPages/EmailVerificationPage.jsx';
import RegistrationSuccessPage from '@userPages/RegistrationSuccessPage.jsx';
import PasswordSetupPage from '@userPages/PasswordSetupPage.jsx';
import DashboardPage from '@userPages/DashboardPage.jsx';
import DigitalIdPage from '@userPages/DigitalIdPage.jsx';
import DuesTrackingPage from '@userPages/DuesTrackingPage.jsx';
import NewsPage from '@userPages/NewsPage.jsx';
import AccountPage from '@userPages/AccountPage.jsx';
import BenefitsPage from '@userPages/BenefitsPage.jsx';
import MembershipFormPage from '@userPages/MembershipFormPage.jsx';
import AdminLayout from '@adminComponents/AdminLayout.jsx';
import AdminDashboard from '@adminPages/Dashboard.jsx';
import MembersTable from '@adminPages/MembersTable.jsx';
import RegistrationReview from '@adminPages/RegistrationReview.jsx';
import ProponentQueue from '@adminPages/ProponentQueue.jsx';
import AdminFinalApprovalQueue from '@adminPages/AdminFinalApprovalQueue.jsx';
import TicketDetail from '@adminPages/TicketDetail.jsx';
import ReportsAnalytics from '@adminPages/ReportsAnalytics.jsx';
import AuditLog from '@adminPages/AuditLog.jsx';
import AISettings from '@adminPages/AISettings.jsx';
import BenefitsAssistance from '@adminPages/BenefitsAssistance.jsx';
import BenefitsAssistanceTriage from '@adminPages/BenefitsAssistanceTriage.jsx';
import DuesFinance from '@adminPages/DuesFinance.jsx';
import EventManagement from '@adminPages/EventManagement.jsx';
import IDCardManagement from '@adminPages/IDCardManagement.jsx';
import MemberProfile from '@adminPages/MemberProfile.jsx';
import AdminSettings from '@adminPages/AdminSettings.jsx';
// (membership application API still available if needed)
import { mockUser, mockDues, mockNotifications, mockNews } from './data/mockData';

function Protected({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
    return (
      <LoginPage
        onSubmit={({ identifier }) => {
          const nextUser = {
            ...mockUser,
            email: identifier.includes('@') ? identifier : mockUser.email,
            phone: identifier.startsWith('+') ? identifier : mockUser.phone,
          };
          setUser(nextUser);
          navigate('/dashboard');
        }}
        onBack={() => navigate('/')}
        onCreateAccount={() => navigate('/register')}
      />
    );
  };

  // quick registration flow: quick form -> email verification -> password setup
  const [pendingReg, setPendingReg] = useState(null);

  const RegistrationRoute = () => {
    const navigate = useNavigate();

    const handleNext = (data) => {
      // store pending registration (client-side). In a full implementation you'd send a verification email.
      setPendingReg(data);
      navigate('/verify-email');
    };

    return (
      <QuickRegistrationPage
        onBack={() => navigate('/')}
        onNext={handleNext}
      />
    );
  };

  const VerifyRoute = () => {
    const navigate = useNavigate();
    if (!pendingReg) {
      navigate('/register');
      return null;
    }

    return (
      <EmailVerificationPage
        email={pendingReg.email}
        onBack={() => navigate('/register')}
        onResend={() => {/* TODO: call API to resend code */}}
        onVerify={() => {
          // after verification, set a provisional user (will complete on password setup)
          setUser((u) => ({ ...(u ?? {}), email: pendingReg.email, firstName: pendingReg.firstName, lastName: pendingReg.lastName }));
          navigate('/password-setup');
        }}
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

  const PasswordSetupRoute = () => {
    const navigate = useNavigate();
    const email = user?.email ?? mockUser.email;
    return (
      <PasswordSetupPage
        email={email}
        onSubmit={() => navigate('/dashboard')}
        onCancel={() => navigate('/login')}
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
  <Route path="/verify-email" element={<VerifyRoute />} />
        <Route path="/registration-success" element={<RegistrationSuccessRoute />} />
        <Route path="/password-setup" element={<PasswordSetupRoute />} />
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
          <Route path="ai-settings" element={<AISettings />} />
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
