import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, GraduationCap, Shield, Plane, FileCheck, ShieldCheck } from 'lucide-react';
import AppLayout from '../../src/components/AppLayout';
import '../styles/benefits.css';

const BENEFITS = [
  {
    icon: Shield,
    title: 'Legal & Representation',
    description: 'Immediate access to union lawyers and negotiators for workplace concerns and grievance handling.',
    tag: 'Always Available',
  },
  {
    icon: HeartHandshake,
    title: 'Member Assistance Fund',
    description: 'Emergency support and calamity response grants for members affected by unforeseen events.',
    tag: 'Financial',
  },
  {
    icon: GraduationCap,
    title: 'Scholarships & Training',
    description: 'Upskill through accredited programs focused on financial literacy, leadership, and workplace safety.',
    tag: 'Development',
  },
  {
    icon: Plane,
    title: 'Travel & Insurance',
    description: 'Preferred travel rates and group insurance coverage for union assignments and official travel.',
    tag: 'Perks',
  },
  {
    icon: FileCheck,
    title: 'Document Processing',
    description: 'Fast-track requests for certifications, clearances, and membership verification letters.',
    tag: 'Support',
  },
];

export default function BenefitsPage({ user, onLogout }) {
  const navigate = useNavigate();
  const isVerified = user?.isApproved === 'active' || user?.isApproved === 'approved' || user?.isApproved === true || user?.isApproved === 1 || user?.isApproved === '1';
  const isIncomplete = user?.isApproved === 'incomplete';

  if (!isVerified) {
    return (
      <AppLayout title="Member Benefits" user={user} onLogout={onLogout}>
        <div className="benefits">
          <header className="benefits__hero" style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#2563eb', marginBottom: '1rem' }}>
              <ShieldCheck size={32} />
            </div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>Member Benefits</h1>
            <p style={{ color: '#4b5563', maxWidth: '600px', margin: '0 auto' }}>
              Unlock exclusive perks, legal support, and financial assistance programs designed for ALU members.
            </p>
          </header>

          <div className="verification-prompt" style={{ 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            maxWidth: '600px', 
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ color: '#f59e0b' }}>
              <Shield size={48} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
              {isIncomplete ? "Verification Required" : "Application Under Review"}
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
              {isIncomplete 
                ? "Your membership profile is incomplete. Please verify your details to access member benefits."
                : "Your membership application is still under review. Once approved, you will gain access to all member benefits."}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {isIncomplete ? (
                <button 
                  type="button"
                  onClick={() => navigate('/complete-profile')}
                  style={{ 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '0.375rem',
                    border: 'none',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Complete Verification
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={() => navigate('/membership-form')}
                  style={{ 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '0.375rem',
                    border: 'none',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  View Application
                </button>
              )}
              <button 
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{ 
                  backgroundColor: 'white', 
                  color: '#374151', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Member Benefits" user={user} onLogout={onLogout}>
      <div className="benefits">
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <article key={benefit.title} className="benefits__card">
              <div className="benefits__icon">
                <Icon size={24} />
              </div>
              <div className="benefits__content">
                <header>
                  <span>{benefit.tag}</span>
                  <h2>{benefit.title}</h2>
                </header>
                <p>{benefit.description}</p>
                <button type="button" className="button button--secondary">Request Access</button>
              </div>
            </article>
          );
        })}
      </div>
    </AppLayout>
  );
}

BenefitsPage.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};
