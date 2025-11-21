import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileText,
  Printer,
} from "lucide-react";
import "../styles/membership-form.css";

const maritalStatusOptions = [
  { label: "Single", value: "Single" },
  { label: "Married", value: "Married" },
  { label: "Divorce", value: "Divorced" },
  { label: "Others", value: "Others" },
];

const genderOptions = [
  { label: "Man", value: "Male" },
  { label: "Woman", value: "Female" },
  { label: "Other (please state)", value: "Other" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const relationshipOptions = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Friend",
  "Other",
];

const otherMaritalStatusValue = (form) => {
  if (form.maritalStatus !== "Others") return form.maritalStatus;
  return form.otherMaritalStatus ? form.otherMaritalStatus : "Others";
};

const otherGenderValue = (form) => {
  if (form.gender !== "Other") return form.gender;
  return form.otherGender ? form.otherGender : "Other";
};

const toIsoDate = ({ month, day, year }) => {
  if (!month || !day || !year) return "";
  const mm = Number(month);
  const dd = Number(day);
  const yyyy = Number(year);
  if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) return "";
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || year.length !== 4) return "";
  const date = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const computeAge = ({ month, day, year }) => {
  if (!month || !day || !year) return "";
  const mm = Number(month);
  const dd = Number(day);
  const yyyy = Number(year);
  if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) return "";
  const dob = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(dob.getTime())) return "";
  const diff = Date.now() - dob.getTime();
  if (diff < 0) return "";
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
};

const requiredString = (value) => value && value.trim().length > 0;

const initialFormState = {
  firstName: "",
  middleInitial: "",
  lastName: "",
  placeOfBirth: "",
  address: "",
  maritalStatus: "",
  otherMaritalStatus: "",
  numberOfChildren: "",
  gender: "",
  otherGender: "",
  religion: "",
  education: "",
  email: "",
  password: "",
  phone: "",
  company: "",
  position: "",
  department: "",
  yearsEmployed: "",
  unionAffiliation: "",
  unionPosition: "",
  emergencyContact: {
    name: "",
    relationship: "",
    phone: "",
    address: "",
  },
  dateOfBirth: {
    month: "",
    day: "",
    year: "",
  },
};

export default function RegistrationPage({ onSubmit, onBack, submitting, submitError, initialData }) {
  const [form, setForm] = useState({ ...initialFormState, ...initialData });
  const [profilePreview, setProfilePreview] = useState(initialData?.profilePicture || null);

  // Update form if initialData changes
  useMemo(() => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...initialData }));
      if (initialData.profilePicture) {
        setProfilePreview(initialData.profilePicture);
      }
    }
  }, [initialData]);

  const ageValue = useMemo(() => computeAge(form.dateOfBirth), [form.dateOfBirth]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmergencyChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value,
      },
    }));
  };

  const handleDobChange = (segment, value) => {
    const sanitized = value.replace(/\D/g, "").slice(0, segment === "year" ? 4 : 2);
    setForm((prev) => ({
      ...prev,
      dateOfBirth: {
        ...prev.dateOfBirth,
        [segment]: sanitized,
      },
    }));
  };

  const handleMaritalStatusChange = (option) => {
    setForm((prev) => ({
      ...prev,
      maritalStatus: option,
      otherMaritalStatus: option === "Others" ? prev.otherMaritalStatus : "",
    }));
  };

  const handleGenderChange = (option) => {
    setForm((prev) => ({
      ...prev,
      gender: option,
      otherGender: option === "Other" ? prev.otherGender : "",
    }));
  };

  const handleProfileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProfilePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setProfilePreview(loadEvent.target?.result ?? null);
    };
    reader.readAsDataURL(file);
  };

  const maritalStatusValue = otherMaritalStatusValue(form);
  const genderValue = otherGenderValue(form);

  const isSubmitDisabled = useMemo(() => {
    const dobIso = toIsoDate(form.dateOfBirth);
    const contact = form.emergencyContact;

    if (!requiredString(form.firstName)) return true;
    if (!requiredString(form.lastName)) return true;
    if (!dobIso) return true;
    if (!requiredString(form.placeOfBirth)) return true;
    if (!requiredString(form.address)) return true;
    if (!requiredString(form.education)) return true;
    if (!requiredString(form.email)) return true;
    if (!requiredString(form.password)) return true;
    if (!requiredString(form.phone)) return true;
    if (!requiredString(form.company)) return true;
    if (!requiredString(form.position)) return true;
    if (!requiredString(form.unionPosition)) return true;
    if (!requiredString(contact.name)) return true;
    if (!requiredString(contact.relationship)) return true;
    if (!requiredString(contact.phone)) return true;
    if (!requiredString(contact.address)) return true;
    if (!profilePreview) return true;

    if (!form.maritalStatus) return true;
    if (form.maritalStatus === "Others" && !requiredString(form.otherMaritalStatus)) return true;

    if (!form.gender) return true;
    if (form.gender === "Other" && !requiredString(form.otherGender)) return true;

    return false;
  }, [form, profilePreview]);

  const handleDownload = () => {
    if (typeof document === "undefined") return;
    const link = document.createElement("a");
    link.href = "data:application/pdf;base64,JVBERi0xLjQK";
    link.download = "ALU_Membership_Form.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitting || isSubmitDisabled) return;

    const dobIso = toIsoDate(form.dateOfBirth);
    if (!dobIso) return;

    const payload = {
      firstName: form.firstName.trim(),
      middleInitial: form.middleInitial.trim() || null,
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
      address: form.address.trim(),
      dateOfBirth: dobIso,
      placeOfBirth: form.placeOfBirth.trim(),
      maritalStatus: maritalStatusValue,
      numberOfChildren: form.numberOfChildren ? Number(form.numberOfChildren) : null,
      gender: genderValue,
      religion: form.religion ? form.religion.trim() : null,
      education: form.education.trim(),
      company: form.company.trim(),
      position: form.position.trim(),
      department: form.department ? form.department.trim() : null,
      yearsEmployed: form.yearsEmployed ? Number(form.yearsEmployed) : null,
      unionAffiliation: form.unionAffiliation ? form.unionAffiliation.trim() : null,
      unionPosition: form.unionPosition.trim(),
      emergencyContact: {
        name: form.emergencyContact.name.trim(),
        relationship: form.emergencyContact.relationship.trim(),
        phone: form.emergencyContact.phone.trim(),
        address: form.emergencyContact.address.trim(),
      },
      profilePicture: profilePreview,
    };

    onSubmit(payload);
  };

  return (
    <form className="membership-form" onSubmit={handleSubmit}>
      <div className="membership-form__container">
        <header className="membership-form__header">
          <button type="button" className="membership-form__back" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="membership-form__heading">
            <h1>Membership Registration Form</h1>
            <p>Complete your ALU membership application</p>
          </div>
        </header>

        {submitError && (
          <div className="membership-form__alert membership-form__alert--error">
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </div>
        )}

        <div className="membership-form__card">
          <div className="membership-form__card-header">
            <div className="membership-form__identity">
              <div className="membership-form__identity-mark">ALU</div>
              <div>
                <h2>Associated Labor Unions</h2>
                <p>Luzon Regional Office</p>
                <p>262 ALU-AFILUTE Bldg. 15th Ave. Brgy. Silangan, Cubao, Quezon City</p>
              </div>
            </div>
            <label
              className={`membership-form__photo-slot${profilePreview ? " membership-form__photo-slot--has-photo" : ""}`}
              htmlFor="profileUpload"
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Uploaded 2x2" />
              ) : (
                <div>
                  <span>2x2 picture</span>
                  <span>here</span>
                </div>
              )}
              <input
                id="profileUpload"
                type="file"
                accept="image/*"
                className="membership-form__photo-input"
                onChange={handleProfileUpload}
              />
            </label>
          </div>

          <div className="membership-form__card-title">
            <h3>Membership Registration Form</h3>
            <p>Please provide accurate information for faster processing.</p>
          </div>

          <section className="membership-form__section">
            <div className="membership-form__section-banner">Personal Information</div>
            <div className="membership-form__fields membership-form__fields--cols-3">
              <label className="membership-form__field">
                <span>First Name *</span>
                <input name="firstName" value={form.firstName} onChange={handleInputChange} required />
              </label>
              <label className="membership-form__field">
                <span>Middle Initial</span>
                <input name="middleInitial" value={form.middleInitial} onChange={handleInputChange} maxLength={2} />
              </label>
              <label className="membership-form__field">
                <span>Last Name *</span>
                <input name="lastName" value={form.lastName} onChange={handleInputChange} required />
              </label>
            </div>

            <div className="membership-form__fields membership-form__fields--cols-3">
              <label className="membership-form__field membership-form__field--dob">
                <span>Date of Birth *</span>
                <div className="membership-form__dob-inputs">
                  <input
                    name="dobMonth"
                    placeholder="MM"
                    value={form.dateOfBirth.month}
                    onChange={(event) => handleDobChange("month", event.target.value)}
                    required
                  />
                  <span>-</span>
                  <input
                    name="dobDay"
                    placeholder="DD"
                    value={form.dateOfBirth.day}
                    onChange={(event) => handleDobChange("day", event.target.value)}
                    required
                  />
                  <span>-</span>
                  <input
                    name="dobYear"
                    placeholder="YYYY"
                    value={form.dateOfBirth.year}
                    onChange={(event) => handleDobChange("year", event.target.value)}
                    required
                  />
                </div>
              </label>
              <label className="membership-form__field">
                <span>Age</span>
                <input value={ageValue} readOnly placeholder="--" />
              </label>
              <label className="membership-form__field">
                <span>Place of Birth *</span>
                <input name="placeOfBirth" value={form.placeOfBirth} onChange={handleInputChange} required />
              </label>
            </div>

            <label className="membership-form__field membership-form__field--textarea">
              <span>Residential Address *</span>
              <textarea name="address" value={form.address} onChange={handleInputChange} required />
            </label>

            <div className="membership-form__fields membership-form__fields--cols-4">
              <div className="membership-form__field membership-form__field--checkboxes">
                <span>Status *</span>
                <div className="membership-form__checkbox-group">
                  {maritalStatusOptions.map((option) => (
                    <label key={option.value}>
                      <input
                        type="checkbox"
                        checked={form.maritalStatus === option.value}
                        onChange={() => handleMaritalStatusChange(option.value)}
                      />
                      <span>{option.label}</span>
                      {option.value === "Others" && form.maritalStatus === "Others" && (
                        <input
                          type="text"
                          placeholder="Please specify"
                          value={form.otherMaritalStatus}
                          onChange={(event) => setForm((prev) => ({ ...prev, otherMaritalStatus: event.target.value }))}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
              <label className="membership-form__field">
                <span>No. of Children</span>
                <input
                  name="numberOfChildren"
                  type="number"
                  min="0"
                  value={form.numberOfChildren}
                  onChange={handleInputChange}
                />
              </label>
              <label className="membership-form__field">
                <span>Educational Attainment *</span>
                <input name="education" value={form.education} onChange={handleInputChange} required />
              </label>
              <label className="membership-form__field">
                <span>Religion</span>
                <input name="religion" value={form.religion} onChange={handleInputChange} />
              </label>
            </div>

            <div className="membership-form__fields membership-form__fields--cols-2">
              <label className="membership-form__field">
                <span>Email Address *</span>
                <input name="email" type="email" value={form.email} onChange={handleInputChange} required />
              </label>
              <label className="membership-form__field">
                <span>Password *</span>
                <input name="password" type="password" value={form.password} onChange={handleInputChange} required />
              </label>
            </div>

            <div className="membership-form__fields membership-form__fields--cols-2">
              <label className="membership-form__field">
                <span>Contact No. *</span>
                <input name="phone" value={form.phone} onChange={handleInputChange} placeholder="(+63) 900 000 0000" required />
              </label>
              <label className="membership-form__field">
                <span>Union Affiliation</span>
                <input name="unionAffiliation" value={form.unionAffiliation} onChange={handleInputChange} />
              </label>
            </div>

            <div className="membership-form__field membership-form__field--checkboxes">
              <span>Gender *</span>
              <div className="membership-form__checkbox-group membership-form__checkbox-group--inline">
                {genderOptions.map((option) => (
                  <label key={option.value}>
                    <input
                      type="checkbox"
                      checked={form.gender === option.value}
                      onChange={() => handleGenderChange(option.value)}
                    />
                    <span>{option.label}</span>
                    {option.value === "Other" && form.gender === "Other" && (
                      <input
                        type="text"
                        placeholder="Please specify"
                        value={form.otherGender}
                        onChange={(event) => setForm((prev) => ({ ...prev, otherGender: event.target.value }))}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="membership-form__section">
            <div className="membership-form__section-banner">Employment Information</div>
            <div className="membership-form__fields membership-form__fields--cols-2">
              <label className="membership-form__field">
                <span>Employer *</span>
                <input name="company" value={form.company} onChange={handleInputChange} required />
              </label>
              <label className="membership-form__field">
                <span>Position *</span>
                <input name="position" value={form.position} onChange={handleInputChange} required />
              </label>
            </div>
            <div className="membership-form__fields membership-form__fields--cols-2">
              <label className="membership-form__field">
                <span>Unit / Section</span>
                <input name="department" value={form.department} onChange={handleInputChange} />
              </label>
              <label className="membership-form__field">
                <span>Years Employed</span>
                <input
                  name="yearsEmployed"
                  type="number"
                  min="0"
                  value={form.yearsEmployed}
                  onChange={handleInputChange}
                />
              </label>
            </div>
            <div className="membership-form__fields membership-form__fields--cols-2">
              <label className="membership-form__field">
                <span>Name of Union</span>
                <input name="unionAffiliation" value={form.unionAffiliation} onChange={handleInputChange} />
              </label>
              <label className="membership-form__field">
                <span>Position in Union *</span>
                <input name="unionPosition" value={form.unionPosition} onChange={handleInputChange} required />
              </label>
            </div>
          </section>

          <section className="membership-form__section">
            <div className="membership-form__section-banner membership-form__section-banner--uppercase">
              Contact Person in Case of Emergency
            </div>
            <div className="membership-form__fields membership-form__fields--cols-2">
              <label className="membership-form__field">
                <span>Full Name *</span>
                <input
                  name="name"
                  value={form.emergencyContact.name}
                  onChange={handleEmergencyChange}
                  required
                />
              </label>
              <label className="membership-form__field">
                <span>Relationship *</span>
                <select
                  name="relationship"
                  value={form.emergencyContact.relationship}
                  onChange={handleEmergencyChange}
                  required
                >
                  <option value="" disabled>Select relationship</option>
                  {relationshipOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="membership-form__fields membership-form__fields--cols-2">
              <label className="membership-form__field">
                <span>Contact No. *</span>
                <input
                  name="phone"
                  value={form.emergencyContact.phone}
                  onChange={handleEmergencyChange}
                  placeholder="(+63) 917 123 4567"
                  required
                />
              </label>
              <label className="membership-form__field membership-form__field--textarea">
                <span>Address *</span>
                <textarea
                  name="address"
                  value={form.emergencyContact.address}
                  onChange={handleEmergencyChange}
                  required
                />
              </label>
            </div>
          </section>

          <section className="membership-form__section membership-form__section--legal">
            <div>
              <h4>A note on Data Privacy and Confidentiality:</h4>
              <p>
                The Associated Labor Unions adheres to the rules and regulations set by Republic Act No. 10173 or the
                Data Privacy Act of 2012. All information provided in this form will be treated with utmost confidentiality.
              </p>
            </div>
            <div>
              <h4>Informed Consent:</h4>
              <p>
                The Associated Labor Unions may compile statistics on personal and sensitive personal information I have
                willfully submitted and declared in connection with my union membership application subject to the
                provisions of the Philippine Data Privacy Act. I understand that all information in my application and
                requests are necessary and will be treated with utmost confidentiality.
              </p>
            </div>
          </section>

          <section className="membership-form__section membership-form__section--signature">
            <div className="membership-form__signature">
              <div />
              <span>Signature</span>
            </div>
          </section>

          <section className="membership-form__section membership-form__section--actions">
            <div className="membership-form__actions">
              <button
                type="submit"
                className="membership-form__button membership-form__button--primary"
                disabled={isSubmitDisabled || submitting}
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
              <button
                type="button"
                className="membership-form__button membership-form__button--outline"
                onClick={handleDownload}
              >
                <Download size={16} />
                Download PDF
              </button>
              <button
                type="button"
                className="membership-form__button membership-form__button--outline"
                onClick={handlePrint}
              >
                <Printer size={16} />
                Print Form
              </button>
            </div>
          </section>
        </div>

        <section className="membership-form__support">
          <div className="membership-form__support-card membership-form__support-card--primary">
            <FileText size={18} />
            <div>
              <h3>Required Documents</h3>
              <ul>
                <li>Recent 2x2 ID photo (attach to printed form)</li>
                <li>Employment verification (company ID or payslip)</li>
                <li>Valid government-issued ID</li>
              </ul>
            </div>
          </div>
          <div className="membership-form__support-card">
            <Printer size={18} />
            <div>
              <h3>Processing Information</h3>
              <ul>
                <li>Form processing takes 5-7 business days</li>
                <li>You'll receive email notification upon approval</li>
                <li>Keep a copy of your completed form for records</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="membership-form__footer">
          Need assistance? Contact ALU at <strong>(02) 8123-4567</strong> or visit our office during business hours.
        </footer>
      </div>
    </form>
  );
}

RegistrationPage.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  submitError: PropTypes.string,
  initialData: PropTypes.object,
};

RegistrationPage.defaultProps = {
  submitting: false,
  submitError: "",
  initialData: null,
};
