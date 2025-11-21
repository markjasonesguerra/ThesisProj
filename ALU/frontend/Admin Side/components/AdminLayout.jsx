import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";
import TopBar from "./TopBar.jsx";
import "../styles/admin-base.css";

const navToPath = {
  dashboard: "dashboard",
  members: "members",
  approvals: "registration-review",
  dues: "dues-finance",
  benefits: "benefits-assistance",
  tickets: "ticket-detail",
  events: "event-management",
  reports: "reports-analytics",
  audit: "audit-log",
  security: "id-card-management",
  settings: "admin-settings",
};

const pathToNav = Object.entries(navToPath).reduce((accumulator, [navKey, routePath]) => {
  accumulator[routePath] = navKey;
  return accumulator;
}, {});

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const activeNav = useMemo(() => {
    if (!location.pathname.startsWith("/admin")) {
      return "dashboard";
    }

    const [, , slug = "dashboard"] = location.pathname.replace(/\/+$/, "").split("/");
    return pathToNav[slug] || "dashboard";
  }, [location.pathname]);

  const handleNavigate = useCallback((target) => {
    const destination = navToPath[target] || target || "dashboard";
    const sanitized = String(destination).replace(/^\/+|\/+$/g, "");
    navigate(sanitized ? `/admin/${sanitized}` : "/admin/dashboard");
    setSidebarOpen(false);
  }, [navigate]);

  return (
    <div className="admin-layout" data-sidebar-open={sidebarOpen ? "true" : "false"}>
      <AdminSidebar active={activeNav} onNavigate={handleNavigate} />
      <div className="admin-layout__main">
        <TopBar onToggleSidebar={() => setSidebarOpen((previous) => !previous)} />
        <div className="admin-layout__content">
          <Outlet context={{ onNavigate: handleNavigate }} />
        </div>
      </div>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="admin-layout__overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  );
}
