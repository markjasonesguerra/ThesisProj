import { useEffect, useMemo, useState } from "react";
import { Check, Shield, Bell, Database, Save, Loader2, RefreshCw } from "lucide-react";
import "../styles/admin-base.css";

import client from "../../src/api/client";

export default function AdminSettings() {
  const [systemSettings, setSystemSettings] = useState({});
  const [roles, setRoles] = useState([]);
  const [notifications, setNotifications] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    let subscribed = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [systemResponse, rolesResponse] = await Promise.all([
          client.get("/api/admin/settings/system"),
          client.get("/api/admin/settings/roles"),
        ]);

        if (!subscribed) {
          return;
        }

        const settingsPayload = systemResponse.data?.settings ?? {};
        setSystemSettings(settingsPayload);
        const notificationPayload = settingsPayload.notificationSettings ?? {};
        setNotifications({
          dailyDigest: Boolean(notificationPayload.dailyDigest),
          aiSummary: Boolean(notificationPayload.aiSummary),
          escalationSms: Boolean(notificationPayload.escalationSms),
        });
        setRoles(rolesResponse.data?.roles ?? []);
        setDirty(false);
      } catch (err) {
        if (!subscribed) {
          return;
        }
        setError(err?.response?.data?.message ?? "Unable to load admin settings");
        setSystemSettings({});
        setRoles([]);
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

  const toggle = (key) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setDirty(true);
      return next;
    });
  };

  const environment = systemSettings.environment ?? {};

  const escalationLevels = useMemo(() => {
    const matrix = systemSettings.escalationMatrix;
    if (Array.isArray(matrix)) {
      return matrix.map((entry, index) => ({
        id: entry.id ?? `matrix-${index}`,
        name: entry.name ?? "Level",
        owner: entry.owner ?? "Unassigned",
        response: entry.response ?? "",
        fallback: entry.fallback ?? "",
      }));
    }
    return [];
  }, [systemSettings.escalationMatrix]);

  const roleCards = useMemo(() => roles.slice(0, 3), [roles]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      await client.put("/api/admin/settings/system", {
        settings: {
          notificationSettings: notifications,
        },
      });
      setDirty(false);
      setSuccessMessage("Notification settings saved");
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setDirty(false);
    setSuccessMessage(null);
    setError(null);
    setLoading(true);
    try {
      const [systemResponse, rolesResponse] = await Promise.all([
        client.get("/api/admin/settings/system"),
        client.get("/api/admin/settings/roles"),
      ]);
      const settingsPayload = systemResponse.data?.settings ?? {};
      setSystemSettings(settingsPayload);
      const notificationPayload = settingsPayload.notificationSettings ?? {};
      setNotifications({
        dailyDigest: Boolean(notificationPayload.dailyDigest),
        aiSummary: Boolean(notificationPayload.aiSummary),
        escalationSms: Boolean(notificationPayload.escalationSms),
      });
      setRoles(rolesResponse.data?.roles ?? []);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to refresh settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>Admin Settings</h1>
          <p className="admin-muted">
            Manage platform-wide defaults, escalation policies, and security
            controls to keep the admin experience consistent.
          </p>
        </div>
        <div className="admin-row" style={{ gap: "8px" }}>
          <button
            type="button"
            className="admin-button"
            onClick={handleRefresh}
            disabled={loading || saving}
          >
            {loading ? <Loader2 size={16} /> : <RefreshCw size={16} />}
            Refresh
          </button>
          <button
            type="button"
            className="admin-button"
            onClick={handleSave}
            disabled={saving || loading || !dirty}
          >
            {saving ? <Loader2 size={16} /> : <Save size={16} />}
            {saving ? "Saving" : "Save Changes"}
          </button>
        </div>
      </header>

      {error ? <div className="admin-alert is-error">{error}</div> : null}
      {successMessage ? <div className="admin-alert is-success">{successMessage}</div> : null}

      <section className="admin-card-grid cols-3">
        <article className="admin-card">
          <div className="admin-card__label">Environment</div>
          <div className="admin-card__value">{environment.name ?? "Unspecified"}</div>
          <div className="admin-card__meta">
            {environment.description ?? "Environment configuration"}
          </div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">Default Response SLA</div>
          <div className="admin-card__value">
            {environment.defaultResponseSlaHours
              ? `${environment.defaultResponseSlaHours}h`
              : "Not set"}
          </div>
          <div className="admin-card__meta">Applies to untagged requests</div>
        </article>
        <article className="admin-card">
          <div className="admin-card__label">AI Assist Rollout</div>
          <div className="admin-card__value">
            {environment.aiAssistRolloutPercent !== undefined
              ? `${environment.aiAssistRolloutPercent}%`
              : "0%"}
          </div>
          <div className="admin-card__meta">Admins with AI suggestions enabled</div>
        </article>
      </section>

      <section className="admin-surface admin-stack-md">
        <header className="admin-row">
          <div className="admin-row" style={{ gap: "8px" }}>
            <Bell size={18} />
            <div>
              <h2>Notifications</h2>
              <p className="admin-muted">
                Configure alerts sent to the admin team when critical events occur.
              </p>
            </div>
          </div>
        </header>
        <div className="admin-setting-list">
          <label htmlFor="dailyDigest" className="admin-setting-item">
            <div>
              <strong>Daily email digest</strong>
              <p className="admin-muted">
                Receive a morning summary of pending approvals and escalations.
              </p>
            </div>
            <button
              type="button"
              id="dailyDigest"
              className={`admin-toggle ${notifications.dailyDigest ? "active" : ""}`.trim()}
              onClick={() => toggle("dailyDigest")}
              disabled={loading || saving}
            >
              <span />
            </button>
          </label>

          <label htmlFor="aiSummary" className="admin-setting-item">
            <div>
              <strong>Include AI summary with alerts</strong>
              <p className="admin-muted">
                Attach short bullet points of AI-detected highlights when sending notifications.
              </p>
            </div>
            <button
              type="button"
              id="aiSummary"
              className={`admin-toggle ${notifications.aiSummary ? "active" : ""}`.trim()}
              onClick={() => toggle("aiSummary")}
              disabled={loading || saving}
            >
              <span />
            </button>
          </label>

          <label htmlFor="escalationSms" className="admin-setting-item">
            <div>
              <strong>Escalation SMS alerts</strong>
              <p className="admin-muted">
                Text-message the duty officer if a ticket remains unassigned after escalation.
              </p>
            </div>
            <button
              type="button"
              id="escalationSms"
              className={`admin-toggle ${notifications.escalationSms ? "active" : ""}`.trim()}
              onClick={() => toggle("escalationSms")}
              disabled={loading || saving}
            >
              <span />
            </button>
          </label>
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <div className="admin-row" style={{ gap: "8px" }}>
          <Shield size={18} />
          <div>
            <h2>Access & Role Controls</h2>
            <p className="admin-muted">
              Map personas to capabilities to simplify onboarding and audits.
            </p>
          </div>
        </div>
        <div className="admin-role-grid">
          {roleCards.length === 0 ? (
            <div className="admin-empty">No roles available.</div>
          ) : (
            roleCards.map((role) => (
              <div key={role.id} className="admin-role-card">
                <h3>{role.name}</h3>
                <ul>
                  {(Array.isArray(role.permissions) ? role.permissions : []).slice(0, 3).map((permission) => (
                    <li key={permission}>{permission}</li>
                  ))}
                </ul>
                <span className="admin-chip is-green">{role.adminCount} assigned</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <div className="admin-row" style={{ gap: "8px" }}>
          <Database size={18} />
          <div>
            <h2>Escalation Matrix</h2>
            <p className="admin-muted">
              Define who is accountable at each severity level and how quickly they must respond.
            </p>
          </div>
        </div>
        {escalationLevels.length === 0 ? (
          <div className="admin-empty">No escalation matrix configured.</div>
        ) : (
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Primary Owner</th>
                  <th>Response Time</th>
                  <th>Fallback</th>
                  <th>Confirmation</th>
                </tr>
              </thead>
              <tbody>
                {escalationLevels.map((level) => (
                  <tr key={level.id}>
                    <td>{level.name}</td>
                    <td>{level.owner}</td>
                    <td>{level.response || ""}</td>
                    <td>{level.fallback || ""}</td>
                    <td>
                      <span className="admin-chip is-green">
                        <Check size={14} /> On track
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
