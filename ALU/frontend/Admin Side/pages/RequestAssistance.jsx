import "../styles/admin-base.css";
import { useState } from "react";
import {
  Scale,
  Stethoscope,
  BookOpen,
  AlertCircle,
  Upload,
  X,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";

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

export default function RequestAssistance() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    membershipId: "",
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

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>Request & Assistance</h1>
          <p className="admin-muted">
            Submit requests for legal consultation, medical assistance, educational scholarships, or emergency support.
          </p>
        </div>
        <span className="admin-pill">Member Portal</span>
      </header>

      {/* Category Selection */}
      <section className="admin-surface admin-stack-md">
        <h2>Select Request Type</h2>
        <div className="admin-category-grid">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`admin-category-card ${isSelected ? "active" : ""}`}
              >
                <Icon size={32} className="admin-category-icon" />
                <h3>{category.label}</h3>
                <p className="admin-muted">{category.description}</p>
                {isSelected && <div className="admin-category-checkmark">✓</div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Request Form */}
      {selectedCategory && (
        <section className="admin-surface admin-stack-md">
          <div className="admin-row">
            <div>
              <h2>
                {selectedCategoryData && (
                  <>
                    <selectedCategoryData.icon
                      size={24}
                      style={{ display: "inline-block", marginRight: "8px" }}
                    />
                    {selectedCategoryData.label}
                  </>
                )}
              </h2>
              <p className="admin-muted">Please provide detailed information about your request</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="admin-form admin-stack-md">
            {/* Personal Information Section */}
            <div className="admin-form-section">
              <h3>Personal Information</h3>
              <div className="admin-form-grid cols-2">
                {infoFields.map((field) => (
                  <div key={field.id} className="admin-form-group">
                    <label htmlFor={field.id} className="admin-form-label">
                      {field.label}
                      {field.required && <span className="admin-required">*</span>}
                    </label>
                    {field.type === "select" ? (
                      <select
                        id={field.id}
                        name={field.id}
                        value={formData[field.id] || ""}
                        onChange={handleInputChange}
                        className="admin-form-input"
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
                        className="admin-form-input"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Request Details Section */}
            <div className="admin-form-section">
              <h3>Request Details</h3>
              <div className="admin-form-group">
                <label htmlFor="customRequest" className="admin-form-label">
                  Detailed Description <span className="admin-required">*</span>
                </label>
                <textarea
                  id="customRequest"
                  name="customRequest"
                  placeholder="Please provide a detailed description of your request, including any relevant circumstances, dates, or amounts..."
                  value={formData.customRequest}
                  onChange={handleInputChange}
                  className="admin-form-textarea"
                  rows={6}
                  required
                />
                <p className="admin-form-helper">Minimum 20 characters, maximum 2000 characters</p>
              </div>
            </div>

            {/* File Attachments Section */}
            <div className="admin-form-section">
              <h3>Supporting Documents</h3>
              <div
                className={`admin-file-upload ${dragOver ? "drag-over" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload size={32} />
                <h4>Drag and drop files here</h4>
                <p>or</p>
                <label htmlFor="fileInput" className="admin-file-button">
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
                <p className="admin-form-helper">Max 10MB per file • PDF, DOC, JPG, PNG supported</p>
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="admin-file-list">
                  <h4>Attached Files ({attachedFiles.length})</h4>
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="admin-file-item">
                      <FileText size={18} />
                      <div className="admin-file-info">
                        <p className="admin-file-name">{file.name}</p>
                        <p className="admin-file-size">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="admin-file-remove"
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
            <div className="admin-form-actions">
              <button type="submit" className="admin-button admin-button--primary">
                <CheckCircle size={16} />
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setFormData({
                    fullName: "",
                    email: "",
                    phone: "",
                    membershipId: "",
                    dateOfRequest: new Date().toISOString().split("T")[0],
                    urgency: "Normal",
                    customRequest: "",
                  });
                  setAttachedFiles([]);
                }}
                className="admin-button admin-button--secondary"
              >
                Clear Form
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Success Message */}
      {submitted && (
        <div className="admin-success-banner">
          <CheckCircle size={24} />
          <div>
            <h3>Request Submitted Successfully!</h3>
            <p>Your request has been received and will be reviewed shortly. You'll receive updates via email.</p>
          </div>
        </div>
      )}

      {/* Recent Requests Summary */}
      <section className="admin-surface admin-stack-md">
        <h2>Recent Requests</h2>
        <div className="admin-requests-grid cols-3">
          <article className="admin-card">
            <div className="admin-card__label">Pending Review</div>
            <div className="admin-card__value">12</div>
            <div className="admin-card__meta">Awaiting initial assessment</div>
          </article>
          <article className="admin-card">
            <div className="admin-card__label">In Progress</div>
            <div className="admin-card__value">8</div>
            <div className="admin-card__meta">Being processed</div>
          </article>
          <article className="admin-card">
            <div className="admin-card__label">Completed</div>
            <div className="admin-card__value">24</div>
            <div className="admin-card__meta">This month</div>
          </article>
        </div>
      </section>
    </div>
  );
}
