import { useEffect, useMemo, useState } from "react";
import { Gauge, Rocket, Shield, RefreshCcw, TrendingUp, Loader2 } from "lucide-react";
import "../styles/admin-base.css";
import ConfidenceBar from "../components/ai/ConfidenceBar";

import client from "../../src/api/client";

export default function AISettings() {
  const [automationControls, setAutomationControls] = useState({
    autoAssign: false,
    autoResolve: false,
    auditLogging: false,
    suggestionDiff: false,
  });
  const [modelRollouts, setModelRollouts] = useState([]);
  const [metrics, setMetrics] = useState({
    autoAssignRate: 0,
    avgConfidence: 0,
    overrideRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get("/api/admin/ai/settings");
      const settings = response.data?.settings ?? {};
      const automation = settings.automationControls ?? {};
      setAutomationControls({
        autoAssign: Boolean(automation.autoAssign),
        autoResolve: Boolean(automation.autoResolve),
        auditLogging: Boolean(automation.auditLogging),
        suggestionDiff: Boolean(automation.suggestionDiff),
      });
      setModelRollouts(Array.isArray(settings.modelRollouts) ? settings.modelRollouts : []);
      setMetrics({
        autoAssignRate: Number(settings.metrics?.autoAssignRate ?? 0),
        avgConfidence: Number(settings.metrics?.avgConfidence ?? 0),
        overrideRate: Number(settings.metrics?.overrideRate ?? 0),
      });
      setDirty(false);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to load AI settings");
      setModelRollouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const toggle = (key) => {
    setAutomationControls((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setDirty(true);
      return next;
    });
  };

  const coverageAverage = useMemo(() => {
    if (!modelRollouts.length) {
      return 0;
    }
    return modelRollouts.reduce((acc, item) => acc + Number(item.coverage ?? 0), 0) / modelRollouts.length;
  }, [modelRollouts]);

  const handleSyncModels = () => {
    fetchSettings();
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      await client.put("/api/admin/ai/settings", {
        settings: {
          automationControls,
        },
      });
      setDirty(false);
      setSuccessMessage("AI settings published");
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to publish AI settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>AI Assistance Settings</h1>
          <p className="admin-muted">
            Configure automation coverage, guardrails, and audit policies for the admin AI copilots.
          </p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button"
            onClick={handleSyncModels}
            disabled={loading || saving}
          >
            {loading ? <Loader2 size={16} /> : <RefreshCcw size={16} />}
            Sync Models
          </button>
          <button
            type="button"
            className="admin-button is-primary"
            onClick={handlePublish}
            disabled={saving || loading || !dirty}
          >
            {saving ? <Loader2 size={16} /> : <Shield size={16} />}
            {saving ? "Publishing" : "Publish Updates"}
          </button>
        </div>
      </header>

      {error ? <div className="admin-alert is-error">{error}</div> : null}
      {successMessage ? <div className="admin-alert is-success">{successMessage}</div> : null}

      <section className="admin-card-grid cols-3">
        <article className="admin-card">
          <div className="admin-card__label">Auto assignment rate</div>
          <div className="admin-row" style={{ gap: "10px" }}>
            <div className="admin-card__value">{metrics.autoAssignRate}%</div>
            <span className="admin-chip is-green">
              <TrendingUp size={14} /> +3%
            </span>
          </div>
          <div className="admin-card__meta">Tickets routed without manual touch</div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">Average confidence</div>
          <ConfidenceBar confidence={metrics.avgConfidence} />
          <div className="admin-card__meta">Across last 30 days of AI decisions</div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">Override rate</div>
          <div className="admin-card__value">{metrics.overrideRate}%</div>
          <div className="admin-card__meta">Lower is better; training feeds adjust daily</div>
        </article>
      </section>

      <section className="admin-surface admin-stack-md">
        <div className="admin-row" style={{ gap: "12px" }}>
          <Gauge size={18} />
          <div>
            <h2>Automation controls</h2>
            <p className="admin-muted">
              Toggle which AI features are active for admins and which require manual review.
            </p>
          </div>
        </div>

        <div className="admin-setting-list">
          <label className="admin-setting-item" htmlFor="autoAssign">
            <div>
              <strong>Auto assignment</strong>
              <p className="admin-muted">
                Route tickets with confidence above 0.80 directly to departments.
              </p>
            </div>
            <button
              type="button"
              id="autoAssign"
              className={`admin-toggle ${automationControls.autoAssign ? "active" : ""}`.trim()}
              onClick={() => toggle("autoAssign")}
              disabled={loading || saving}
            >
              <span />
            </button>
          </label>

          <label className="admin-setting-item" htmlFor="autoResolve">
            <div>
              <strong>Auto resolve FAQs</strong>
              <p className="admin-muted">
                Send approved responses for repetitive inquiries without agent intervention.
              </p>
            </div>
            <button
              type="button"
              id="autoResolve"
              className={`admin-toggle ${automationControls.autoResolve ? "active" : ""}`.trim()}
              onClick={() => toggle("autoResolve")}
              disabled={loading || saving}
            >
              <span />
            </button>
          </label>

          <label className="admin-setting-item" htmlFor="auditLogging">
            <div>
              <strong>Audit logging</strong>
              <p className="admin-muted">
                Require two-factor confirmation before viewing redacted source text.
              </p>
            </div>
            <button
              type="button"
              id="auditLogging"
              className={`admin-toggle ${automationControls.auditLogging ? "active" : ""}`.trim()}
              onClick={() => toggle("auditLogging")}
              disabled={loading || saving}
            >
              <span />
            </button>
          </label>

          <label className="admin-setting-item" htmlFor="suggestionDiff">
            <div>
              <strong>Show diff view</strong>
              <p className="admin-muted">
                Display AI vs proponent edits with inline highlights during approvals.
              </p>
            </div>
            <button
              type="button"
              id="suggestionDiff"
              className={`admin-toggle ${automationControls.suggestionDiff ? "active" : ""}`.trim()}
              onClick={() => toggle("suggestionDiff")}
              disabled={loading || saving}
            >
              <span />
            </button>
          </label>
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <div className="admin-row" style={{ gap: "12px" }}>
          <Rocket size={18} />
          <div>
            <h2>Model rollout coverage</h2>
            <p className="admin-muted">
              Track which copilots are live across departments and plan next enablements.
            </p>
          </div>
        </div>

      <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Capabilities</th>
                <th> coverage</th>
                <th>Last update</th>
              </tr>
            </thead>
            <tbody>
              {modelRollouts.map((model, index) => (
                <tr key={model.id}>
                  <td>{model.name}</td>
                  <td>
                    <div className="admin-inline-list">
                      {(Array.isArray(model.capabilities) ? model.capabilities : []).map((cap) => (
                        <span key={`${model.id || index}-${cap}`}>{cap}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <ConfidenceBar confidence={model.coverage} showNumeric />
                  </td>
                  <td>{model.lastUpdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-metric">
          <span>Average coverage</span>
          <strong>{Math.round(coverageAverage * 100)}%</strong>
        </div>
      </section>
    </div>
  );
}
