import { useEffect, useState } from "react";
import { BadgeCheck, Printer, Smartphone, RefreshCcw, Loader2 } from "lucide-react";
import "../styles/admin-base.css";

import client from "../../src/api/client";

const formatPercent = (value) => {
  if (value === null || value === undefined) {
    return "0%";
  }
  return `${Number(value).toFixed(1)}%`;
};

export default function IDCardManagement() {
  const [metrics, setMetrics] = useState({
    digitalActive: 0,
    physicalQueued: 0,
    replacementsToday: 0,
  });
  const [queue, setQueue] = useState([]);
  const [guides, setGuides] = useState([]);
  const [digital, setDigital] = useState({
    verificationPassRate: 0,
    walletAdoption: 0,
    badges: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get("/api/admin/id-cards/overview");
      const payload = response.data ?? {};

      setMetrics({
        digitalActive: Number(payload.metrics?.digitalActive ?? 0),
        physicalQueued: Number(payload.metrics?.physicalQueued ?? 0),
        replacementsToday: Number(payload.metrics?.replacementsToday ?? 0),
      });
      setQueue(Array.isArray(payload.queue) ? payload.queue : []);
      setGuides(Array.isArray(payload.guides) ? payload.guides : []);
      setDigital({
        verificationPassRate: Number(payload.digital?.verificationPassRate ?? 0),
        walletAdoption: Number(payload.digital?.walletAdoption ?? 0),
        badges: Array.isArray(payload.digital?.badges) ? payload.digital.badges : [],
      });
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to load ID card overview");
      setQueue([]);
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>ID Card Management</h1>
          <p className="admin-muted">
            Manage physical and digital membership IDs, including replacements and activation status.
          </p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button"
            onClick={fetchOverview}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="admin-spin" /> : <RefreshCcw size={16} />}
            {loading ? "Syncing" : "Sync with member DB"}
          </button>
        </div>
      </header>

      {error ? <div className="admin-alert is-error">{error}</div> : null}

      <section className="admin-card-grid cols-3">
        <article className="admin-card">
          <div className="admin-card__label">Digital IDs active</div>
          <div className="admin-card__value">{metrics.digitalActive.toLocaleString()}</div>
          <div className="admin-card__meta">Members using mobile wallet access</div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">Physical cards queued</div>
          <div className="admin-card__value">{metrics.physicalQueued.toLocaleString()}</div>
          <div className="admin-card__meta">In production with print vendor</div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">Replacements today</div>
          <div className="admin-card__value">{metrics.replacementsToday.toLocaleString()}</div>
          <div className="admin-card__meta">Lost card claims approved</div>
        </article>
      </section>

      <section className="admin-surface admin-stack-md">
        <div className="admin-heading-inline">
          <Printer size={18} />
          <div>
            <h2>Production queue</h2>
            <p className="admin-muted">Track progress across physical printing and digital activation.</p>
          </div>
        </div>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Member</th>
                <th>Type</th>
                <th>Status</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    {loading ? "Loading queue..." : "No ID card requests in queue."}
                  </td>
                </tr>
              ) : (
                queue.map((item) => (
                  <tr key={item.id}>
                    <td className="admin-proponent__mono">{item.requestNo}</td>
                    <td>{item.member}</td>
                    <td>{item.cardType}</td>
                    <td>
                      <span className="admin-chip is-blue">{item.status}</span>
                    </td>
                    <td>{item.requestedOn}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <h2>Guidelines</h2>
        <div className="admin-pill-group">
          {guides.length === 0 ? (
            <span className="admin-empty">No guidelines configured.</span>
          ) : (
            guides.map((guide) => (
              <span key={guide}>{guide}</span>
            ))
          )}
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <h2>Digital experience</h2>
        <div className="admin-card-grid cols-2">
          <article className="admin-card">
            <div className="admin-card__label">Verification pass rate</div>
            <div className="admin-card__value">{formatPercent(digital.verificationPassRate)}</div>
            <div className="admin-card__meta">Powered by biometric checks</div>
          </article>
          <article className="admin-card">
            <div className="admin-card__label">Mobile wallet adoption</div>
            <div className="admin-card__value">{formatPercent(digital.walletAdoption)}</div>
            <div className="admin-card__meta">Members using digital IDs weekly</div>
          </article>
        </div>
        <div className="admin-inline-list">
          {digital.badges.length ? (
            digital.badges.map((badge) => (
              <span key={badge}>
                {badge.toLowerCase().includes("verify") ? <BadgeCheck size={14} /> : <Smartphone size={14} />}
                {" "}
                {badge}
              </span>
            ))
          ) : (
            <span>
              <BadgeCheck size={14} /> Verified
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
