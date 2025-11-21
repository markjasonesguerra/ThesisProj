import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Bell,
  Save,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  X,
  Gauge,
  Rocket,
  TrendingUp,
} from "lucide-react";
import "../styles/admin-base.css";

import client from "../../src/api/client";
import ConfidenceBar from "../components/ai/ConfidenceBar";

const ADMIN_STATUS_OPTIONS = ["active", "invited", "suspended", "disabled"];

const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

const LOGIN_ATTEMPT_OPTIONS = [
  { value: 3, label: "3 attempts" },
  { value: 5, label: "5 attempts" },
  { value: 8, label: "8 attempts" },
  { value: 10, label: "10 attempts" },
];

const buildSecurityDefaults = () => ({
  requireTwoFactor: true,
  sessionTimeoutMinutes: 30,
  loginAttemptLimit: 5,
  auditLoggingEnabled: true,
});

const normalizeSecurityControls = (payload = {}) => {
  const defaults = buildSecurityDefaults();
  const parsedTimeout = Number(payload.sessionTimeoutMinutes);
  const parsedAttempts = Number(payload.loginAttemptLimit);
  return {
    requireTwoFactor: payload.requireTwoFactor !== undefined
      ? Boolean(payload.requireTwoFactor)
      : defaults.requireTwoFactor,
    sessionTimeoutMinutes: Number.isFinite(parsedTimeout) && parsedTimeout > 0
      ? parsedTimeout
      : defaults.sessionTimeoutMinutes,
    loginAttemptLimit: Number.isFinite(parsedAttempts) && parsedAttempts > 0
      ? parsedAttempts
      : defaults.loginAttemptLimit,
    auditLoggingEnabled: payload.auditLoggingEnabled !== undefined
      ? Boolean(payload.auditLoggingEnabled)
      : defaults.auditLoggingEnabled,
  };
};

const buildAdminFormDefaults = () => ({
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  status: "invited",
  roles: [],
});

const buildAiAutomationDefaults = () => ({
  autoAssign: true,
  autoResolve: false,
  auditLogging: true,
  suggestionDiff: true,
});

const buildAiMetricsDefaults = () => ({
  autoAssignRate: 0,
  avgConfidence: 0,
  overrideRate: 0,
});

const buildAiRolloutDefaults = () => [];

const normalizeAutomationControls = (controls = {}) => {
  const defaults = buildAiAutomationDefaults();
  return {
    autoAssign: controls.autoAssign !== undefined ? Boolean(controls.autoAssign) : defaults.autoAssign,
    autoResolve: controls.autoResolve !== undefined ? Boolean(controls.autoResolve) : defaults.autoResolve,
    auditLogging: controls.auditLogging !== undefined ? Boolean(controls.auditLogging) : defaults.auditLogging,
    suggestionDiff: controls.suggestionDiff !== undefined ? Boolean(controls.suggestionDiff) : defaults.suggestionDiff,
  };
};

const normalizeMetrics = (metrics = {}) => {
  const defaults = buildAiMetricsDefaults();
  const coercePercent = (value, fallback) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed);
    }
    return fallback;
  };
  const coerceRatio = (value, fallback) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, 0), 1);
    }
    return fallback;
  };
  return {
    autoAssignRate: coercePercent(metrics.autoAssignRate, defaults.autoAssignRate),
    avgConfidence: coerceRatio(metrics.avgConfidence, defaults.avgConfidence),
    overrideRate: coercePercent(metrics.overrideRate, defaults.overrideRate),
  };
};

const normalizeRollouts = (rollouts = []) => {
  if (!Array.isArray(rollouts)) {
    return buildAiRolloutDefaults();
  }
  return rollouts.map((entry, index) => {
    const coverageRaw = Number(entry?.coverage);
    const coverage = Number.isFinite(coverageRaw)
      ? Math.min(Math.max(coverageRaw > 1 ? coverageRaw / 100 : coverageRaw, 0), 1)
      : 0;
    return {
      id: entry?.id ?? `model-${index}`,
      name: entry?.name ?? "Untitled model",
      capabilities: Array.isArray(entry?.capabilities) ? entry.capabilities : [],
      coverage,
      lastUpdate: entry?.lastUpdate ?? "",
    };
  });
};

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("user-management");
  const [systemSettings, setSystemSettings] = useState({});
  const [roles, setRoles] = useState([]);
  const [notifications, setNotifications] = useState({});
  const [securityControls, setSecurityControls] = useState(buildSecurityDefaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminStats, setAdminStats] = useState({ total: 0, active: 0, restricted: 0 });
  const [adminError, setAdminError] = useState(null);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState("create");
  const [adminModalSaving, setAdminModalSaving] = useState(false);
  const [adminModalError, setAdminModalError] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminForm, setAdminForm] = useState(buildAdminFormDefaults);
  const [pendingActionId, setPendingActionId] = useState(null);

  const [aiAutomation, setAiAutomation] = useState(buildAiAutomationDefaults);
  const [aiModelRollouts, setAiModelRollouts] = useState(buildAiRolloutDefaults);
  const [aiMetrics, setAiMetrics] = useState(buildAiMetricsDefaults);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState(null);
  const [aiDirty, setAiDirty] = useState(false);

  const applyAdminPayload = (payload) => {
    const admins = payload?.admins ?? [];
    const meta = payload?.meta ?? {};
    setAdminUsers(admins);
    setAdminStats({
      total: Number(meta.total ?? admins.length ?? 0),
      active: Number(meta.active ?? 0),
      restricted: Number(meta.restricted ?? 0),
    });
  };

  const applyAiSettingsPayload = (settings) => {
    setAiAutomation(normalizeAutomationControls(settings?.automationControls));
    setAiMetrics(normalizeMetrics(settings?.metrics));
    setAiModelRollouts(normalizeRollouts(settings?.modelRollouts));
    setAiDirty(false);
    setAiSuccessMessage(null);
  };

  const loadAdminUsers = async () => {
    try {
      setAdminsLoading(true);
      setAdminError(null);
      const response = await client.get("/api/admin/settings/admin-users");
      applyAdminPayload(response.data ?? {});
    } catch (err) {
      setAdminError(err?.response?.data?.message ?? "Unable to load admin users");
    } finally {
      setAdminsLoading(false);
    }
  };

  const loadAiSettings = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      setAiSuccessMessage(null);
      const response = await client.get("/api/admin/ai/settings");
      applyAiSettingsPayload(response.data?.settings ?? {});
    } catch (err) {
      setAiError(err?.response?.data?.message ?? "Unable to load AI settings");
      setAiAutomation(buildAiAutomationDefaults());
      setAiModelRollouts(buildAiRolloutDefaults());
      setAiMetrics(buildAiMetricsDefaults());
      setAiDirty(false);
    } finally {
      setAiLoading(false);
    }
  };

  const openCreateAdminModal = () => {
    setSelectedAdmin(null);
    setAdminModalMode("create");
    setAdminForm(buildAdminFormDefaults());
    setAdminModalError(null);
    setAdminModalOpen(true);
  };

  const openEditAdminModal = (admin) => {
    setSelectedAdmin(admin);
    setAdminModalMode("edit");
    setAdminModalError(null);
    setAdminForm({
      email: admin.email ?? "",
      firstName: admin.firstName ?? "",
      lastName: admin.lastName ?? "",
      password: "",
      status: admin.status ?? "active",
      roles: Array.isArray(admin.roleIds)
        ? admin.roleIds.map((roleId) => Number(roleId)).filter((value) => Number.isFinite(value))
        : (Array.isArray(admin.roles) ? admin.roles : []).map((role) => Number(role?.id ?? role)).filter((value) => Number.isFinite(value)),
    });
    setAdminModalOpen(true);
  };

  const closeAdminModal = () => {
    setAdminModalOpen(false);
    setSelectedAdmin(null);
    setAdminModalError(null);
    setAdminModalSaving(false);
    setAdminForm(buildAdminFormDefaults());
  };

  const updateAdminForm = (field, value) => {
    setAdminForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRoleSelection = (roleId) => {
    const normalized = Number(roleId);
    if (!Number.isFinite(normalized)) {
      return;
    }
    setAdminForm((prev) => {
      const nextRoles = new Set(prev.roles ?? []);
      if (nextRoles.has(normalized)) {
        nextRoles.delete(normalized);
      } else {
        nextRoles.add(normalized);
      }
      return { ...prev, roles: Array.from(nextRoles) };
    });
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  };

  const resolveStatusTone = (status) => {
    switch (status) {
      case "active":
        return "is-green";
      case "invited":
        return "is-blue";
      case "suspended":
        return "is-orange";
      case "disabled":
        return "is-red";
      default:
        return "";
    }
  };

  const handleAdminSubmit = async (event) => {
    event?.preventDefault();
    setAdminModalError(null);

    if (!adminForm.email.trim()) {
      setAdminModalError("Email is required.");
      return;
    }

    if (!adminForm.firstName.trim() || !adminForm.lastName.trim()) {
      setAdminModalError("First name and last name are required.");
      return;
    }

    if (adminModalMode === "create" && (!adminForm.password || adminForm.password.length < 8)) {
      setAdminModalError("Password must be at least 8 characters long.");
      return;
    }

    const payload = {
      email: adminForm.email.trim().toLowerCase(),
      firstName: adminForm.firstName.trim(),
      lastName: adminForm.lastName.trim(),
      status: adminForm.status,
      roles: (adminForm.roles ?? []).map((roleId) => Number(roleId)).filter((value) => Number.isFinite(value)),
    };

    setAdminModalSaving(true);

    try {
      if (adminModalMode === "create") {
        await client.post("/api/admin/settings/admin-users", {
          ...payload,
          password: adminForm.password,
        });
      } else if (selectedAdmin?.id) {
        await client.put(`/api/admin/settings/admin-users/${selectedAdmin.id}`, payload);
      }

      await loadAdminUsers();
      closeAdminModal();
    } catch (err) {
      setAdminModalError(
        err?.response?.data?.message
          ?? `Unable to ${adminModalMode === "create" ? "create" : "update"} admin user`,
      );
    } finally {
      setAdminModalSaving(false);
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!admin?.id) {
      return;
    }

    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(`Delete admin ${admin.email}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      setPendingActionId(admin.id);
      setAdminError(null);
      await client.delete(`/api/admin/settings/admin-users/${admin.id}`);
      await loadAdminUsers();
    } catch (err) {
      setAdminError(err?.response?.data?.message ?? "Unable to delete admin user");
    } finally {
      setPendingActionId(null);
    }
  };
  useEffect(() => {
    let subscribed = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setAiLoading(true);
        setAiError(null);
        setAiSuccessMessage(null);
        const [systemResponse, rolesResponse, adminsResponse, aiResponse] = await Promise.all([
          client.get("/api/admin/settings/system"),
          client.get("/api/admin/settings/roles"),
          client.get("/api/admin/settings/admin-users"),
          client.get("/api/admin/ai/settings"),
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
        setSecurityControls(normalizeSecurityControls(settingsPayload.securityControls));
        setRoles(rolesResponse.data?.roles ?? []);
        applyAdminPayload(adminsResponse.data ?? {});
        applyAiSettingsPayload(aiResponse.data?.settings ?? {});
        setAdminError(null);
        setAiError(null);
        setDirty(false);
        setAiDirty(false);
      } catch (err) {
        if (!subscribed) {
          return;
        }
        setError(err?.response?.data?.message ?? "Unable to load admin settings");
        setSystemSettings({});
        setRoles([]);
        setAdminUsers([]);
        setAdminStats({ total: 0, active: 0, restricted: 0 });
        setAdminError(err?.response?.data?.message ?? "Unable to load admin users");
        setSecurityControls(buildSecurityDefaults());
        setNotifications({});
        setAiError(err?.response?.data?.message ?? "Unable to load AI settings");
        setAiAutomation(buildAiAutomationDefaults());
        setAiModelRollouts(buildAiRolloutDefaults());
        setAiMetrics(buildAiMetricsDefaults());
        setAiDirty(false);
      } finally {
        if (subscribed) {
          setLoading(false);
          setAiLoading(false);
          setAdminsLoading(false);
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

  const toggleSecurityFlag = (key) => {
    setSecurityControls((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setDirty(true);
      return next;
    });
  };

  const updateSecurityControl = (key, value) => {
    setSecurityControls((prev) => {
      if (prev[key] === value) {
        return prev;
      }
      setDirty(true);
      return { ...prev, [key]: value };
    });
  };

  const toggleAiAutomation = (key) => {
    setAiAutomation((prev) => {
      if (!(key in prev)) {
        return prev;
      }
      const next = { ...prev, [key]: !prev[key] };
      setAiDirty(true);
      setAiSuccessMessage(null);
      return next;
    });
  };

  const handleAiPublish = async () => {
    try {
      setAiSaving(true);
      setAiError(null);
      setAiSuccessMessage(null);
      await client.put("/api/admin/ai/settings", {
        settings: {
          automationControls: aiAutomation,
        },
      });
      setAiDirty(false);
      setAiSuccessMessage("AI settings published");
    } catch (err) {
      setAiError(err?.response?.data?.message ?? "Unable to publish AI settings");
    } finally {
      setAiSaving(false);
    }
  };

  const handleAiSyncModels = async () => {
    await loadAiSettings();
  };

  const aiCoverageAverage = useMemo(() => {
    if (!aiModelRollouts.length) {
      return 0;
    }
    const total = aiModelRollouts.reduce(
      (accumulator, rollout) => accumulator + (Number(rollout.coverage ?? 0) || 0),
      0,
    );
    return total / aiModelRollouts.length;
  }, [aiModelRollouts]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      await client.put("/api/admin/settings/system", {
        settings: {
          notificationSettings: notifications,
          securityControls,
        },
      });
      setDirty(false);
      setSuccessMessage("Settings saved");
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
    setAiLoading(true);
    setAiError(null);
    setAiSuccessMessage(null);
    try {
      const [systemResponse, rolesResponse, adminsResponse, aiResponse] = await Promise.all([
        client.get("/api/admin/settings/system"),
        client.get("/api/admin/settings/roles"),
        client.get("/api/admin/settings/admin-users"),
        client.get("/api/admin/ai/settings"),
      ]);
      const settingsPayload = systemResponse.data?.settings ?? {};
      setSystemSettings(settingsPayload);
      const notificationPayload = settingsPayload.notificationSettings ?? {};
      setNotifications({
        dailyDigest: Boolean(notificationPayload.dailyDigest),
        aiSummary: Boolean(notificationPayload.aiSummary),
        escalationSms: Boolean(notificationPayload.escalationSms),
      });
      setSecurityControls(normalizeSecurityControls(settingsPayload.securityControls));
      setRoles(rolesResponse.data?.roles ?? []);
      applyAdminPayload(adminsResponse.data ?? {});
      applyAiSettingsPayload(aiResponse.data?.settings ?? {});
      setAdminError(null);
      setAiError(null);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to refresh settings");
      setAdminError(err?.response?.data?.message ?? "Unable to load admin users");
      setSecurityControls(buildSecurityDefaults());
      setAiError(err?.response?.data?.message ?? "Unable to load AI settings");
      setAiAutomation(buildAiAutomationDefaults());
      setAiModelRollouts(buildAiRolloutDefaults());
      setAiMetrics(buildAiMetricsDefaults());
      setAiDirty(false);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="admin-page admin-stack-lg">
        <header className="admin-row">
          <div>
            <h1>Admin Settings</h1>
            <p className="admin-muted">
              Manage platform-wide defaults, escalation policies, and security controls to keep the admin experience consistent.
            </p>
          </div>
          <div className="admin-row" style={{ gap: "8px" }}>
            {activeTab === "user-management" ? (
              <>
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
              </>
            ) : null}
            {activeTab === "ai-settings" ? (
              <>
                <button
                  type="button"
                  className="admin-button"
                  onClick={handleAiSyncModels}
                  disabled={aiLoading || aiSaving}
                >
                  {aiLoading ? <Loader2 size={16} /> : <RefreshCw size={16} />}
                  Sync Models
                </button>
                <button
                  type="button"
                  className="admin-button is-primary"
                  onClick={handleAiPublish}
                  disabled={aiSaving || aiLoading || !aiDirty}
                >
                  {aiSaving ? <Loader2 size={16} /> : <Shield size={16} />}
                  {aiSaving ? "Publishing" : "Publish Updates"}
                </button>
              </>
            ) : null}
          </div>
        </header>

        {activeTab === "user-management" && error ? (
          <div className="admin-alert is-error">{error}</div>
        ) : null}
        {activeTab === "user-management" && successMessage ? (
          <div className="admin-alert is-success">{successMessage}</div>
        ) : null}
        {activeTab === "ai-settings" && aiError ? (
          <div className="admin-alert is-error">{aiError}</div>
        ) : null}
        {activeTab === "ai-settings" && aiSuccessMessage ? (
          <div className="admin-alert is-success">{aiSuccessMessage}</div>
        ) : null}

        <section className="admin-surface admin-stack-md">
          <div className="admin-tabs">
            <div className="admin-tabs__list">
              <button
                type="button"
                className={`admin-tabs__trigger ${activeTab === "user-management" ? "is-active" : ""}`.trim()}
                onClick={() => setActiveTab("user-management")}
              >
                User Management
              </button>
              <button type="button" className="admin-tabs__trigger" disabled>Companies</button>
              <button type="button" className="admin-tabs__trigger" disabled>Unions</button>
              <button
                type="button"
                className={`admin-tabs__trigger ${activeTab === "ai-settings" ? "is-active" : ""}`.trim()}
                onClick={() => setActiveTab("ai-settings")}
              >
                AI Settings
              </button>
              <button type="button" className="admin-tabs__trigger" disabled>System Config</button>
              <button type="button" className="admin-tabs__trigger" disabled>Templates</button>
              <button type="button" className="admin-tabs__trigger" disabled>Data &amp; Privacy</button>
            </div>
          </div>

          {activeTab === "user-management" ? (
            <>
              <div className="admin-row">
                <div>
                  <h2>Administrator Accounts</h2>
                  <p className="admin-muted">
                    Manage system administrators, passwords, and their role assignments.
                  </p>
                </div>
                <div className="admin-row" style={{ gap: "8px" }}>
                  <button
                    type="button"
                    className="admin-button is-primary"
                    onClick={openCreateAdminModal}
                  >
                    <Plus size={16} /> Add New Admin
                  </button>
                </div>
              </div>
              <div className="admin-card-grid cols-3">
                <article className="admin-card">
                  <div className="admin-card__label">Total Admins</div>
                  <div className="admin-card__value">{adminStats.total}</div>
                  <div className="admin-card__meta">Includes invited and active accounts</div>
                </article>
                <article className="admin-card">
                  <div className="admin-card__label">Active</div>
                  <div className="admin-card__value">{adminStats.active}</div>
                  <div className="admin-card__meta">Currently able to access the console</div>
                </article>
                <article className="admin-card">
                  <div className="admin-card__label">Restricted</div>
                  <div className="admin-card__value">{adminStats.restricted}</div>
                  <div className="admin-card__meta">Suspended or disabled accounts</div>
                </article>
              </div>
              {adminError ? <div className="admin-alert is-error">{adminError}</div> : null}
              <div className="admin-scroll">
                <table className="admin-table admin-table--condensed">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Created</th>
                      <th style={{ width: "260px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((admin) => {
                      const fullName = admin.fullName || [admin.firstName, admin.lastName].filter(Boolean).join(" ").trim();
                      const rolesList = Array.isArray(admin.roles) && admin.roles.length
                        ? admin.roles
                        : [];
                      return (
                        <tr key={admin.id}>
                          <td>
                            <div className="admin-stack">
                              <strong>{fullName || "—"}</strong>
                              <span className="admin-muted" style={{ fontSize: "12px" }}>{admin.email}</span>
                            </div>
                          </td>
                          <td>{admin.email}</td>
                          <td>
                            {rolesList.length ? (
                              <div className="admin-inline-list">
                                {rolesList.map((roleName) => (
                                  <span key={roleName} className="admin-chip">{roleName}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="admin-muted">Unassigned</span>
                            )}
                          </td>
                          <td>
                            <span className={`admin-chip ${resolveStatusTone(admin.status)}`.trim()}>
                              {admin.status ?? "unknown"}
                            </span>
                          </td>
                          <td>{formatDateTime(admin.lastLoginAt)}</td>
                          <td>{formatDateTime(admin.createdAt)}</td>
                          <td>
                            <div className="admin-table__actions">
                              <button
                                type="button"
                                className="admin-action-button"
                                onClick={() => openEditAdminModal(admin)}
                                disabled={Boolean(pendingActionId)}
                              >
                                <Edit size={16} /> Edit &amp; Permissions
                              </button>
                              <button
                                type="button"
                                className="admin-action-button is-subtle"
                                onClick={() => handleDeleteAdmin(admin)}
                                disabled={pendingActionId === admin.id}
                              >
                                {pendingActionId === admin.id ? <Loader2 size={16} /> : <Trash2 size={16} />}
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {adminsLoading ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="admin-empty">Loading administrators…</div>
                        </td>
                      </tr>
                    ) : null}
                    {!adminsLoading && adminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="admin-empty">No administrator accounts found.</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div>
              <h2>AI Assistance Settings</h2>
              <p className="admin-muted">
                Configure automation coverage, guardrails, and rollout visibility for AI copilots used across internal workflows.
              </p>
            </div>
          )}
        </section>

        {activeTab === "user-management" ? (
          <>
            <section className="admin-surface admin-stack-md">
              <header className="admin-row">
                <div className="admin-heading-inline">
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
              <header className="admin-row">
                <div className="admin-heading-inline">
                  <Shield size={18} />
                  <div>
                    <h2>Security Settings</h2>
                    <p className="admin-muted">
                      Configure safeguards that apply to every administrator account.
                    </p>
                  </div>
                </div>
              </header>

              <div className="admin-setting-list">
                <div className="admin-setting-item">
                  <div>
                    <strong>Two-Factor Authentication</strong>
                    <p className="admin-muted">Require 2FA for all admin accounts.</p>
                  </div>
                  <button
                    type="button"
                    className={`admin-toggle ${securityControls.requireTwoFactor ? "active" : ""}`.trim()}
                    onClick={() => toggleSecurityFlag("requireTwoFactor")}
                    disabled={loading || saving}
                  >
                    <span />
                  </button>
                </div>

                <div className="admin-setting-item">
                  <div>
                    <strong>Session Timeout</strong>
                    <p className="admin-muted">Auto-logout after admin inactivity.</p>
                  </div>
                  <div className="admin-select">
                    <select
                      aria-label="Session timeout"
                      value={securityControls.sessionTimeoutMinutes}
                      onChange={(event) => updateSecurityControl("sessionTimeoutMinutes", Number(event.target.value))}
                      disabled={loading || saving}
                    >
                      {SESSION_TIMEOUT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-setting-item">
                  <div>
                    <strong>Login Attempt Limit</strong>
                    <p className="admin-muted">Lock an account after repeated failures.</p>
                  </div>
                  <div className="admin-select">
                    <select
                      aria-label="Login attempt limit"
                      value={securityControls.loginAttemptLimit}
                      onChange={(event) => updateSecurityControl("loginAttemptLimit", Number(event.target.value))}
                      disabled={loading || saving}
                    >
                      {LOGIN_ATTEMPT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-setting-item">
                  <div>
                    <strong>Audit Logging</strong>
                    <p className="admin-muted">Track sensitive changes for compliance.</p>
                  </div>
                  <button
                    type="button"
                    className={`admin-toggle ${securityControls.auditLoggingEnabled ? "active" : ""}`.trim()}
                    onClick={() => toggleSecurityFlag("auditLoggingEnabled")}
                    disabled={loading || saving}
                  >
                    <span />
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "ai-settings" ? (
          <>
            <section className="admin-stack-md">
              <div className="admin-heading-inline">
                <TrendingUp size={18} />
                <div>
                  <h2>AI assistance metrics</h2>
                  <p className="admin-muted">
                    Monitor how automation performs before updating access for the wider admin team.
                  </p>
                </div>
              </div>
              <div className="admin-card-grid cols-3">
                <article className="admin-card">
                  <div className="admin-card__label">Auto assignment rate</div>
                  <div className="admin-card__value">{aiMetrics.autoAssignRate}%</div>
                  <div className="admin-card__meta">Tickets routed without manual touch</div>
                </article>
                <article className="admin-card">
                  <div className="admin-card__label">Average confidence</div>
                  <ConfidenceBar confidence={aiMetrics.avgConfidence} />
                  <div className="admin-card__meta">Across last 30 days of AI decisions</div>
                </article>
                <article className="admin-card">
                  <div className="admin-card__label">Override rate</div>
                  <div className="admin-card__value">{aiMetrics.overrideRate}%</div>
                  <div className="admin-card__meta">Lower is better; training feeds adjust daily</div>
                </article>
              </div>
            </section>

            <section className="admin-surface admin-stack-md">
              <header className="admin-row">
                <div className="admin-heading-inline">
                  <Gauge size={18} />
                  <div>
                    <h2>Automation controls</h2>
                    <p className="admin-muted">
                      Toggle which AI features are active for admins and which require manual review.
                    </p>
                  </div>
                </div>
              </header>

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
                    className={`admin-toggle ${aiAutomation.autoAssign ? "active" : ""}`.trim()}
                    onClick={() => toggleAiAutomation("autoAssign")}
                    disabled={loading || saving || aiLoading || aiSaving}
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
                    className={`admin-toggle ${aiAutomation.autoResolve ? "active" : ""}`.trim()}
                    onClick={() => toggleAiAutomation("autoResolve")}
                    disabled={loading || saving || aiLoading || aiSaving}
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
                    className={`admin-toggle ${aiAutomation.auditLogging ? "active" : ""}`.trim()}
                    onClick={() => toggleAiAutomation("auditLogging")}
                    disabled={loading || saving || aiLoading || aiSaving}
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
                    className={`admin-toggle ${aiAutomation.suggestionDiff ? "active" : ""}`.trim()}
                    onClick={() => toggleAiAutomation("suggestionDiff")}
                    disabled={loading || saving || aiLoading || aiSaving}
                  >
                    <span />
                  </button>
                </label>
              </div>
            </section>

            <section className="admin-surface admin-stack-md">
              <header className="admin-row">
                <div className="admin-heading-inline">
                  <Rocket size={18} />
                  <div>
                    <h2>Model rollout coverage</h2>
                    <p className="admin-muted">
                      Track which copilots are live across departments and plan the next enablements.
                    </p>
                  </div>
                </div>
              </header>

              <div className="admin-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Capabilities</th>
                      <th>Coverage</th>
                      <th>Last update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiLoading && !aiModelRollouts.length ? (
                      <tr>
                        <td colSpan={4}>
                          <div className="admin-empty">Loading model rollout coverage…</div>
                        </td>
                      </tr>
                    ) : null}
                    {!aiLoading && !aiModelRollouts.length ? (
                      <tr>
                        <td colSpan={4}>
                          <div className="admin-empty">No model rollout data available.</div>
                        </td>
                      </tr>
                    ) : null}
                    {aiModelRollouts.map((model) => {
                      const capabilityList = model.capabilities ?? [];
                      const coverage = Number(model.coverage ?? 0);
                      return (
                        <tr key={model.id}>
                          <td>{model.name}</td>
                          <td>
                            <div className="admin-inline-list">
                              {capabilityList.map((capability) => (
                                <span key={`${model.id}-${capability}`} className="admin-chip">
                                  {capability}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <ConfidenceBar confidence={coverage} showNumeric model={model.name} />
                          </td>
                          <td>{model.lastUpdate ? formatDateTime(model.lastUpdate) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="admin-metric">
                <span>Average coverage</span>
                <strong>{Math.round(aiCoverageAverage * 100)}%</strong>
              </div>
            </section>
          </>
        ) : null}

      </div>

      {adminModalOpen ? (
          <div className="admin-dialog" role="dialog" aria-modal="true">
            <div
              className="admin-dialog__backdrop"
              onClick={adminModalSaving ? undefined : closeAdminModal}
              role="presentation"
            />
            <div className="admin-dialog__panel">
              <div className="admin-dialog__header">
                <h3>
                  {adminModalMode === "create"
                    ? "Add New Admin"
                    : `Edit Admin: ${selectedAdmin?.fullName ?? selectedAdmin?.email ?? ""}`}
                </h3>
                <button
                  type="button"
                  className="admin-icon-button"
                  onClick={closeAdminModal}
                  disabled={adminModalSaving}
                >
                  <X size={16} />
                </button>
              </div>
              <form className="admin-dialog__body" onSubmit={handleAdminSubmit}>
                <div className="admin-form-section">
                  <div className="admin-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={adminForm.email}
                      onChange={(event) => updateAdminForm("email", event.target.value)}
                      placeholder="admin@example.org"
                      required
                      disabled={adminModalSaving}
                    />
                  </div>
                  <div className="admin-field">
                    <span>First Name</span>
                    <input
                      value={adminForm.firstName}
                      onChange={(event) => updateAdminForm("firstName", event.target.value)}
                      placeholder="Given name"
                      required
                      disabled={adminModalSaving}
                    />
                  </div>
                  <div className="admin-field">
                    <span>Last Name</span>
                    <input
                      value={adminForm.lastName}
                      onChange={(event) => updateAdminForm("lastName", event.target.value)}
                      placeholder="Family name"
                      required
                      disabled={adminModalSaving}
                    />
                  </div>
                  <div className="admin-field">
                    <span>Status</span>
                    <select
                      value={adminForm.status}
                      onChange={(event) => updateAdminForm("status", event.target.value)}
                      disabled={adminModalSaving}
                    >
                      {ADMIN_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {adminModalMode === "create" ? (
                    <div className="admin-field">
                      <span>Temporary Password</span>
                      <input
                        type="password"
                        value={adminForm.password}
                        onChange={(event) => updateAdminForm("password", event.target.value)}
                        placeholder="Minimum 8 characters"
                        required
                        disabled={adminModalSaving}
                      />
                      <small>The admin will be prompted to change this password on first login.</small>
                    </div>
                  ) : (
                    <div className="admin-field">
                      <span>Password</span>
                      <input value="********" readOnly disabled />
                      <small>Use the password reset workflow to change credentials.</small>
                    </div>
                  )}
                </div>

                <div className="admin-form-section">
                  <div>
                    <strong>Role assignments</strong>
                    <p className="admin-muted" style={{ margin: 0 }}>
                      Select roles that determine which modules the admin can access.
                    </p>
                  </div>
                  {roles.length ? (
                    roles.map((role) => {
                      const isChecked = (adminForm.roles ?? []).includes(role.id);
                      return (
                        <label key={role.id} className="admin-role-option">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRoleSelection(role.id)}
                            disabled={adminModalSaving}
                          />
                          <div>
                            <strong>{role.name}</strong>
                            <small>{role.description ?? "No description provided."}</small>
                            <span className="admin-chip is-blue">{role.adminCount} assigned</span>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <span className="admin-muted">No roles available. Create roles to manage permissions.</span>
                  )}
                </div>

                {adminModalError ? <div className="admin-alert is-error">{adminModalError}</div> : null}

                <div className="admin-dialog__footer">
                  <button
                    type="button"
                    className="admin-button"
                    onClick={closeAdminModal}
                    disabled={adminModalSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-button is-primary"
                    disabled={adminModalSaving}
                  >
                    {adminModalSaving ? <Loader2 size={16} /> : <Save size={16} />}
                    {adminModalMode === "create" ? "Create Admin" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </>
    );
}
