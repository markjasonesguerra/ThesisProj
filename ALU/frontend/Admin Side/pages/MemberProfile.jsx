import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  CreditCard,
  Mail,
  Phone,
  Building2,
  Calendar,
  User,
  FileText,
  DollarSign,
  ShieldCheck,
  Clock,
  Users,
} from "lucide-react";
import "../styles/admin-base.css";
import { mockMembers } from "./mockData";
import { mockAITickets } from "../components/ai/mockAiData";
import { getAdminMember } from "../../src/api/admin";
import client from "../../src/api/client";

const formatDate = (value, options) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", options);
};

const defaultPayments = [
  { date: "2025-09-15", amount: "₱200", method: "Payroll deduction", status: "Cleared" },
  { date: "2025-08-15", amount: "₱200", method: "Payroll deduction", status: "Cleared" },
  { date: "2025-07-15", amount: "₱200", method: "Payroll deduction", status: "Cleared" },
];

const defaultDocuments = [
  { name: "Government ID", type: "Identification", uploadedAt: "2025-01-12" },
  { name: "Employment Certificate", type: "Employment", uploadedAt: "2025-01-10" },
  { name: "Union Membership Form", type: "Membership", uploadedAt: "2024-12-01" },
];

const paymentStatusTone = {
  Cleared: "is-green",
  Pending: "is-orange",
  Overdue: "is-red",
};

const resolveFileBaseUrl = () => {
  const base = process.env.REACT_APP_FILE_BASE_URL ?? client?.defaults?.baseURL;
  if (!base) return "";
  return base.replace(/\/$/, "");
};

const resolveDocumentUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = resolveFileBaseUrl();
  if (!base) return null;
  return `${base}/${String(path).replace(/^\/+/, "")}`;
};

export default function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchMember = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getAdminMember(memberId);
        const data = response?.data?.member ?? response?.data;
        if (isMounted) {
          if (data) {
            setMember(data);
          } else {
            setError("Member record not found.");
          }
        }
      } catch (apiError) {
        const fallback = mockMembers.find((entry) => entry.id === memberId || entry.memberID === memberId);
        if (isMounted) {
          if (fallback) {
            setMember(fallback);
          } else {
            setError("Member record not found.");
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMember();
    return () => {
      isMounted = false;
    };
  }, [memberId]);

  const relatedTickets = useMemo(() => {
    if (!member) return [];
    return mockAITickets
      .filter((ticket) => ticket.memberName === member.fullName)
      .slice(0, 4);
  }, [member]);

  const stats = useMemo(() => {
    if (!member) return [];
    const registeredDate = member.registeredDate ?? member.joinDate;
    return [
      {
        label: "Member since",
        value: formatDate(registeredDate, { month: "long", year: "numeric" }),
        tone: "is-blue",
      },
      {
        label: "Union role",
        value: member.unionPosition ?? "Member",
        tone: "is-green",
      },
      {
        label: "Digital ID",
        value: member.digitalID ?? "Not issued",
        tone: "is-purple",
      },
      {
        label: "Dues status",
        value: member.duesStatus ?? "—",
        tone: member.duesStatus === "Overdue" ? "is-red" : "is-orange",
      },
    ];
  }, [member]);

  if (loading) {
    return (
      <div className="admin-page admin-stack-lg">
        <div className="admin-empty-state">Loading member details…</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="admin-page admin-stack-lg">
        <button type="button" className="admin-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back to members
        </button>
        <div className="admin-empty-state">{error || "Member record unavailable."}</div>
      </div>
    );
  }

  const paymentHistory = member.paymentHistory ?? defaultPayments;
  const documents = member.documents ?? defaultDocuments;
  const fileBaseUrl = resolveFileBaseUrl();

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div className="admin-row" style={{ gap: "16px" }}>
          <button type="button" className="admin-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1>{member.fullName}</h1>
            <p className="admin-muted">
              Member ID: {member.memberID} • Joined {formatDate(member.registeredDate ?? member.joinDate)}
            </p>
          </div>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button"
            onClick={() => navigate(`/admin/id-card-management?member=${encodeURIComponent(member.memberID)}`)}
          >
            <CreditCard size={16} /> Issue ID
          </button>
          <button type="button" className="admin-button is-primary" onClick={() => window.print()}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </header>

      <section className="admin-surface admin-stack-md">
        <div className="admin-profile-banner">
          <div className="admin-profile-banner__summary">
            <div className="admin-avatar admin-avatar--xl">
              {member.fullName
                .split(" ")
                .map((name) => name[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <h2>{member.fullName}</h2>
              <p className="admin-muted">{member.position ?? "Union Member"}</p>
              <div className="admin-contact-row">
                <span>
                  <Mail size={14} />
                  {member.email}
                </span>
                <span>
                  <Phone size={14} />
                  {member.mobile}
                </span>
                <span>
                  <ShieldCheck size={14} />
                  {member.status}
                </span>
              </div>
            </div>
          </div>
          <div className="admin-profile-banner__meta">
            <div>
              <strong>Union Affiliation</strong>
              <p>{member.unionAffiliation ?? "—"}</p>
            </div>
            <div>
              <strong>Company</strong>
              <p>{member.company ?? "—"}</p>
            </div>
            <div>
              <strong>Digital ID</strong>
              <p>{member.digitalID ?? "Pending"}</p>
            </div>
          </div>
        </div>

        <div className="admin-card-grid cols-4">
          {stats.map((item) => (
            <article key={item.label} className="admin-card">
              <div className="admin-card__label">{item.label}</div>
              <div className="admin-card__value">{item.value}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <h2>Personal & employment</h2>
        <div className="admin-detail-grid">
          <article className="admin-card">
            <div className="admin-card__label">
              <User size={16} /> Personal information
            </div>
            <div className="admin-stat">
              <span>Date of birth</span>
              <span>{formatDate(member.dateOfBirth, { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="admin-stat">
              <span>Address</span>
              <span>{member.address ?? "—"}</span>
            </div>
            <div className="admin-stat">
              <span>Years employed</span>
              <span>{member.yearsEmployed ?? "—"}</span>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card__label">
              <Building2 size={16} /> Employment details
            </div>
            <div className="admin-stat">
              <span>Company</span>
              <span>{member.company ?? "—"}</span>
            </div>
            <div className="admin-stat">
              <span>Department</span>
              <span>{member.department ?? "—"}</span>
            </div>
            <div className="admin-stat">
              <span>Position</span>
              <span>{member.position ?? "—"}</span>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card__label">
              <Users size={16} /> Emergency contact
            </div>
            <div className="admin-stat">
              <span>Contact</span>
              <span>{member.emergencyContact ?? "Not provided"}</span>
            </div>
            <div className="admin-stat">
              <span>Preferred notice</span>
              <span>{member.mobile ?? "—"}</span>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card__label">
              <Calendar size={16} /> Membership timeline
            </div>
            <div className="admin-stat">
              <span>Registered</span>
              <span>{formatDate(member.registeredDate ?? member.joinDate)}</span>
            </div>
            <div className="admin-stat">
              <span>Status</span>
              <span>{member.status}</span>
            </div>
            <div className="admin-stat">
              <span>Dues status</span>
              <span>{member.duesStatus}</span>
            </div>
          </article>
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <header className="admin-row">
          <div className="admin-row" style={{ gap: "8px" }}>
            <DollarSign size={16} />
            <div>
              <h2>Dues & payments</h2>
              <p className="admin-muted">Track dues history, amounts, and upcoming obligations.</p>
            </div>
          </div>
        </header>
        <div className="admin-detail-grid">
          <article className="admin-card">
            <div className="admin-stat">
              <span>Total paid</span>
              <span>{member.totalPaid ?? "₱2,400"}</span>
            </div>
            <div className="admin-stat">
              <span>Outstanding</span>
              <span>{member.outstanding ?? (member.duesStatus === "Overdue" ? "₱200" : "₱0")}</span>
            </div>
            <div className="admin-stat">
              <span>Next due date</span>
              <span>{formatDate(member.nextDueDate ?? new Date(), { month: "long", year: "numeric" })}</span>
            </div>
          </article>
          <article className="admin-card admin-table-card">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Payment date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={`${payment.date}-${payment.amount}`}>
                      <td>{formatDate(payment.date)}</td>
                      <td>{payment.amount}</td>
                      <td>{payment.method}</td>
                      <td>
                        <span className={`admin-pill ${paymentStatusTone[payment.status] ?? ""}`.trim()}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paymentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="admin-empty-state">No payment history on file.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <header className="admin-row">
          <div className="admin-row" style={{ gap: "8px" }}>
            <FileText size={16} />
            <div>
              <h2>Documents</h2>
              <p className="admin-muted">Key files uploaded for this member.</p>
            </div>
          </div>
        </header>
        <div className="admin-detail-grid">
          {documents.map((doc) => {
            const docUrl = resolveDocumentUrl(doc.filePath);
            return (
              <article key={doc.name} className="admin-card">
                <div className="admin-card__label">{doc.type}</div>
                <div className="admin-card__value" style={{ fontSize: "18px" }}>{doc.name}</div>
                <div className="admin-card__meta">
                  Uploaded {formatDate(doc.uploadedAt)}
                  {doc.status ? ` • ${doc.status}` : ""}
                </div>
                <div className="admin-pill-group">
                  <button
                    type="button"
                    className="admin-button admin-button--ghost"
                    onClick={() => {
                      if (docUrl) window.open(docUrl, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!docUrl}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--ghost"
                    onClick={() => {
                      if (docUrl) window.open(docUrl, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!docUrl}
                  >
                    Download
                  </button>
                </div>
                {!fileBaseUrl && doc.filePath ? (
                  <p className="admin-muted" style={{ fontSize: "12px" }}>
                    File path: {doc.filePath}
                  </p>
                ) : null}
              </article>
            );
          })}
          {documents.length === 0 ? (
            <div className="admin-empty-state">No documents uploaded.</div>
          ) : null}
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <header className="admin-row">
          <div className="admin-row" style={{ gap: "8px" }}>
            <Clock size={16} />
            <div>
              <h2>Recent activity</h2>
              <p className="admin-muted">System and benefits activity associated with this member.</p>
            </div>
          </div>
        </header>
        <div className="admin-list">
          {relatedTickets.length ? (
            relatedTickets.map((ticket) => (
              <div key={ticket.id} className="admin-card" style={{ gap: "8px" }}>
                <div className="admin-row" style={{ gap: "10px" }}>
                  <span className="admin-pill is-blue">{ticket.ticketId}</span>
                  <strong>{ticket.title}</strong>
                </div>
                <p className="admin-muted">{ticket.category}</p>
                <div className="admin-contact-row">
                  <span>
                    <ShieldCheck size={14} /> {ticket.status}
                  </span>
                  <span>
                    <CreditCard size={14} /> Confidence {Math.round(ticket.suggestion.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="admin-empty-state">No recent tickets for this member.</div>
          )}
        </div>
      </section>
    </div>
  );
}
