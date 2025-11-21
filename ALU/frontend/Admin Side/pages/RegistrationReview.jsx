import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Copy,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  X,
} from "lucide-react";
import "../styles/admin-base.css";
import client from "../../src/api/client";

const DEFAULT_ADMIN_ID = (() => {
  const envValue = process.env.REACT_APP_DEFAULT_ADMIN_ID;
  const parsed = envValue ? Number.parseInt(envValue, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
})();

const DEFAULT_ADMIN_NAME = (() => {
  const envValue = process.env.REACT_APP_DEFAULT_ADMIN_NAME;
  if (typeof envValue === "string" && envValue.trim().length) {
    return envValue.trim();
  }
  return "Admin Portal";
})();

const rejectionReasons = [
  "Incomplete documentation",
  "Invalid company information",
  "Duplicate registration detected",
  "Invalid contact information",
  "Photo quality issues",
  "Employment verification failed",
  "Other (specify below)",
];

const defaultSummary = {
  totalPending: 0,
  highPriority: 0,
  duplicates: 0,
  docIssues: 0,
};

export default function RegistrationReview() {
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(rejectionReasons[0]);
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [actionErrors, setActionErrors] = useState({ approve: "", reject: "" });
  const [currentAction, setCurrentAction] = useState(null);

  const isApproveProcessing = currentAction === "approve";
  const isRejectProcessing = currentAction === "reject";

  const applyQueuePayload = useCallback((payload) => {
    const nextQueue = payload?.queue ?? [];
    setQueue(nextQueue);
    setSummary(payload?.summary ?? defaultSummary);
  }, []);

  const buildActionErrorMessage = useCallback((err, fallback) => {
    if (!err) return fallback;
    const payload = err?.response?.data ?? {};
    const candidates = [payload.message, payload.error, err.message, fallback];
    const resolved = candidates.find((candidate) => typeof candidate === "string" && candidate.trim().length);
    return resolved ?? fallback;
  }, []);

  useEffect(() => {
    let subscribed = true;

    const fetchQueue = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await client.get("/api/admin/registrations/review");
        if (!subscribed) return;
        applyQueuePayload(response.data ?? {});
      } catch (err) {
        if (!subscribed) return;
        setError(err?.response?.data?.message ?? "Unable to load registration queue.");
        setQueue([]);
        setSummary(defaultSummary);
        setSelectedId(null);
      } finally {
        if (subscribed) {
          setLoading(false);
        }
      }
    };

    fetchQueue();
    return () => {
      subscribed = false;
    };
  }, [applyQueuePayload]);

  useEffect(() => {
    if (!queue.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queue.some((entry) => entry.id === selectedId)) {
      setSelectedId(queue[0].id);
      setActiveTab("details");
    }
  }, [queue, selectedId]);

  useEffect(() => {
    setPreviewDocument(null);
    setCopyStatus("");
  }, [selectedId]);

  const selectedRegistration = useMemo(
    () => queue.find((entry) => entry.id === selectedId) ?? null,
    [queue, selectedId],
  );

  const documentFiles = selectedRegistration?.documentFiles ?? [];

  const overview = useMemo(() => {
    const computed = {
      totalPending: queue.length,
      highPriority: queue.filter((entry) => entry.priority === "High").length,
      duplicates: queue.filter((entry) => entry.duplicateFlag).length,
      docIssues: queue.filter((entry) => !(entry.validationChecks?.documentsComplete)).length,
    };
    return {
      totalPending: summary?.totalPending ?? computed.totalPending,
      highPriority: summary?.highPriority ?? computed.highPriority,
      duplicates: summary?.duplicates ?? computed.duplicates,
      docIssues: summary?.docIssues ?? computed.docIssues,
    };
  }, [queue, summary]);

  const formatDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getInitials = (value) => {
    if (!value) return "?";
    return (
      value
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?"
    );
  };

  const resetRejectionForm = () => {
    setRejectionReason(rejectionReasons[0]);
    setCustomReason("");
  };

  const closeApproveDialog = () => {
    setActionErrors((prev) => ({ ...prev, approve: "" }));
    setShowApproveDialog(false);
  };

  const closeRejectDialog = () => {
    setActionErrors((prev) => ({ ...prev, reject: "" }));
    resetRejectionForm();
    setShowRejectDialog(false);
  };

  const handleApprove = async () => {
    if (!selectedRegistration?.userId) return;
    setActionErrors((prev) => ({ ...prev, approve: "" }));
    setCurrentAction("approve");
    try {
      const response = await client.post(`/api/admin/registrations/${selectedRegistration.userId}/approve`, {
        actorAdminId: DEFAULT_ADMIN_ID,
        actorName: DEFAULT_ADMIN_NAME,
      });
      applyQueuePayload(response.data ?? {});
      closeApproveDialog();
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        approve: buildActionErrorMessage(err, "Unable to approve registration. Please try again."),
      }));
    } finally {
      setCurrentAction(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRegistration?.userId) return;
    const finalReason =
      rejectionReason === "Other (specify below)" ? customReason.trim() : rejectionReason;

    if (!finalReason) {
      setActionErrors((prev) => ({ ...prev, reject: "Please provide a rejection reason." }));
      return;
    }

    setActionErrors((prev) => ({ ...prev, reject: "" }));
    setCurrentAction("reject");
    try {
      const response = await client.post(`/api/admin/registrations/${selectedRegistration.userId}/reject`, {
        reason: finalReason,
        category: rejectionReason,
        actorAdminId: DEFAULT_ADMIN_ID,
        actorName: DEFAULT_ADMIN_NAME,
      });
      applyQueuePayload(response.data ?? {});
      closeRejectDialog();
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        reject: buildActionErrorMessage(err, "Unable to reject registration. Please try again."),
      }));
    } finally {
      setCurrentAction(null);
    }
  };

  const fileBaseUrl = (() => {
    if (typeof process.env.REACT_APP_FILE_BASE_URL === "string") {
      return process.env.REACT_APP_FILE_BASE_URL.replace(/\/$/, "");
    }
    const apiBase = client?.defaults?.baseURL;
    if (typeof apiBase === "string") {
      return apiBase.replace(/\/$/, "");
    }
    return "";
  })();

  const resolveDocumentUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    if (!fileBaseUrl) {
      return null;
    }
    const sanitizedPath = String(path).replace(/^\/+/, "");
    return `${fileBaseUrl}/${sanitizedPath}`;
  };

  const handleDocumentView = (doc) => {
    if (!doc?.filePath) return;
    const url = resolveDocumentUrl(doc.filePath);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewDocument({ ...doc, action: "view" });
  };

  const handleDocumentDownload = (doc) => {
    if (!doc?.filePath) return;
    const url = resolveDocumentUrl(doc.filePath);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewDocument({ ...doc, action: "download" });
  };

  const handleCopyDocumentPath = async (path) => {
    if (!path) return;
    try {
      if (!navigator?.clipboard?.writeText) {
        setCopyStatus("Clipboard access not available.");
        return;
      }
      await navigator.clipboard.writeText(path);
      setCopyStatus("Copied to clipboard");
      setTimeout(() => setCopyStatus(""), 1500);
    } catch (clipboardError) {
      setCopyStatus("Unable to copy. Please copy manually.");
    }
  };

  const previewUrl = previewDocument ? resolveDocumentUrl(previewDocument.filePath) : null;

  const renderValidationRow = (label, valid) => (
    <div className="admin-validation-row" key={label}>
      <span>{label}</span>
      <span className={`admin-validation-status ${valid ? "is-valid" : "is-invalid"}`}>
        {valid ? <Check size={14} /> : <X size={14} />}
        {valid ? "Valid" : "Needs attention"}
      </span>
    </div>
  );

  return (
    <div className="admin-page admin-stack-xl">
      <header className="admin-row admin-align-start">
        <div>
          <h1>Registration Review</h1>
          <p className="admin-muted">
            Review and approve pending member registrations ({overview.totalPending} waiting in queue).
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-button">
            Bulk actions
          </button>
          <button type="button" className="admin-button">
            <Download size={16} /> Export queue
          </button>
        </div>
      </header>

      {error ? (
        <section className="admin-surface">
          <div className="admin-empty-state">{error}</div>
        </section>
      ) : null}

      <section className="admin-card-grid cols-4">
        <article className="admin-card">
          <div className="admin-card__label">Pending approvals</div>
          <div className="admin-card__value">{overview.totalPending}</div>
          <div className="admin-card__meta">AI pre-screen suggests 6 fast track</div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">High risk cases</div>
          <div className="admin-card__value">{overview.highPriority}</div>
          <div className="admin-card__meta">Need manual verification</div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">Potential duplicates</div>
          <div className="admin-card__value">{overview.duplicates}</div>
          <div className="admin-card__meta">Auto-matched via email + employer</div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">Incomplete documents</div>
          <div className="admin-card__value">{overview.docIssues}</div>
          <div className="admin-card__meta">AI flagged missing uploads</div>
        </article>
      </section>

      <div className="admin-registration-layout">
        <aside className="admin-queue">
          <div className="admin-queue__header">
            <h2>Review queue</h2>
            <span className="admin-pill">
              <Clock size={14} /> Auto-sorted by priority
            </span>
          </div>
          <div className="admin-queue__list">
            {queue.map((registration) => {
              const isActive = registration.id === selectedId;
              const initials = getInitials(registration.fullName);
              const priorityTone =
                registration.priority === "High"
                  ? "is-red"
                  : registration.priority === "Normal"
                  ? "is-blue"
                  : "is-purple";
              const documentsComplete = registration.validationChecks?.documentsComplete;
              return (
                <button
                  type="button"
                  key={registration.id}
                  className={`admin-queue__item ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedId(registration.id);
                    setActiveTab("details");
                  }}
                >
                  <div className="admin-queue__item-header">
                    <div className="admin-queue__identity">
                      <div className="admin-avatar admin-avatar--sm">{initials}</div>
                      <div>
                        <p className="admin-queue__name">{registration.fullName}</p>
                        <p className="admin-muted">{registration.company || "Company not set"}</p>
                      </div>
                    </div>
                    <span className={`admin-badge ${priorityTone}`}>
                      {registration.priority}
                    </span>
                  </div>
                  <div className="admin-queue__meta">
                    <span>{formatDate(registration.submittedDate)}</span>
                    <span>{registration.status}</span>
                  </div>
                  <div className="admin-queue__flags">
                    {registration.duplicateFlag ? (
                      <span className="admin-chip is-orange">
                        <AlertTriangle size={14} /> Duplicate warning
                      </span>
                    ) : null}
                    {documentsComplete === false ? (
                      <span className="admin-chip is-red">
                        <FileText size={14} /> Document issue
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {!loading && !queue.length ? (
              <div className="admin-empty-state">No registrations waiting in the queue.</div>
            ) : null}
            {loading ? <div className="admin-empty-state">Loading queue...</div> : null}
          </div>
        </aside>

        <section className="admin-registration-detail">
          {selectedRegistration ? (
            <div className="admin-surface admin-stack-lg">
              <header className="admin-registration-detail__header">
                <div className="admin-registration-detail__identity">
                  <div className="admin-avatar admin-avatar--lg">
                    {getInitials(selectedRegistration?.fullName)}
                  </div>
                  <div>
                    <h2>{selectedRegistration.fullName}</h2>
                    <p className="admin-muted">{selectedRegistration.email ?? "Email not provided"}</p>
                    <div className="admin-inline-list">
                      <span>
                        <Phone size={14} /> {selectedRegistration.phone ?? "Not provided"}
                      </span>
                      <span>
                        <Building2 size={14} /> {selectedRegistration.company ?? "Company not set"}
                      </span>
                      <span>
                        <MapPin size={14} /> {selectedRegistration.address ?? "Address unavailable"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="admin-registration-detail__actions">
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => {
                      setActionErrors((prev) => ({ ...prev, reject: "" }));
                      setShowRejectDialog(true);
                    }}
                  >
                    <X size={16} /> Reject
                  </button>
                  <button
                    type="button"
                    className="admin-button is-primary"
                    onClick={() => {
                      setActionErrors((prev) => ({ ...prev, approve: "" }));
                      setShowApproveDialog(true);
                    }}
                  >
                    <Check size={16} /> Approve registration
                  </button>
                </div>
              </header>

              <div className="admin-tabs">
                <div className="admin-tabs__list">
                  <button
                    type="button"
                    className={`admin-tabs__trigger ${activeTab === "details" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("details")}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className={`admin-tabs__trigger ${activeTab === "validation" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("validation")}
                  >
                    Validation
                  </button>
                  <button
                    type="button"
                    className={`admin-tabs__trigger ${activeTab === "documents" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("documents")}
                  >
                    Documents
                  </button>
                </div>

                <div className="admin-tabs__content">
                  {activeTab === "details" ? (
                    <div className="admin-detail-grid">
                      <article className="admin-card">
                        <div className="admin-card__label">
                          <User size={16} /> Member profile
                        </div>
                        <div className="admin-stat">
                          <span>Position</span>
                          <span>{selectedRegistration.position ?? "Not provided"}</span>
                        </div>
                        <div className="admin-stat">
                          <span>Department</span>
                          <span>{selectedRegistration.department ?? "Not provided"}</span>
                        </div>
                        <div className="admin-stat">
                          <span>Union affiliation</span>
                          <span>{selectedRegistration.unionAffiliation ?? "Not provided"}</span>
                        </div>
                        <div className="admin-stat">
                          <span>Membership type</span>
                          <span>{selectedRegistration.membershipType ?? "Not specified"}</span>
                        </div>
                      </article>

                      <article className="admin-card">
                        <div className="admin-card__label">
                          <Shield size={16} /> Compliance summary
                        </div>
                        <div className="admin-stat">
                          <span>Payroll consent</span>
                          <span>
                            {selectedRegistration?.payrollConsent === true
                              ? "Confirmed"
                              : selectedRegistration?.payrollConsent === false
                              ? "Missing"
                              : "Not captured"}
                          </span>
                        </div>
                        <div className="admin-stat">
                          <span>Years employed</span>
                          <span>{selectedRegistration.yearsEmployed ?? "Not provided"}</span>
                        </div>
                        <div className="admin-stat">
                          <span>Submitted</span>
                          <span>{formatDate(selectedRegistration.submittedDate)}</span>
                        </div>
                        <div className="admin-stat">
                          <span>Status</span>
                          <span>{selectedRegistration.status ?? "Pending Review"}</span>
                        </div>
                      </article>

                      <article className="admin-card admin-stack-md">
                        <div className="admin-card__label">
                          <Clock size={16} /> Activity timeline
                        </div>
                        <div className="admin-timeline">
                          {(selectedRegistration?.timeline ?? []).map((item, index) => (
                            <div
                              key={`${selectedRegistration?.id ?? index}-${item.time ?? index}`}
                              className="admin-timeline__item"
                            >
                              <span>{item.time}</span>
                              <p>{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      </article>

                      <article className="admin-card admin-stack-md">
                        <div className="admin-card__label">
                          <AlertTriangle size={16} /> Risk notes
                        </div>
                        <ul className="admin-list">
                          {(selectedRegistration?.riskNotes ?? []).map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                        {selectedRegistration.duplicateFlag ? (
                          <div className="admin-callout is-warning">
                            <AlertTriangle size={16} />
                            <div>
                              <strong>Potential duplicate detected</strong>
                              <p>
                                Similar member found with matching company and domain. Review list before approving.
                              </p>
                              <button type="button" className="admin-button admin-button--ghost">
                                View similar member <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    </div>
                  ) : null}

                  {activeTab === "validation" ? (
                    <div className="admin-grid-two">
                      <article className="admin-card admin-stack-md">
                        <div className="admin-card__label">
                          <CheckCircle2 size={16} /> Validation checks
                        </div>
                        {renderValidationRow(
                          "Email address valid",
                          selectedRegistration?.validationChecks?.emailValid ?? false,
                        )}
                        {renderValidationRow(
                          "Phone number valid",
                          selectedRegistration?.validationChecks?.phoneValid ?? false,
                        )}
                        {renderValidationRow(
                          "Documents complete",
                          selectedRegistration?.validationChecks?.documentsComplete ?? false,
                        )}
                        {renderValidationRow(
                          "Company verified",
                          selectedRegistration?.validationChecks?.companyVerified ?? false,
                        )}
                        {renderValidationRow(
                          "No duplicate conflicts",
                          selectedRegistration?.validationChecks?.noDuplicates ?? false,
                        )}
                      </article>

                      <article className="admin-card admin-stack-md">
                        <div className="admin-card__label">
                          <Mail size={16} /> Follow-up actions
                        </div>
                        <p className="admin-muted">
                          Document each contact attempt when requesting missing requirements.
                        </p>
                        <div className="admin-inline-list">
                          <span>
                            <Mail size={14} /> Send email reminder
                          </span>
                          <span>
                            <Phone size={14} /> Log phone follow-up
                          </span>
                          <span>
                            <Calendar size={14} /> Schedule onsite submission
                          </span>
                        </div>
                        <button type="button" className="admin-button admin-button--ghost">
                          Open contact log
                        </button>
                      </article>
                    </div>
                  ) : null}

                  {activeTab === "documents" ? (
                    <div className="admin-documents-grid">
                      {documentFiles.length ? (
                        documentFiles.map((doc) => {
                          const isAvailable = Boolean(doc.filePath);
                          return (
                            <article key={doc.key} className="admin-card admin-stack-sm">
                              <div className="admin-card__label">
                                <FileText size={16} /> {doc.label}
                              </div>
                              <p className="admin-muted">{doc.status}</p>
                              <div className="admin-row">
                                <button
                                  type="button"
                                  className="admin-button admin-button--ghost"
                                  onClick={() => handleDocumentView(doc)}
                                  disabled={!isAvailable}
                                >
                                  <Eye size={14} /> View
                                </button>
                                <button
                                  type="button"
                                  className="admin-button admin-button--ghost"
                                  onClick={() => handleDocumentDownload(doc)}
                                  disabled={!isAvailable}
                                >
                                  <Download size={14} /> Download
                                </button>
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <div className="admin-empty-state">No document metadata available.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-placeholder">
              <User size={32} />
              <h3>Select a registration</h3>
              <p className="admin-muted">
                Choose a registration from the queue to review details and take action.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="admin-surface admin-stack-md">
        <h2>Guided actions</h2>
        <div className="admin-card-grid cols-3">
          <article className="admin-card">
            <div className="admin-card__label">Fast-track approvals</div>
            <p className="admin-muted">
              AI flagged 6 low-risk applications with complete documents. Approve them together to save time.
            </p>
          </article>
          <article className="admin-card">
            <div className="admin-card__label">Manual review alerts</div>
            <p className="admin-muted">
              Three applications require additional verification due to consent mismatches or duplicate warnings.
            </p>
          </article>
          <article className="admin-card">
            <div className="admin-card__label">Weekly summary</div>
            <p className="admin-muted">
              54 registrations received this week • 47 approved • 3 rejected • 4 awaiting documents.
            </p>
          </article>
        </div>
      </section>

      {showApproveDialog ? (
        <div className="admin-dialog" role="dialog" aria-modal="true">
          <div className="admin-dialog__backdrop" onClick={closeApproveDialog} />
          <div className="admin-dialog__panel">
            <header className="admin-dialog__header">
              <h3>Approve registration</h3>
            </header>
            <div className="admin-dialog__body admin-stack-md">
              <p>Confirm approval for {selectedRegistration?.fullName}. This will:</p>
              <ul className="admin-list admin-list--bullet">
                <li>Generate a digital ID for the member</li>
                <li>Send approval notification via email</li>
                <li>Activate the member account</li>
                <li>Add member to the active directory</li>
              </ul>
              {actionErrors.approve ? (
                <div className="admin-callout is-danger">{actionErrors.approve}</div>
              ) : null}
            </div>
            <footer className="admin-dialog__footer">
              <button type="button" className="admin-button" onClick={closeApproveDialog}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-button is-primary"
                onClick={handleApprove}
                disabled={isApproveProcessing}
              >
                {isApproveProcessing ? "Processing..." : "Approve registration"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {showRejectDialog ? (
        <div className="admin-dialog" role="dialog" aria-modal="true">
          <div className="admin-dialog__backdrop" onClick={closeRejectDialog} />
          <div className="admin-dialog__panel">
            <header className="admin-dialog__header">
              <h3>Reject registration</h3>
            </header>
            <div className="admin-dialog__body admin-stack-md">
              <label className="admin-field">
                <span>Rejection reason</span>
                <select value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)}>
                  {rejectionReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
              {rejectionReason === "Other (specify below)" ? (
                <label className="admin-field">
                  <span>Custom reason</span>
                  <textarea
                    rows={4}
                    value={customReason}
                    onChange={(event) => setCustomReason(event.target.value)}
                    placeholder="Please specify the reason for rejection..."
                  />
                </label>
              ) : null}
              {actionErrors.reject ? (
                <div className="admin-callout is-danger">{actionErrors.reject}</div>
              ) : null}
            </div>
            <footer className="admin-dialog__footer">
              <button type="button" className="admin-button" onClick={closeRejectDialog}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-button is-danger"
                onClick={handleReject}
                disabled={isRejectProcessing}
              >
                {isRejectProcessing ? "Processing..." : "Reject registration"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {previewDocument ? (
        <div className="admin-dialog" role="dialog" aria-modal="true">
          <div className="admin-dialog__backdrop" onClick={() => setPreviewDocument(null)} />
          <div className="admin-dialog__panel">
            <header className="admin-dialog__header">
              <h3>{previewDocument.label}</h3>
            </header>
            <div className="admin-dialog__body admin-stack-md">
              <div>
                <strong>Stored path</strong>
                <p className="admin-muted">{previewDocument.filePath ?? "Not available"}</p>
              </div>
              <div>
                <strong>Verification status</strong>
                <p className="admin-muted">
                  {previewDocument.verifiedAt
                    ? `Verified ${formatDateTime(previewDocument.verifiedAt)}`
                    : "Pending admin verification"}
                </p>
              </div>
              <div>
                <strong>Source</strong>
                <p className="admin-muted">
                  {previewDocument.source === "user_documents"
                    ? "Uploaded via user documents"
                    : previewDocument.source === "registration_forms"
                    ? "Provided in registration form"
                    : "Unknown source"}
                </p>
              </div>
              {copyStatus ? <div className="admin-callout is-info">{copyStatus}</div> : null}
            </div>
            <footer className="admin-dialog__footer">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => handleCopyDocumentPath(previewDocument.filePath)}
                disabled={!previewDocument.filePath}
              >
                <Copy size={14} /> Copy path
              </button>
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => {
                  if (previewUrl) {
                    window.open(previewUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                disabled={!previewUrl}
              >
                <ExternalLink size={14} /> Open in new tab
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={() => setPreviewDocument(null)}
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
