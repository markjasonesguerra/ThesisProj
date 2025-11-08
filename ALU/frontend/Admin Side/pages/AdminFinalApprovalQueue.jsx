import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  XCircle,
  RefreshCcw,
  Clock,
  Send,
} from "lucide-react";
import "../styles/admin-base.css";
import client from "../../src/api/client";

export default function AdminFinalApprovalQueue() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ pendingFinal: 0, approvedToday: 0, returned: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const computeTime = (value, fallback) => {
    if (fallback) return fallback;
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < hour) {
      const minutes = Math.max(1, Math.round(diffMs / minute));
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }
    if (diffMs < day) {
      const hours = Math.round(diffMs / hour);
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }
    const days = Math.round(diffMs / day);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get("/api/admin/approvals/final-queue");
      setItems(response.data?.items ?? []);
      setStats(response.data?.stats ?? {});
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to load approval queue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const pending = useMemo(
    () => items.filter((item) => item.status === "Pending Final Approval"),
    [items],
  );

  const pendingCount = stats.pendingFinal ?? pending.length;
  const approvedToday = stats.approvedToday ?? items.filter((item) => item.status === "Approved & Sent").length;
  const returned = stats.returned ?? items.filter((item) => item.status === "Returned to Proponent").length;
  const rejected = stats.rejected ?? items.filter((item) => item.status === "Rejected").length;

  return (
    <div className="admin-page">
      <header className="admin-row">
        <div>
          <h1>Final Approval Queue</h1>
          <p className="admin-muted">
            Review proponent-approved responses and confirm the final version
            before they reach members.
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-button" onClick={loadQueue} disabled={loading}>
            <RefreshCcw size={16} /> {loading ? "Refreshing" : "Refresh Data"}
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
          <div className="admin-card__label">Pending Final Approval</div>
          <div className="admin-row" style={{ gap: "10px" }}>
            <div className="admin-card__value">{pendingCount}</div>
            <span className="admin-chip is-orange">
              <Clock size={16} /> Queue
            </span>
          </div>
          <div className="admin-card__meta">
            Responses that still need the admin signature
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card__label">Approved Today</div>
          <div className="admin-row">
            <div className="admin-card__value">{approvedToday}</div>
            <span className="admin-chip is-green">
              <Send size={16} /> Sent
            </span>
          </div>
          <div className="admin-card__meta">Messages released to members</div>
        </article>

        <article className="admin-card">
          <div className="admin-card__label">Returned for Revision</div>
          <div className="admin-row">
            <div className="admin-card__value">{returned}</div>
            <span className="admin-chip is-blue">
              <RefreshCcw size={16} /> Feedback
            </span>
          </div>
          <div className="admin-card__meta">Awaiting proponent adjustment</div>
        </article>

        <article className="admin-card">
          <div className="admin-card__label">Rejected Responses</div>
          <div className="admin-row">
            <div className="admin-card__value">{rejected}</div>
            <span className="admin-chip is-red">
              <XCircle size={16} /> Rejected
            </span>
          </div>
          <div className="admin-card__meta">Flagged for policy review</div>
        </article>
      </section>

      <section className="admin-surface">
        <div className="admin-row">
          <h2>Responses Awaiting Final Approval</h2>
          <span className="admin-pill">Confidence & timestamps from AI assistance</span>
        </div>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Member Alias</th>
                <th>Category</th>
                <th>Proponent</th>
                <th>AI Confidence</th>
                <th>Time Since Approval</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.ticketId}</td>
                  <td>{item.member}</td>
                  <td>{item.category}</td>
                  <td>
                    <div className="admin-stat">
                      <span>Proponent</span>
                      <span>{item.proponent}</span>
                      <span className="admin-muted">{item.proponentRole}</span>
                    </div>
                  </td>
                  <td>
                    <div className="admin-progress" style={{ width: "140px" }}>
                      <span style={{ width: `${Math.round(item.aiConfidence * 100)}%` }} />
                    </div>
                    <div className="admin-muted" style={{ fontSize: "12px" }}>
                      {Math.round(item.aiConfidence * 100)}% match
                    </div>
                  </td>
                  <td>{computeTime(item.updatedAt, item.timeSince)}</td>
                  <td>
                    <span className={item.tone ? `admin-chip ${item.tone}` : "admin-chip"}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state">No items in the final approval queue.</div>
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state">Loading queue…</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-surface">
        <h2>Guidelines</h2>
        <div className="admin-tag-list">
          <div className="admin-card">
            <div className="admin-row" style={{ gap: "8px" }}>
              <CheckCircle size={18} color="#16a34a" />
              <strong>Approve when tone, accuracy, and policy all align.</strong>
            </div>
            <p className="admin-muted" style={{ marginTop: "6px" }}>
              Double-check that any monetary amounts and deadlines match the
              attached documents before sending.
            </p>
          </div>
          <div className="admin-card">
            <div className="admin-row" style={{ gap: "8px" }}>
              <RefreshCcw size={18} color="#1d4ed8" />
              <strong>Return to proponent with actionable feedback.</strong>
            </div>
            <p className="admin-muted" style={{ marginTop: "6px" }}>
              Summarize what needs to change (tone, phrasing, missing details)
              so responses are revised quickly.
            </p>
          </div>
          <div className="admin-card">
            <div className="admin-row" style={{ gap: "8px" }}>
              <XCircle size={18} color="#b91c1c" />
              <strong>Reject only when necessary.</strong>
            </div>
            <p className="admin-muted" style={{ marginTop: "6px" }}>
              Rejections should be reserved for policy breaches or sensitive
              cases that require offline handling.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
