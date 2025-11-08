import "../styles/admin-base.css";
import { WalletCards, BarChart3, Receipt, ArrowDownCircle } from "lucide-react";

import { useEffect, useState } from "react";
import client from "../../src/api/client";

export default function DuesFinance() {
  const [metrics, setMetrics] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [arrears, setArrears] = useState([]);
  const [guidance, setGuidance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let subscribed = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await client.get("/api/admin/dues/overview");
        if (!subscribed) return;
        setMetrics(response.data?.metrics ?? []);
        setPayroll(response.data?.payroll ?? []);
        setArrears(response.data?.arrears ?? []);
        setGuidance(response.data?.guidance ?? []);
      } catch (err) {
        if (!subscribed) return;
        setError(err?.response?.data?.message ?? "Unable to load dues and finance data.");
        setMetrics([]);
        setPayroll([]);
        setArrears([]);
      } finally {
        if (subscribed) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      subscribed = false;
    };
  }, []);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "₱0";
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(value);
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "0";
    return new Intl.NumberFormat("en-PH").format(value);
  };

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>Dues & Finance</h1>
          <p className="admin-muted">
            Track payroll deduction status, arrears, and cash flow to keep the union financially healthy.
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-button is-primary">
            <ArrowDownCircle size={16} /> Export report
          </button>
        </div>
      </header>

      <section className="admin-card-grid cols-4">
        {metrics.map((metric) => (
          <article key={metric.id} className="admin-card">
            <div className="admin-card__label">{metric.label}</div>
            <div className="admin-card__value">
              {metric.id === "members" ? formatNumber(metric.value) : formatCurrency(metric.value)}
            </div>
            {metric.tone ? <span className={`admin-chip ${metric.tone}`.trim()}>Live</span> : null}
          </article>
        ))}
        {!loading && metrics.length === 0 ? (
          <article className="admin-card" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
            <div className="admin-card__label">No finance metrics available</div>
            <div className="admin-card__meta">Add dues entries to populate this dashboard.</div>
          </article>
        ) : null}
      </section>

      <section className="admin-surface admin-stack-md">
        <div className="admin-row" style={{ gap: "10px" }}>
          <WalletCards size={18} />
          <div>
            <h2>Upcoming payroll batches</h2>
            <p className="admin-muted">
              Confirm employer remittances and follow up before they fall behind.
            </p>
          </div>
        </div>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Employer</th>
                <th>Amount</th>
                <th>Due date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((batch) => (
                <tr key={batch.id}>
                  <td className="admin-proponent__mono">{batch.id}</td>
                  <td>{batch.employer}</td>
                  <td>{formatCurrency(batch.amount)}</td>
                  <td>{batch.dueDate ? new Date(batch.dueDate).toLocaleDateString() : "—"}</td>
                  <td>
                    <span className="admin-chip is-blue">{batch.status}</span>
                  </td>
                </tr>
              ))}
              {!loading && payroll.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty-state">No pending payroll batches.</div>
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty-state">Loading payroll data…</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <div className="admin-row" style={{ gap: "10px" }}>
          <BarChart3 size={18} />
          <div>
            <h2>Arrears watchlist</h2>
            <p className="admin-muted">
              Highest-risk members automatically flagged with aging and employer context.
            </p>
          </div>
        </div>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Employer</th>
                <th>Days overdue</th>
                <th>Amount</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {arrears.map((member) => (
                <tr key={member.id}>
                  <td>{member.memberAlias ?? member.name}</td>
                  <td>{member.employer}</td>
                  <td>{member.daysOverdue} days</td>
                  <td>{formatCurrency(member.amount)}</td>
                  <td>
                    <span className="admin-chip is-orange">Send reminder</span>
                  </td>
                </tr>
              ))}
              {!loading && arrears.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty-state">No members currently overdue.</div>
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty-state">Loading arrears watchlist…</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <div className="admin-row" style={{ gap: "10px" }}>
          <Receipt size={18} />
          <div>
            <h2>Finance guidance</h2>
            <p className="admin-muted">
              Align finance ops with union policy. These guardrails help explain how data should be handled.
            </p>
          </div>
        </div>
        <div className="admin-list">
          {guidance.length
            ? guidance.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)
            : (
              <span className="admin-muted">No guidance noted yet.</span>
            )}
        </div>
      </section>

      {error ? (
        <div className="admin-empty-state">{error}</div>
      ) : null}
    </div>
  );
}
