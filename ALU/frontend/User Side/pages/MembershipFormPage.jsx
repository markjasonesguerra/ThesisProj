import PropTypes from "prop-types";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Printer,
} from "lucide-react";
import AppLayout from "@components/AppLayout";
import "../styles/membership-form.css";

const PLACEHOLDER = "\u2014";

const formatDate = (value, options = { month: "long", day: "numeric", year: "numeric" }) => {
  if (!value) return PLACEHOLDER;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? PLACEHOLDER : date.toLocaleDateString("en-US", options);
};

const safeText = (value, fallback = PLACEHOLDER) => {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : fallback;
};

const getAge = (dateOfBirth) => {
  if (!dateOfBirth) return PLACEHOLDER;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return PLACEHOLDER;
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
};

const getDobSegments = (dateOfBirth) => {
  if (!dateOfBirth) return ["", "", ""];
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return ["", "", ""];
  return [
    String(dob.getMonth() + 1).padStart(2, "0"),
    String(dob.getDate()).padStart(2, "0"),
    String(dob.getFullYear()),
  ];
};

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

const requiredDocuments = [
  "Recent 2x2 ID photo (attach to printed form)",
  "Employment verification (company ID or payslip)",
  "Valid government-issued ID",
];

const processingNotes = [
  "Form processing takes 5-7 business days",
  "You'll receive email notification upon approval",
  "Keep a copy of your completed form for records",
];

const inputValue = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

export default function MembershipFormPage({ user, onLogout }) {
  const navigate = useNavigate();
  const isApproved = user?.isApproved === 'active' || user?.isApproved === 'approved' || user?.isApproved === true || user?.isApproved === 1 || user?.isApproved === '1';
  const isIncomplete = user?.isApproved === 'incomplete' || ((user?.isApproved === 'pending' || user?.isApproved === 0 || user?.isApproved === false) && !user?.dateOfBirth);
  const emergencyContact = user?.emergencyContact ?? {};

  const fullName = useMemo(
    () =>
      [user?.firstName, user?.middleInitial ? `${user.middleInitial}.` : null, user?.lastName]
        .filter(Boolean)
        .join(" ") || PLACEHOLDER,
    [user?.firstName, user?.middleInitial, user?.lastName],
  );

  const membershipYear = useMemo(() => {
    if (!user?.membershipDate) return PLACEHOLDER;
    const date = new Date(user.membershipDate);
    return Number.isNaN(date.getTime()) ? PLACEHOLDER : date.getFullYear();
  }, [user?.membershipDate]);

  const dobSegments = useMemo(() => getDobSegments(user?.dateOfBirth), [user?.dateOfBirth]);
  const calculatedAge = useMemo(() => getAge(user?.dateOfBirth), [user?.dateOfBirth]);

  const resolvedGender = useMemo(() => {
    if (!user?.gender) return null;
    const normalized = user.gender.toLowerCase();
    if (normalized === "male" || normalized === "man") return "Male";
    if (normalized === "female" || normalized === "woman") return "Female";
    if (normalized === "prefer not to say") return "Prefer not to say";
    return "Other";
  }, [user?.gender]);

  const otherGenderValue = useMemo(() => {
    if (!user?.gender) return "";
    const normalized = user.gender.toLowerCase();
    if (["male", "man", "female", "woman", "prefer not to say"].includes(normalized)) {
      return "";
    }
    return user.gender;
  }, [user?.gender]);

  const maritalStatusValue = useMemo(() => {
    if (!user?.maritalStatus) return "";
    const normalized = user.maritalStatus.toLowerCase();
    if (normalized === "single") return "Single";
    if (normalized === "married") return "Married";
    if (normalized === "divorced" || normalized === "divorce") return "Divorced";
    return "Others";
  }, [user?.maritalStatus]);

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

  const bannerIcon = isApproved ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />;
  const bannerTone = isApproved ? "approved" : "pending";
  const [dobMonth, dobDay, dobYear] = dobSegments;

  return (
    <AppLayout title="Membership Registration" user={user} onLogout={onLogout}>
      <div className="membership-form">
        <div className="membership-form__container">
          <header className="membership-form__header">
            <button
              type="button"
              className="membership-form__back"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="membership-form__heading">
              <h1>Membership Registration Form</h1>
              <p>Complete your ALU membership application</p>
            </div>
          </header>

          {user && (
            <section className={`membership-form__banner membership-form__banner--${bannerTone}`}>
              <div className="membership-form__banner-content">
                <span className={`membership-form__banner-icon membership-form__banner-icon--${bannerTone}`}>
                  {bannerIcon}
                </span>
                <div>
                  <h2>{isApproved ? "Membership Approved" : (isIncomplete ? "Verification Required" : "Membership Pending Approval")}</h2>
                  <p>
                    {isApproved
                      ? "Your membership has been approved. Below is your official registration information."
                      : (isIncomplete 
                          ? "Your membership profile is incomplete. Please verify your details to submit your application."
                          : "Your membership application is under review. You can review the submitted information while awaiting approval.")}
                  </p>
                  <div className="membership-form__banner-meta">
                    <span>
                      Member ID: <strong>{safeText(user?.digitalId, "Pending assignment")}</strong>
                    </span>
                    <span>
                      Submitted: <strong>{formatDate(user?.membershipDate)}</strong>
                    </span>
                  </div>
                </div>
              </div>
              <span className={`membership-form__banner-badge membership-form__banner-badge--${bannerTone}`}>
                {isApproved ? "APPROVED" : (isIncomplete ? "INCOMPLETE" : "PENDING")}
              </span>
            </section>
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
              <div className="membership-form__photo-slot">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Member" />
                ) : (
                  <div>
                    <span>2x2 picture</span>
                    <span>here</span>
                  </div>
                )}
              </div>
            </div>

            <div className="membership-form__card-title">
              <h3>Membership Registration Form</h3>
              {user && (
                <p>
                  Member ID: <span>{safeText(user?.digitalId, "Pending assignment")}</span>
                </p>
              )}
            </div>

            <section className="membership-form__section">
              <div className="membership-form__section-banner">Personal Information</div>
              <div className="membership-form__fields membership-form__fields--cols-3">
                <label className="membership-form__field">
                  <span>Full Name</span>
                  <input type="text" readOnly value={fullName === PLACEHOLDER ? "" : fullName} />
                </label>
                <label className="membership-form__field">
                  <span>Place of Birth</span>
                  <input type="text" readOnly value={inputValue(user?.placeOfBirth)} />
                </label>
                <label className="membership-form__field membership-form__field--dob">
                  <span>Date of Birth</span>
                  <div className="membership-form__dob-inputs">
                    <input type="text" placeholder="MM" readOnly value={dobMonth} />
                    <span>-</span>
                    <input type="text" placeholder="DD" readOnly value={dobDay} />
                    <span>-</span>
                    <input type="text" placeholder="YYYY" readOnly value={dobYear} />
                  </div>
                </label>
              </div>

              <label className="membership-form__field membership-form__field--textarea">
                <span>Address</span>
                <textarea rows={2} readOnly value={inputValue(user?.address)} />
              </label>

              <div className="membership-form__fields membership-form__fields--cols-4">
                <div className="membership-form__field membership-form__field--checkboxes">
                  <span>Status</span>
                  <div className="membership-form__checkbox-group">
                    {maritalStatusOptions.map((option) => (
                      <label key={option.value}>
                        <input
                          type="checkbox"
                          checked={maritalStatusValue === option.value}
                          disabled
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="membership-form__field">
                  <span>Age</span>
                  <input
                    type="text"
                    readOnly
                    value={calculatedAge === PLACEHOLDER ? "" : calculatedAge}
                  />
                </label>
                <label className="membership-form__field">
                  <span>Educational Attainment</span>
                  <input type="text" readOnly value={inputValue(user?.education)} />
                </label>
                <label className="membership-form__field">
                  <span>No. of Children</span>
                  <input type="text" readOnly value={inputValue(user?.numberOfChildren)} />
                </label>
              </div>

              <div className="membership-form__fields membership-form__fields--cols-3">
                <label className="membership-form__field">
                  <span>Religion</span>
                  <input type="text" readOnly value={inputValue(user?.religion)} />
                </label>
                <label className="membership-form__field">
                  <span>Contact No.</span>
                  <input type="text" readOnly value={inputValue(user?.phone)} />
                </label>
                <label className="membership-form__field">
                  <span>Email</span>
                  <input type="email" readOnly value={inputValue(user?.email)} />
                </label>
              </div>

              <div className="membership-form__field membership-form__field--checkboxes">
                <span>Gender</span>
                <div className="membership-form__checkbox-group membership-form__checkbox-group--inline">
                  {genderOptions.map((option) => (
                    <label key={option.value}>
                      <input type="checkbox" checked={resolvedGender === option.value} disabled />
                      <span>{option.label}</span>
                      {option.value === "Other" && (
                        <input
                          type="text"
                          readOnly
                          placeholder="Please specify"
                          value={resolvedGender === "Other" ? otherGenderValue : ""}
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
                  <span>Employer</span>
                  <input type="text" readOnly value={inputValue(user?.company)} />
                </label>
                <label className="membership-form__field">
                  <span>Position</span>
                  <input type="text" readOnly value={inputValue(user?.position)} />
                </label>
              </div>

              <div className="membership-form__fields membership-form__fields--cols-2">
                <label className="membership-form__field">
                  <span>Unit / Section</span>
                  <input type="text" readOnly value={inputValue(user?.department)} />
                </label>
                <label className="membership-form__field">
                  <span>Years Employed</span>
                  <input type="text" readOnly value={inputValue(user?.yearsEmployed)} />
                </label>
              </div>

              <label className="membership-form__field">
                <span>Name of Union</span>
                <input type="text" readOnly value={inputValue(user?.unionAffiliation)} />
              </label>

              <div className="membership-form__fields membership-form__fields--cols-2">
                <label className="membership-form__field">
                  <span>Position in Union</span>
                  <input type="text" readOnly value={inputValue(user?.unionPosition)} />
                </label>
                <label className="membership-form__field">
                  <span>Date of Membership</span>
                  <input type="text" readOnly value={formatDate(user?.membershipDate)} />
                </label>
              </div>
            </section>

            <section className="membership-form__section">
              <div className="membership-form__section-banner membership-form__section-banner--uppercase">
                Contact Person in Case of Emergency
              </div>
              <div className="membership-form__fields membership-form__fields--cols-2">
                <label className="membership-form__field">
                  <span>Full Name</span>
                  <input type="text" readOnly value={inputValue(emergencyContact.name)} />
                </label>
                <label className="membership-form__field">
                  <span>Relationship</span>
                  <input type="text" readOnly value={inputValue(emergencyContact.relationship)} />
                </label>
              </div>

              <label className="membership-form__field membership-form__field--textarea">
                <span>Address</span>
                <textarea rows={2} readOnly value={inputValue(emergencyContact.address)} />
              </label>

              <label className="membership-form__field membership-form__field--narrow">
                <span>Contact No.</span>
                <input type="text" readOnly value={inputValue(emergencyContact.phone)} />
              </label>
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
                  type="button"
                  className="membership-form__button membership-form__button--primary"
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
                  {requiredDocuments.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="membership-form__support-card">
              <Printer size={18} />
              <div>
                <h3>Processing Information</h3>
                <ul>
                  {processingNotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <footer className="membership-form__footer">
            Need assistance? Contact ALU at <strong>(02) 8123-4567</strong> or visit our office during business hours.
          </footer>
        </div>
      </div>
    </AppLayout>
  );
}

MembershipFormPage.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    middleInitial: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    address: PropTypes.string,
    company: PropTypes.string,
    position: PropTypes.string,
    department: PropTypes.string,
    yearsEmployed: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    unionAffiliation: PropTypes.string,
    unionPosition: PropTypes.string,
    membershipDate: PropTypes.string,
    isApproved: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    profilePicture: PropTypes.string,
    digitalId: PropTypes.string,
    dateOfBirth: PropTypes.string,
    placeOfBirth: PropTypes.string,
    maritalStatus: PropTypes.string,
    numberOfChildren: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    religion: PropTypes.string,
    education: PropTypes.string,
    gender: PropTypes.string,
    emergencyContact: PropTypes.shape({
      name: PropTypes.string,
      relationship: PropTypes.string,
      phone: PropTypes.string,
      address: PropTypes.string,
    }),
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};
