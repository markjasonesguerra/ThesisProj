import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Users,
  UserCheck,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import client from "../../src/api/client";
import "../styles/admin-base.css";

const badgeClassByTone = {
  "is-green": "admin-chip is-green",
  "is-blue": "admin-chip is-blue",
  "is-purple": "admin-chip is-info",
  "is-orange": "admin-chip is-orange",
  "is-red": "admin-chip is-red",
};

export default function Dashboard({ onNavigate }) {
  const [dashboardData, setDashboardData] = useState({
    kpis: [],
    quickActions: [],
    recentActivity: [],
    systemStatus: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const iconMap = useMemo(
    () => ({
      users: Users,
      "user-check": UserCheck,
      "trending-up": TrendingUp,
      "alert-triangle": AlertTriangle,
      "credit-card": CreditCard,
      "file-text": FileText,
      clock: Clock,
      "dollar-sign": DollarSign,
    }),
    [],
  );

  const navigate = (target) => {
    if (typeof onNavigate === "function") {
      onNavigate(target);
    }
  };

  useEffect(() => {
    let subscribed = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await client.get("/api/admin/dashboard");
        if (subscribed) {
          setDashboardData(response.data ?? {});
        }
      } catch (err) {
        if (subscribed) {
          setError(err?.response?.data?.message ?? "Unable to load dashboard data.");
        }
      } finally {
        if (subscribed) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);

    return () => {
      subscribed = false;
      clearInterval(intervalId);
    };
  }, []);

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "0";
    if (typeof value === "string") return value;
    return new Intl.NumberFormat("en-PH").format(value);
  };

  const computeTime = (timestamp, fallback) => {
    if (fallback) return fallback;
    if (!timestamp) return "";
    const date = new Date(timestamp);
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

  const { kpis = [], quickActions = [], recentActivity = [], systemStatus = [] } = dashboardData;

  return (
    <div className="admin-page">
      <header className="admin-row">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="admin-muted">
            Welcome to ALUzon Admin. Monitor member growth, finance health, and
            operations at a glance.
          </p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button is-primary"
            onClick={() => navigate("members")}
          >
            View All Members
          </button>
          <button
            type="button"
            className="admin-button"
            onClick={() => navigate("registration-review")}
          >
            Review Pending
          </button>
        </div>
      </header>

      {error ? (
        <section className="admin-surface">
          <div className="admin-empty-state">{error}</div>
        </section>
      ) : null}

      <section className="admin-surface">
        <div className="admin-row" style={{ alignItems: "center" }}>
          <h2>Key Metrics</h2>
          {loading ? <span className="admin-pill">Loading…</span> : null}
        </div>
        <div className="admin-card-grid cols-3">
          {kpis.map((item) => {
            const Icon = iconMap[item.icon] ?? Users;
            return (
              <article key={item.id ?? item.title} className="admin-card">
                <div className="admin-card__label">{item.title}</div>
                <div className="admin-row" style={{ gap: "12px" }}>
                  <div className="admin-card__value">{formatNumber(item.value)}</div>
                  <span className={badgeClassByTone[item.tone] || "admin-chip"}>
                    <Icon size={18} />
                  </span>
                </div>
                <div className="admin-card__meta">{item.change}</div>
              </article>
            );
          })}
          {!loading && kpis.length === 0 ? (
            <article className="admin-card" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
              <div className="admin-card__label">No data</div>
              <div className="admin-card__meta">Add members or dues entries to see insights.</div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="admin-card-grid cols-2">
        <article className="admin-surface">
          <div className="admin-row">
            <h2>Quick Actions</h2>
            <span className="admin-pill">Shortcuts</span>
          </div>
          <div className="admin-tag-list">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="admin-button"
                onClick={() => navigate(action.action)}
              >
                <div style={{ flex: 1, textAlign: "left" }}>{action.label}</div>
                {typeof action.count === "number" && (
                  <span className="admin-pill">{formatNumber(action.count)}</span>
                )}
              </button>
            ))}
            {!loading && quickActions.length === 0 ? (
              <div className="admin-empty-state">No quick actions available.</div>
            ) : null}
          </div>
        </article>

        <article className="admin-surface">
          <div className="admin-row">
            <h2>Recent Activity</h2>
            <span className="admin-pill">Latest updates</span>
          </div>
          <div className="admin-tag-list">
            {recentActivity.map((activity, index) => (
              <div
                key={`${activity.action}-${activity.createdAt ?? index}`}
                className="admin-card"
                style={{ gap: "6px" }}
              >
                <div className="admin-row" style={{ gap: "8px" }}>
                  <span
                    className={badgeClassByTone[activity.tone] || "admin-chip"}
                    style={{ fontSize: "10px" }}
                  >
                    {computeTime(activity.createdAt, activity.time)}
                  </span>
                  <strong style={{ fontSize: "14px" }}>{activity.action}</strong>
                </div>
                <p className="admin-muted" style={{ margin: 0 }}>
                  {activity.subject ?? activity.detail ?? "No additional details."}
                </p>
              </div>
            ))}
            {!loading && recentActivity.length === 0 ? (
              <div className="admin-empty-state">No recent activity yet.</div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="admin-surface">
        <div className="admin-row">
          <h2>System Status</h2>
          <span className="admin-pill">Infrastructure</span>
        </div>
        <div className="admin-tag-list">
          {systemStatus.map((status) => (
            <div key={status.label} className="admin-metric">
              <span>{status.label}</span>
              <strong>
                {formatNumber(status.value)}
                {status.unit ? status.unit : "%"}
              </strong>
            </div>
          ))}
          {!loading && systemStatus.length === 0 ? (
            <div className="admin-empty-state">Status metrics unavailable.</div>
          ) : null}
        </div>
        <p className="admin-muted" style={{ marginTop: "12px" }}>
          Status data refreshes automatically every 5 minutes.
        </p>
      </section>

      <footer className="admin-muted" style={{ textAlign: "center", fontSize: "12px" }}>
        © {new Date().getFullYear()} Associated Labor Unions – Luzon Regional.
        Empowering 19,000+ members nationwide.
      </footer>
    </div>
  );
}

Dashboard.propTypes = {
  onNavigate: PropTypes.func,
};
