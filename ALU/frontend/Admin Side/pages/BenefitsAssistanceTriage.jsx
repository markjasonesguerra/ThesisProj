import { useEffect, useState } from "react";
import "../styles/admin-base.css";
import api from "../api/admin";
import ProponentCard from "../components/ai/ProponentCard";

export default function BenefitsAssistanceTriage() {
  const [backlog, setBacklog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // fetch requests that are submitted or flagged for review
        const res = await api.listBenefitRequests({ pageSize: 100 });
        if (!mounted) return;
        const items = res.data.results || res.data || [];
        const needs = items.filter((t) => t.status === 'submitted' || t.status === 'under_review');
        setBacklog(needs);
      } catch (err) {
        console.error('Unable to load triage backlog', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>Benefits Triage</h1>
          <p className="admin-muted">
            Tickets that require manual routing and review.
          </p>
        </div>
        <span className="admin-pill is-orange">Manual review queue</span>
      </header>

      <section className="admin-surface admin-stack-md">
        <h2>Tickets requiring manual assignment</h2>
        <div className="admin-stack">
          {loading ? <div className="admin-empty-state"><p>Loading…</p></div> : null}
          {backlog.map((ticket) => (
            <div key={ticket.id} className="admin-benefits-triage">
              <div className="admin-benefits-triage__info">
                <span className="admin-chip is-blue">{ticket.id}</span>
                <strong>{ticket.program?.title ?? ticket.programTitle ?? `Request ${ticket.id}`}</strong>
                <p className="admin-muted">{ticket.justification}</p>
                <div className="admin-inline-list">
                  {/* no AI entities available in DB schema by default */}
                </div>
              </div>
              <ProponentCard
                proponent={{ id: 'needs-review', name: 'Needs Assignment', role: 'Queue Review', department: 'Admin' }}
                ticketId={ticket.id}
                memberPseudonym={ticket.user?.name ?? ticket.userEmail}
                suggestedResponse={ticket.justification}
                dueDate={ticket.submittedAt || ticket.submitted_at}
                status={ticket.status}
                confidence={0}
              />
            </div>
          ))}
          {!backlog.length && !loading ? (
            <div className="admin-empty-state"><p>All benefits tickets have been routed. Check back later.</p></div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
