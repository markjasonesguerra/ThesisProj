import { useEffect, useState } from "react";
import "../styles/admin-base.css";
import AuditRow from "../components/ai/AuditRow";
import { ShieldAlert, RefreshCw, Loader2 } from "lucide-react";

import client from "../../src/api/client";

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get("/api/admin/audit/logs", {
        params: {
          pageSize: 50,
        },
      });
      const data = response.data?.entries ?? [];
      setEntries(data.map((entry) => ({ ...entry, id: String(entry.id ?? "") })));
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to load audit logs");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>AI Audit Log</h1>
          <p className="admin-muted">
            Every automated action and manual override is captured here to meet compliance requirements.
          </p>
        </div>
        <div className="admin-row" style={{ gap: "8px" }}>
          <button
            type="button"
            className="admin-button"
            onClick={fetchEntries}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} /> : <RefreshCw size={16} />}
            Refresh
          </button>
          <span className="admin-pill">Retention: 90 days</span>
        </div>
      </header>

      <section className="admin-surface admin-stack-md">
        <header className="admin-row">
          <div style={{ minWidth: 0 }}>
            <h2 className="admin-heading-with-icon">
              <ShieldAlert size={18} aria-hidden="true" />
              <span>Recent entries</span>
            </h2>
            <p className="admin-muted">Live audit trail from automation decisions and admin overrides.</p>
          </div>
        </header>
        {error ? <div className="admin-alert is-error">{error}</div> : null}
        <div>
          {loading && entries.length === 0 ? <div className="admin-empty">Loading audit logs…</div> : null}
          {!loading && entries.length === 0 && !error ? (
            <div className="admin-empty">No audit entries available.</div>
          ) : (
            entries.map((entry) => <AuditRow key={entry.id} entry={entry} />)
          )}
        </div>
      </section>
    </div>
  );
}
