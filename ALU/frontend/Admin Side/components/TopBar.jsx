import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Bell,
  Search,
  ShieldCheck,
  Sparkles,
  Menu,
  UserCircle,
} from "lucide-react";
import client from "../../src/api/client";
import "../styles/admin-base.css";

const sanitizeEnvText = (value, fallback) => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const normalized = value.toString().replace(/^['"]|['"]$/g, "").trim();
  return normalized.length ? normalized : fallback;
};

const computeInitials = (name) => {
  if (!name) {
    return "AU";
  }
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
};

export default function TopBar({ onToggleSidebar }) {
  const defaultAdminName = sanitizeEnvText(process.env.REACT_APP_DEFAULT_ADMIN_NAME, "Admin User");
  const defaultAdminId = sanitizeEnvText(process.env.REACT_APP_DEFAULT_ADMIN_ID, "");
  const MIN_SEARCH_LENGTH = 2;

  const [profile, setProfile] = useState({
    fullName: defaultAdminName,
    title: "Admin User",
    initials: computeInitials(defaultAdminName),
  });
  const [notifications, setNotifications] = useState({
    badgeCount: 0,
    buckets: [],
    generatedAt: null,
  });
  const [security, setSecurity] = useState({
    message: "Secure channel active",
    lastEventAgo: null,
    healthy: true,
    activeSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState({
    members: [],
    tickets: [],
    registrations: [],
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const notificationsRef = useRef(null);
  const lastSearchRequestId = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const fetchOverview = async () => {
      try {
        const params = {};
        if (defaultAdminId) {
          params.adminId = defaultAdminId;
        }
        const response = await client.get("/api/admin/topbar/overview", { params });
        if (!isMounted) return;

        const payload = response.data ?? {};
        const nextProfile = payload.admin ?? {};
        setProfile((previous) => ({
          ...previous,
          ...nextProfile,
          fullName: nextProfile.fullName ?? previous.fullName,
          title: nextProfile.title ?? previous.title,
          initials: nextProfile.initials ?? previous.initials,
        }));

        const bucketList = Array.isArray(payload.notifications?.buckets)
          ? payload.notifications.buckets
          : [];
        setNotifications({
          badgeCount: Number(payload.notifications?.badgeCount ?? 0),
          buckets: bucketList,
          generatedAt: payload.notifications?.generatedAt ?? new Date().toISOString(),
        });

        setSecurity((previous) => ({
          ...previous,
          ...(payload.security ?? {}),
        }));

        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError?.response?.data?.message ?? "Unable to sync top bar data");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOverview();
    const intervalId = setInterval(fetchOverview, 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [defaultAdminId]);

  const notificationTooltip = useMemo(() => {
    if (error) {
      return error;
    }
    if (!notifications.buckets.length) {
      return "No outstanding alerts";
    }
    const summary = notifications.buckets
      .filter((bucket) => Number(bucket.count) > 0)
      .map((bucket) => `${bucket.label}: ${bucket.count}`)
      .join(" • ");
    return summary || "No outstanding alerts";
  }, [error, notifications]);

  const badgeCount = Number(notifications.badgeCount ?? 0);
  const badgeDisplay = loading ? "…" : badgeCount > 99 ? "99+" : badgeCount.toString();
  const secureLabel = error ? "Status sync issue" : security.message;
  const secureSuffix = !error && security.lastEventAgo ? ` • ${security.lastEventAgo}` : "";
  const secureTooltip = error
    ? error
    : `Active admin sessions: ${security.activeSessions ?? 0}${security.lastEventAgo ? ` | Last event ${security.lastEventAgo}` : ""}`;
  const trimmedSearch = searchTerm.trim();
  const hasMinSearchChars = trimmedSearch.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!searchOpen) {
      return undefined;
    }
    const handleClick = (event) => {
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchOpen]);

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined;
    }
    const handleClick = (event) => {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchOpen(Boolean(searchTerm.trim()));
    }

    if (!hasMinSearchChars) {
      setSearchResults({ members: [], tickets: [], registrations: [] });
      setSearchError(null);
      setSearchLoading(false);
      return undefined;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    const requestId = lastSearchRequestId.current + 1;
    lastSearchRequestId.current = requestId;

    const timeoutId = setTimeout(async () => {
      try {
        const response = await client.get("/api/admin/search/quick", { params: { q: searchTerm.trim() } });
        if (cancelled || requestId !== lastSearchRequestId.current) {
          return;
        }
        setSearchResults(response.data?.results ?? { members: [], tickets: [], registrations: [] });
        setSearchError(null);
      } catch (searchFetchError) {
        if (cancelled || requestId !== lastSearchRequestId.current) {
          return;
        }
        setSearchError(searchFetchError?.response?.data?.message ?? "Search failed");
      } finally {
        if (!cancelled && requestId === lastSearchRequestId.current) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchTerm, searchOpen, hasMinSearchChars]);

  const hasSearchResults =
    searchResults.members.length || searchResults.tickets.length || searchResults.registrations.length;

  const renderSearchSection = (title, items, renderItem) => {
    if (!items.length) {
      return null;
    }
    return (
      <div className="admin-search-panel__section" key={title}>
        <div className="admin-search-panel__section-label">{title}</div>
        <ul>
          {items.map((item) => (
            <li key={item.id || item.ticketNo}>{renderItem(item)}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderMember = (member) => (
    <div className="admin-search-panel__item">
      <strong>{member.fullName}</strong>
      <span>{member.email}</span>
      <span className="admin-search-panel__meta">{member.membershipNo || member.status}</span>
    </div>
  );

  const renderTicket = (ticket) => (
    <div className="admin-search-panel__item">
      <strong>{ticket.ticketNo}</strong>
      <span>{ticket.subject}</span>
      <span className="admin-search-panel__meta">{ticket.status}</span>
    </div>
  );

  const renderRegistration = (entry) => (
    <div className="admin-search-panel__item">
      <strong>{entry.fullName}</strong>
      <span>{entry.email}</span>
      <span className="admin-search-panel__meta">Submitted {entry.submittedAgo || 'recently'}</span>
    </div>
  );

  return (
    <header className="admin-topbar">
      <button
        type="button"
        className="admin-topbar__icon is-mobile"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
      >
        <Menu size={18} />
      </button>
      <div className="admin-topbar__search" ref={searchContainerRef}>
        <Search size={16} />
        <input
          type="search"
          placeholder="Search tickets, members, files"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onFocus={() => setSearchOpen(true)}
        />
        {searchOpen ? (
          <div className="admin-search-panel">
            {!hasMinSearchChars ? (
              <div className="admin-search-panel__status">Type at least {MIN_SEARCH_LENGTH} characters to search.</div>
            ) : null}
            {hasMinSearchChars && searchLoading ? (
              <div className="admin-search-panel__status">Searching…</div>
            ) : null}
            {hasMinSearchChars && searchError ? (
              <div className="admin-search-panel__status is-error">{searchError}</div>
            ) : null}
            {hasMinSearchChars && !searchLoading && !searchError && !hasSearchResults ? (
              <div className="admin-search-panel__status">No matches yet. Try a different keyword.</div>
            ) : null}
            {renderSearchSection("Members", searchResults.members, renderMember)}
            {renderSearchSection("Tickets", searchResults.tickets, renderTicket)}
            {renderSearchSection("Registrations", searchResults.registrations, renderRegistration)}
          </div>
        ) : null}
      </div>
      <div className="admin-topbar__right">
        <span className="admin-topbar__shortcut" title={secureTooltip}>
          <ShieldCheck size={16} />
          {" "}
          {secureLabel}
          {secureSuffix}
        </span>
        <button type="button" className="admin-topbar__icon" aria-label="AI suggestions">
          <Sparkles size={18} />
        </button>
        <button
          type="button"
          className="admin-topbar__icon"
          aria-label="Notifications"
          title={notificationTooltip}
          onClick={() => setNotificationsOpen((previous) => !previous)}
          ref={notificationsRef}
        >
          <Bell size={18} />
          <span className="admin-badge is-critical">{badgeDisplay}</span>
          {notificationsOpen ? (
            <div className="admin-notification-panel">
              <div className="admin-notification-panel__header">
                Notifications
                <span className="admin-notification-panel__timestamp">
                  Updated {notifications.generatedAt ? new Date(notifications.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'moments ago'}
                </span>
              </div>
              {error ? (
                <div className="admin-notification-panel__status is-error">{error}</div>
              ) : null}
              {!error && !notifications.buckets.length ? (
                <div className="admin-notification-panel__status">No new alerts.</div>
              ) : null}
              <ul>
                {notifications.buckets.map((bucket) => (
                  <li key={bucket.key}>
                    <div className="admin-notification-panel__row">
                      <div>
                        <strong>{bucket.label}</strong>
                        <span className="admin-notification-panel__hint">Monitor and action items in this queue.</span>
                      </div>
                      <span className="admin-notification-panel__badge">{bucket.count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </button>
        <div className="admin-topbar__profile">
          <UserCircle size={32} />
          <div>
            <strong>{profile.fullName}</strong>
            <span>{profile.title}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

TopBar.propTypes = {
  onToggleSidebar: PropTypes.func,
};
