import React, { useState } from 'react';

import { Landing } from './components/Landing';
import { Login } from './components/Login';

import { PasswordSetup } from './components/PasswordSetup';
import { Registration } from './components/Registration';
import { SimpleRegistration } from './components/SimpleRegistration';
import { Dashboard } from './components/Dashboard';
import { DigitalID } from './components/DigitalID';
import { DuesTracking } from './components/DuesTracking';
import { News } from './components/News';
import { Profile } from './components/Profile';
import { Account } from './components/Account';
import { PhysicalCard } from './components/PhysicalCard';
import { Benefits } from './components/Benefits';
import { AdminApproval } from './components/AdminApproval';
import { MembershipForm } from './components/MembershipForm';
import { RegistrationSuccess } from './components/RegistrationSuccess';

export type User = {
  id: string;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  email: string;
  isProfileComplete: boolean;
  phone?: string;
  company?: string;
  position?: string;
  unionPosition?: string;
  membershipDate: string;
  isApproved: boolean;
  profilePicture?: string;
  digitalId: string;
  qrCode: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  maritalStatus?: string;
  numberOfChildren?: number;
  education?: string;
  religion?: string;
  gender?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    address: string;
  };
  department?: string;
  yearsEmployed?: number;
  unionAffiliation?: string;
  password?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
};

export type DuesRecord = {
  id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentDate?: string;
  paymentMethod: string;
};

export type PhysicalCardRequest = {
  id: string;
  userId: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'shipped' | 'delivered';
  paymentStatus: 'pending' | 'paid';
  shippingAddress: string;
  trackingNumber?: string;
};

type Screen = 'landing' | 'login' | 'passwordSetup' | 'registration' | 'completeProfile' | 'registrationSuccess' | 'dashboard' | 'digitalId' | 'dues' | 'history' | 'news' | 'profile' | 'account' | 'physicalCard' | 'benefits' | 'admin' | 'membershipForm';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [authData, setAuthData] = useState<any>(null);

  // Mock data for demonstration - Approved User
  const mockApprovedUser: User = {
    id: '1',
    firstName: 'Juan',
    middleInitial: 'D',
    lastName: 'Dela Cruz',
    email: 'juan.delacruz@bdo.com.ph',
    isProfileComplete: true,
    phone: '+63 917 123 4567',
    company: 'BDO Unibank Inc.',
    position: 'Senior Bank Officer',
    unionPosition: 'Member',
    membershipDate: '2024-01-15',
    isApproved: true,
    digitalId: 'ALU-BDO-2024-001234',
    qrCode: 'ALU001234',
    address: '123 Rizal Street, Makati City, Metro Manila',
    addressLine1: '123 Rizal Street',
    addressLine2: 'Brgy. Poblacion',
    city: 'Makati City',
    province: 'Metro Manila',
    postalCode: '1210',
    dateOfBirth: '1985-06-15',
    placeOfBirth: 'Manila, Philippines',
    maritalStatus: 'Married',
    numberOfChildren: 2,
    education: 'Bachelor of Science in Banking and Finance',
    religion: 'Catholic',
    gender: 'Male',
    emergencyContact: {
      name: 'Maria Dela Cruz',
      relationship: 'Spouse',
      phone: '+63 917 765 4321',
      address: '123 Rizal Street, Makati City, Metro Manila'
    },
    department: 'Corporate Banking',
    yearsEmployed: 8,
    unionAffiliation: 'BDO Employees Association',
    password: 'password123',
    isPhoneVerified: true,
    isEmailVerified: true
  };

  // Mock data for demonstration - Pending Approval User
  const mockPendingUser: User = {
    id: '2',
    firstName: 'Maria',
    middleInitial: 'S',
    lastName: 'Santos',
    email: 'maria.santos@metrobank.com.ph',
    isProfileComplete: true,
    phone: '+63 918 765 4321',
    company: 'Metropolitan Bank & Trust Co.',
    position: 'Bank Teller',
    unionPosition: 'Member',
    membershipDate: '2024-03-10',
    isApproved: false,
    digitalId: 'ALU-MET-2024-002456',
    qrCode: 'ALU002456',
    address: '456 Quezon Avenue, Quezon City, Metro Manila',
    addressLine1: '456 Quezon Avenue',
    addressLine2: 'Brgy. Santo Cristo',
    city: 'Quezon City',
    province: 'Metro Manila',
    postalCode: '1100',
    dateOfBirth: '1990-08-22',
    placeOfBirth: 'Quezon City, Philippines',
    maritalStatus: 'Single',
    numberOfChildren: 0,
    education: 'Bachelor of Science in Business Administration',
    religion: 'Catholic',
    gender: 'Female',
    emergencyContact: {
      name: 'Roberto Santos',
      relationship: 'Father',
      phone: '+63 917 432 1098',
      address: '456 Quezon Avenue, Quezon City, Metro Manila'
    },
    department: 'Branch Operations',
    yearsEmployed: 3,
    unionAffiliation: 'Metrobank Employees Union',
    password: 'password123',
    isPhoneVerified: true,
    isEmailVerified: true
  };

  // Default for regular registration and existing users - pending approval
  // Social logins (Google/Facebook) get automatic approval in handleLoginSuccess
  const mockUser = mockPendingUser;

  const mockDues: DuesRecord[] = [
    { id: '1', month: 'January 2024', amount: 500, status: 'paid', paymentDate: '2024-01-05', paymentMethod: 'Payroll Deduction' },
    { id: '2', month: 'February 2024', amount: 500, status: 'paid', paymentDate: '2024-02-05', paymentMethod: 'Payroll Deduction' },
    { id: '3', month: 'March 2024', amount: 500, status: 'paid', paymentDate: '2024-03-05', paymentMethod: 'Payroll Deduction' },
    { id: '4', month: 'April 2024', amount: 500, status: 'pending', paymentMethod: 'Payroll Deduction' },
  ];

  const handleLoginSuccess = (loginMethod: 'regular' | 'google' | 'facebook' = 'regular') => {
    let userToSet: User;
    
    if (loginMethod === 'google' || loginMethod === 'facebook') {
      // Social login users get automatic approval with full profile
      userToSet = {
        ...mockApprovedUser,
        id: Date.now().toString(),
        firstName: loginMethod === 'google' ? 'John' : 'Sarah',
        lastName: loginMethod === 'google' ? 'Doe' : 'Johnson',
        email: loginMethod === 'google' ? 'john.doe@gmail.com' : 'sarah.johnson@facebook.com',
        digitalId: `ALU-${loginMethod.toUpperCase().substring(0, 3)}-2024-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
        qrCode: `ALU${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
        membershipDate: new Date().toISOString().split('T')[0],
        isApproved: true, // ✅ Auto-approved for social login
        isProfileComplete: true, // ✅ Profile considered complete
        company: loginMethod === 'google' ? 'Tech Company via Google' : 'Social Media Company via Facebook',
        position: loginMethod === 'google' ? 'Software Engineer' : 'Product Manager',
        unionPosition: 'Member',
        phone: loginMethod === 'google' ? '+63 917 111 2222' : '+63 918 333 4444',
        address: '123 Social Login Street, Digital City, Metro Manila',
        addressLine1: '123 Social Login Street',
        city: 'Digital City',
        province: 'Metro Manila',
        postalCode: '1234',
        dateOfBirth: loginMethod === 'google' ? '1990-05-15' : '1988-08-22',
        placeOfBirth: 'Manila, Philippines',
        maritalStatus: 'Single',
        numberOfChildren: 0,
        education: 'Bachelor of Science in Computer Science',
        religion: 'Catholic',
        gender: loginMethod === 'google' ? 'Male' : 'Female',
        emergencyContact: {
          name: loginMethod === 'google' ? 'Jane Doe' : 'Michael Johnson',
          relationship: loginMethod === 'google' ? 'Sister' : 'Brother',
          phone: '+63 917 555 6666',
          address: '123 Social Login Street, Digital City, Metro Manila'
        },
        department: loginMethod === 'google' ? 'Engineering' : 'Product',
        yearsEmployed: 3,
        unionAffiliation: 'Tech Workers Union',
      };
    } else {
      // Regular login users (existing members - could be approved or pending)
      userToSet = mockUser; // This uses the current mock user setting
    }
    
    setUser(userToSet);
    setCurrentScreen('dashboard');
  };

  const handleDirectLogin = (screen: string) => {
    if (screen === 'dashboard') {
      // For demo purposes: Use mock user for direct dashboard access
      setUser(mockUser);
    }
    setCurrentScreen(screen as Screen);
  };

  const handlePasswordSetupComplete = (password: string) => {
    if (user) {
      const updatedUser = { 
        ...user, 
        password: password,
        isProfileComplete: false, // Ensure they need to complete verification
        isApproved: false // They start as non-approved
      };
      setUser(updatedUser);
    }
    setCurrentScreen('dashboard');
  };

  const handleNavigateWithData = (screen: string, data?: any) => {
    setAuthData(data);
    setCurrentScreen(screen as Screen);
  };

  const handleRegistration = (userData: Partial<User>) => {
    const newUser: User = {
      id: Date.now().toString(),
      firstName: userData.firstName || '',
      middleInitial: userData.middleInitial,
      lastName: userData.lastName || '',
      email: userData.email || authData?.identifier || '',
      phone: userData.phone || (authData?.method === 'phone' ? authData?.identifier : undefined),
      isProfileComplete: false,
      digitalId: `ALU-REG-2024-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
      qrCode: `ALU${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
      membershipDate: new Date().toISOString().split('T')[0],
      isApproved: false,
      isPhoneVerified: authData?.method === 'phone',
      isEmailVerified: authData?.method === 'email',
    };
    setUser(newUser);
    // After registration, go directly to password setup
    setCurrentScreen('passwordSetup');
  };

  const handleCompleteProfile = (userData: Partial<User>) => {
    if (user) {
      const updatedUser: User = {
        ...user,
        ...userData,
        isProfileComplete: true,
        isApproved: false, // Set to false for pending approval
        digitalId: `ALU-${userData.company?.substring(0, 3).toUpperCase()}-2024-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
      };
      setUser(updatedUser);
      setCurrentScreen('registrationSuccess');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAuthData(null);
    setCurrentScreen('landing');
  };

  const renderScreen = () => {
    switch (currentScreen) {

      case 'landing':
        return <Landing onNavigate={setCurrentScreen} />;
      case 'login':
        return <Login onNavigate={handleDirectLogin} onLoginSuccess={handleLoginSuccess} />;

      case 'passwordSetup':
        return <PasswordSetup onNavigate={setCurrentScreen} onComplete={handlePasswordSetupComplete} />;
      case 'registration':
        return <SimpleRegistration onRegister={handleRegistration} onNavigate={setCurrentScreen} />;
      case 'completeProfile':
        return <Registration onRegister={handleCompleteProfile} onNavigate={setCurrentScreen} isCompletingProfile={true} user={user} />;
      case 'registrationSuccess':
        return user ? <RegistrationSuccess user={user} onNavigate={setCurrentScreen} /> : <Landing onNavigate={setCurrentScreen} />;
      case 'dashboard':
        return <Dashboard user={user} onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'digitalId':
        return <DigitalID user={user} onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'dues':
        return <DuesTracking user={user} dues={mockDues} onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'history':
        return <DuesTracking user={user} dues={mockDues} onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'news':
        return <News onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'profile':
        return <Account user={user} onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'account':
        return <Account user={user} onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'physicalCard':
        return <PhysicalCard user={user} onNavigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'benefits':
        return <Benefits onNavigate={setCurrentScreen} onLogout={handleLogout} user={user} />;
      case 'admin':
        return <AdminApproval onNavigate={setCurrentScreen} />;
      case 'membershipForm':
        return <MembershipForm onNavigate={setCurrentScreen} onLogout={handleLogout} user={user} />;
      default:
        return <Landing onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderScreen()}
    </div>
  );
}