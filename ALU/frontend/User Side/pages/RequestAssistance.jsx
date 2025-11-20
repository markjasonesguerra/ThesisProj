import PropTypes from 'prop-types';
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  Stethoscope,
  BookOpen,
  AlertCircle,
  Upload,
  X,
  CheckCircle,
  FileText,
  HeartHandshake,
} from "lucide-react";
import AppLayout from '@components/AppLayout';
import '../styles/request-assistance.css';

const categories = [
  {
    id: "legal",
    label: "Legal Consultation",
    icon: Scale,
    description: "Workplace disputes, contract review, legal advice",
    color: "is-blue",
  },
  {
    id: "medical",
    label: "Medical Assistance",
    icon: Stethoscope,
    description: "Healthcare costs, emergency support, treatment coverage",
    color: "is-green",
  },
  {
    id: "education",
    label: "Educational Scholarship",
    icon: BookOpen,
    description: "Tuition assistance, training programs, skill development",
    color: "is-purple",
  },
  {
    id: "emergency",
    label: "Emergency Support",
    icon: AlertCircle,
    description: "Urgent financial aid, disaster relief, crisis assistance",
    color: "is-orange",
  },
];

const infoFields = [
  { id: "fullName", label: "Full Name", type: "text", required: true, placeholder: "Enter your full name" },
  { id: "email", label: "Email Address", type: "email", required: true, placeholder: "your.email@example.com" },
  { id: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "+63 9XX XXX XXXX" },
  { id: "membershipId", label: "Membership ID", type: "text", required: true, placeholder: "ALU-XXXX-XXXXX" },
  { id: "dateOfRequest", label: "Date of Request", type: "date", required: true },
  { id: "urgency", label: "Urgency Level", type: "select", required: true, options: ["Normal", "High", "Critical"] },
];

export default function RequestAssistance({ user, onLogout }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "",
    email: user?.email || "",
    phone: user?.phone || "",
    membershipId: user?.digitalId || "",
    dateOfRequest: new Date().toISOString().split("T")[0],
    urgency: "Normal",
    customRequest: "",
    attachments: [],
  });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileAttach = (files) => {
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter((file) => file.size <= 10 * 1024 * 1024); // 10MB limit
    setAttachedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileAttach(e.dataTransfer.files);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      alert("Please select a request category");
      return;
    }
    if (!formData.fullName || !formData.email || !formData.membershipId) {
      alert("Please fill in all required fields");
      return;
    }
    // Here you would typically send the data to your backend API
    console.log("Form submitted:", {
      ...formData,
      category: selectedCategory,
      files: attachedFiles,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedCategory(null);
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        membershipId: "",
        dateOfRequest: new Date().toISOString().split("T")[0],
        urgency: "Normal",
        customRequest: "",
        attachments: [],
      });
      setAttachedFiles([]);
    }, 3000);
  };

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);

  const isVerified = user?.isApproved === 'active' || user?.isApproved === 'approved' || user?.isApproved === true || user?.isApproved === 1 || user?.isApproved === '1';
  const isIncomplete = user?.isApproved === 'incomplete' || ((user?.isApproved === 'pending' || user?.isApproved === 0 || user?.isApproved === false) && !user?.dateOfBirth);

  if (!isVerified) {
    return (
      <AppLayout title="Request & Assistance" user={user} onLogout={onLogout}>
        <div className="request-assistance-page">
          <section className="request-assistance__intro">
            <div className="request-assistance__intro-icon">
              <HeartHandshake size={20} />
            </div>
            <div>
              <h2>Need Help?</h2>
              <p>Submit requests for legal consultation, medical assistance, educational scholarships, or emergency support. Our team will review and respond within 2-3 business days.</p>
            </div>
          </section>

          <div className="verification-prompt" style={{ 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            maxWidth: '600px', 
            margin: '2rem auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ color: '#f59e0b' }}>
              <AlertCircle size={48} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
              {isIncomplete ? "Verification Required" : "Application Under Review"}
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
              {isIncomplete 
                ? "To submit assistance requests, your membership status must be verified. Please complete your profile to unlock this feature."
                : "Your membership application is currently under review. You will be able to submit requests once your membership is approved."}
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
    <AppLayout title="Request & Assistance" user={user} onLogout={onLogout}>
      <div className="request-assistance-page">
        <section className="request-assistance__intro">
          <div className="request-assistance__intro-icon">
            <HeartHandshake size={20} />
          </div>
          <div>
            <h2>Need Help?</h2>
            <p>Submit requests for legal consultation, medical assistance, educational scholarships, or emergency support. Our team will review and respond within 2-3 business days.</p>
          </div>
        </section>

        {/* Category Selection */}
        <section className="request-assistance__categories">
          <h3>Select Request Type</h3>
          <div className="request-assistance__category-grid">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`request-assistance__category-card ${isSelected ? "active" : ""}`}
                >
                  <Icon size={28} className="request-assistance__category-icon" />
                  <h4>{category.label}</h4>
                  <p>{category.description}</p>
                  {isSelected && <div className="request-assistance__checkmark">✓</div>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Request Form */}
        {selectedCategory && (
          <section className="request-assistance__form-container">
            <div className="request-assistance__form-header">
              <div>
                <h3>
                  {selectedCategoryData && (
                    <>
                      <selectedCategoryData.icon
                        size={22}
                        style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }}
                      />
                      {selectedCategoryData.label}
                    </>
                  )}
                </h3>
                <p className="request-assistance__form-hint">Please provide detailed information about your request</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="request-assistance__form">
              {/* Personal Information Section */}
              <div className="request-assistance__section">
                <h4 className="request-assistance__section-title">Personal Information</h4>
                <div className="request-assistance__form-grid">
                  {infoFields.map((field) => (
                    <div key={field.id} className="request-assistance__form-group">
                      <label htmlFor={field.id} className="request-assistance__form-label">
                        {field.label}
                        {field.required && <span className="request-assistance__required">*</span>}
                      </label>
                      {field.type === "select" ? (
                        <select
                          id={field.id}
                          name={field.id}
                          value={formData[field.id] || ""}
                          onChange={handleInputChange}
                          className="request-assistance__form-input"
                          required={field.required}
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={field.id}
                          type={field.type}
                          name={field.id}
                          placeholder={field.placeholder}
                          value={formData[field.id] || ""}
                          onChange={handleInputChange}
                          className="request-assistance__form-input"
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Details Section */}
              <div className="request-assistance__section">
                <h4 className="request-assistance__section-title">Request Details</h4>
                <div className="request-assistance__form-group">
                  <label htmlFor="customRequest" className="request-assistance__form-label">
                    Detailed Description <span className="request-assistance__required">*</span>
                  </label>
                  <textarea
                    id="customRequest"
                    name="customRequest"
                    placeholder="Please provide a detailed description of your request, including any relevant circumstances, dates, or amounts..."
                    value={formData.customRequest}
                    onChange={handleInputChange}
                    className="request-assistance__form-textarea"
                    rows={5}
                    required
                  />
                  <p className="request-assistance__form-helper">Minimum 20 characters, maximum 2000 characters</p>
                </div>
              </div>

              {/* File Attachments Section */}
              <div className="request-assistance__section">
                <h4 className="request-assistance__section-title">Supporting Documents</h4>
                <div
                  className={`request-assistance__file-upload ${dragOver ? "drag-over" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload size={32} />
                  <h5>Drag and drop files here</h5>
                  <p>or</p>
                  <label htmlFor="fileInput" className="request-assistance__file-button">
                    Browse Files
                  </label>
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                    onChange={(e) => handleFileAttach(e.target.files)}
                    style={{ display: "none" }}
                  />
                  <p className="request-assistance__form-helper">Max 10MB per file • PDF, DOC, JPG, PNG supported</p>
                </div>

                {/* Attached Files List */}
                {attachedFiles.length > 0 && (
                  <div className="request-assistance__file-list">
                    <h5>Attached Files ({attachedFiles.length})</h5>
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="request-assistance__file-item">
                        <FileText size={18} />
                        <div className="request-assistance__file-info">
                          <p className="request-assistance__file-name">{file.name}</p>
                          <p className="request-assistance__file-size">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="request-assistance__file-remove"
                          aria-label="Remove file"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Section */}
              <div className="request-assistance__form-actions">
                <button type="submit" className="request-assistance__button request-assistance__button--primary">
                  <CheckCircle size={16} />
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setFormData({
                      fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "",
                      email: user?.email || "",
                      phone: user?.phone || "",
                      membershipId: user?.digitalId || "",
                      dateOfRequest: new Date().toISOString().split("T")[0],
                      urgency: "Normal",
                      customRequest: "",
                    });
                    setAttachedFiles([]);
                  }}
                  className="request-assistance__button request-assistance__button--secondary"
                >
                  Clear Form
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Success Message */}
        {submitted && (
          <div className="request-assistance__success-banner">
            <CheckCircle size={24} />
            <div>
              <h4>Request Submitted Successfully!</h4>
              <p>Your request has been received and will be reviewed shortly. You'll receive updates via email.</p>
            </div>
          </div>
        )}

        {/* Info Cards */}
        <section className="request-assistance__info-cards">
          <h3>What Happens Next?</h3>
          <div className="request-assistance__info-grid">
            <article className="request-assistance__info-card">
              <div className="request-assistance__info-number">1</div>
              <h4>Submission Review</h4>
              <p>Your request is logged and assigned a tracking ID for reference.</p>
            </article>
            <article className="request-assistance__info-card">
              <div className="request-assistance__info-number">2</div>
              <h4>Initial Assessment</h4>
              <p>Our team reviews your request and gathers additional info if needed.</p>
            </article>
            <article className="request-assistance__info-card">
              <div className="request-assistance__info-number">3</div>
              <h4>Processing</h4>
              <p>Requests are processed according to priority and category guidelines.</p>
            </article>
            <article className="request-assistance__info-card">
              <div className="request-assistance__info-number">4</div>
              <h4>Notification</h4>
              <p>You'll receive updates via email and can track status in your account.</p>
            </article>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

RequestAssistance.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    digitalId: PropTypes.string,
  }),
  onLogout: PropTypes.func,
};
