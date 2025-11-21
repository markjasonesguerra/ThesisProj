import PropTypes from "prop-types";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CheckSquare,
  LineChart,
  Settings,
  FileText,
  ShieldAlert,
  Wallet,
  HeartHandshake,
  CalendarClock,
  IdCardIcon,
} from "lucide-react";
import "../styles/admin-base.css";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "approvals", label: "Approvals", icon: CheckSquare },
  { id: "dues", label: "Dues & Finance", icon: Wallet },
  { id: "security", label: "ID Card Management", icon: IdCardIcon },
  { id: "benefits", label: "Benefits Assistance", icon: HeartHandshake },
  { id: "tickets", label: "Tickets", icon: ClipboardList },
  { id: "events", label: "Event Management", icon: CalendarClock },
  { id: "reports", label: "Reports", icon: LineChart },
  { id: "audit", label: "Audit Log", icon: FileText },
  { id: "settings", label: "Admin Settings", icon: Settings },
];

export default function AdminSidebar({ active, onNavigate }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__header">
        <span className="admin-pill is-blue">ALU Admin</span>
        <strong>Member Services</strong>
      </div>
      <nav className="admin-sidebar__nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              className={`admin-sidebar__item ${isActive ? "active" : ""}`}
              onClick={() => onNavigate?.(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <footer className="admin-sidebar__footer">
        <p className="admin-muted">Union Local 305</p>
        <p className="admin-muted" style={{ fontSize: "12px" }}>
          Secure environment · v1.2.0
        </p>
      </footer>
    </aside>
  );
}

AdminSidebar.propTypes = {
  active: PropTypes.string,
  onNavigate: PropTypes.func,
};
