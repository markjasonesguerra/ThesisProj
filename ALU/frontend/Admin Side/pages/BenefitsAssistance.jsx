import { useEffect, useState } from "react";
import "../styles/admin-base.css";
import api from "../api/admin";

const kanbanGroups = [
  { key: "submitted", label: "Submitted", tone: "is-orange" },
  { key: "under_review", label: "Under review", tone: "is-blue" },
  { key: "approved", label: "Approved", tone: "is-green" },
];

export default function BenefitsAssistance() {
  const [programs, setPrograms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [progRes, reqRes] = await Promise.all([api.listBenefitPrograms(), api.listBenefitRequests({ pageSize: 100 })]);
        if (!mounted) return;
  setPrograms(progRes.data.programs || progRes.data || []);
  setRequests(reqRes.data.results || reqRes.data || []);
      } catch (err) {
        console.error('Unable to load benefits data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const metrics = [
    { id: "programs", label: "Benefit programs", value: programs.length, tone: "is-blue" },
    { id: "requests", label: "Open requests", value: requests.length, tone: "is-orange" },
    { id: "approved", label: "Approved requests", value: requests.filter(r => r.status === 'approved').length },
    { id: "pending", label: "Pending review", value: requests.filter(r => r.status === 'under_review' || r.status === 'submitted').length },
  ];

  const grouped = kanbanGroups.map((group) => ({
    ...group,
    items: requests.filter((t) => t.status === group.key).slice(0, 6),
  }));

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>Benefits Assistance</h1>
          <p className="admin-muted">Monitor and triage incoming benefits requests.</p>
        </div>
        <span className="admin-pill">Data snapshot: live</span>
      </header>

      <section className="admin-card-grid cols-4">
        {metrics.map((metric) => (
          <article key={metric.id} className="admin-card">
            <div className="admin-card__label">{metric.label}</div>
            <div className="admin-card__value">{loading ? '—' : metric.value}</div>
            {metric.tone ? <span className={`admin-chip ${metric.tone}`.trim()}>Live</span> : null}
          </article>
        ))}
      </section>

      <section className="admin-surface admin-stack-md">
        <h2>Queue overview</h2>
        <div className="admin-kanban">
          {grouped.map((column) => (
            <div key={column.key} className="admin-kanban__column">
              <h3>
                {column.label}
                <span className={`admin-chip ${column.tone}`.trim()}>{column.items.length}</span>
              </h3>
              {column.items.map((ticket) => (
                <div key={ticket.id} className="admin-kanban__card">
                  <div className="admin-kanban__meta">{ticket.id}</div>
                  <strong>{ticket.program?.title ?? ticket.programTitle ?? `Request ${ticket.id}`}</strong>
                  <p className="admin-muted">{ticket.user?.name ?? ticket.userEmail}</p>
                </div>
              ))}
              {!column.items.length ? (
                <div className="admin-empty-state"><p>No requests in this state</p></div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <h2>Latest submissions</h2>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Member</th>
                <th>Program</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : requests.slice(0, 12)).map((r) => (
                <tr key={r.id}>
                  <td className="admin-proponent__mono">{r.id}</td>
                  <td>{r.user?.name ?? r.userEmail}</td>
                  <td>{r.program?.title ?? r.programTitle}</td>
                  <td><span className="admin-chip is-blue">{r.status}</span></td>
                  <td>{r.amountRequested ?? r.amount_requested ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
