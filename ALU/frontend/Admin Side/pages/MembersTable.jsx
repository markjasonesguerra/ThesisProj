import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  CreditCard,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/admin-base.css";
import client from "../../src/api/client";

const pageSize = 8;

const statusToneMap = {
  Active: "is-green",
  Approved: "is-green",
  "Pending Review": "is-orange",
  Inactive: "is-red",
  Rejected: "is-red",
};

const duesToneMap = {
  Current: "is-green",
  Paid: "is-green",
  Overdue: "is-red",
  Pending: "is-orange",
};

export default function MembersTable({ initialMembers }) {
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [union, setUnion] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState(initialMembers ?? []);
  const [metadata, setMetadata] = useState({
    total: initialMembers?.length ?? 0,
    pageCount: 1,
    filters: { companies: [], unions: [], statuses: [] },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest?.(".admin-row-actions")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    let subscribed = true;

    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await client.get("/api/admin/members", {
          params: {
            page,
            pageSize,
            query: query || undefined,
            company: company || undefined,
            union: union || undefined,
            status: status || undefined,
          },
        });
        if (!subscribed) return;
        const nextMembers = response.data?.results ?? [];
        const nextMetadata = response.data?.metadata ?? {};
        setMembers(nextMembers);
        setMetadata(nextMetadata);
        const nextPageCount = Math.max(1, nextMetadata.pageCount ?? 1);
        if (page > nextPageCount) {
          setPage(nextPageCount);
        }
      } catch (err) {
        if (!subscribed) return;
        setError(err?.response?.data?.message ?? "Unable to load members.");
        setMembers([]);
      } finally {
        if (subscribed) {
          setLoading(false);
        }
      }
    };

    fetchMembers();
    return () => {
      subscribed = false;
    };
  }, [page, query, company, union, status]);

  const pageCount = Math.max(1, metadata.pageCount ?? 1);
  const totalMembers = metadata.total ?? members.length;
  const showing = members.length;

  const companies = metadata.filters?.companies ?? [];
  const unions = metadata.filters?.unions ?? [];
  const statuses = metadata.filters?.statuses ?? [
    "Active",
    "Pending Review",
    "Approved",
    "Inactive",
    "Rejected",
  ];

  const handleViewProfile = (member) => {
    setOpenMenuId(null);
    navigate(`/admin/members/${member.id}`);
  };

  const handleIssueId = (member) => {
    setOpenMenuId(null);
    navigate(`/admin/id-card-management?member=${encodeURIComponent(member.memberID)}`);
  };

  const handleSendNotice = (member) => {
    setOpenMenuId(null);
    if (member.email) {
      const subject = encodeURIComponent("ALU Member Services Notice");
      window.open(`mailto:${member.email}?subject=${subject}`, "_blank", "noopener");
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-row">
        <div>
          <h1>Member Directory</h1>
          <p className="admin-muted">
            Review member records, monitor union affiliations, and export the
            dataset for compliance reporting.
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-button">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      <section className="admin-surface">
        <div className="admin-row" style={{ alignItems: "flex-end" }}>
          <label style={{ flex: 1 }}>
            <span className="admin-card__label">Search Members</span>
            <div
              className="admin-card"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              <Search size={18} color="#64748b" />
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, member ID, or email"
                style={{
                  border: "none",
                  outline: "none",
                  flex: 1,
                  fontSize: "14px",
                }}
              />
            </div>
          </label>

          <div className="admin-button" style={{ cursor: "default" }}>
            <Filter size={18} /> Filters
          </div>
        </div>

        <div className="admin-row" style={{ gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
          <select
            className="admin-button"
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Company (All)</option>
            {companies.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="admin-button"
            value={union}
            onChange={(event) => {
              setUnion(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Union (All)</option>
            {unions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="admin-button"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Status (All)</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="admin-surface">
        <div className="admin-row">
          <h2>Members ({totalMembers})</h2>
          <span className="admin-pill">Showing {showing} records</span>
        </div>

        {error ? (
          <div className="admin-empty-state">{error}</div>
        ) : null}

        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Name</th>
                <th>Company</th>
                <th>Union</th>
                <th>Status</th>
                <th>Dues</th>
                <th>ID Card</th>
                <th>Registered</th>
                <th style={{ width: "60px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td style={{ fontWeight: 600 }}>{member.memberID}</td>
                  <td>
                    <div className="admin-row" style={{ gap: "10px" }}>
                      <span className="admin-avatar">
                        {(member.fullName ?? "")
                          .split(" ")
                          .filter(Boolean)
                          .map((name) => name[0])
                          .join("") || "?"}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{member.fullName}</div>
                        <div className="admin-muted">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-stat">
                      <span>Company</span>
                      <span>{member.company}</span>
                    </div>
                  </td>
                  <td>
                    <div className="admin-stat">
                      <span>Union</span>
                      <span>{member.unionAffiliation}</span>
                    </div>
                  </td>
                  <td>
                    <span className={statusToneMap[member.status] || "admin-chip"}>
                      {member.status}
                    </span>
                  </td>
                  <td>
                    <span className={duesToneMap[member.duesStatus] || "admin-chip"}>
                      {member.duesStatus}
                    </span>
                  </td>
                  <td>{member.idStatus}</td>
                  <td>
                    {member.registeredDate
                      ? new Date(member.registeredDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-icon-button"
                        onClick={() => setOpenMenuId((current) => (current === member.id ? null : member.id))}
                        aria-label="Member actions"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuId === member.id ? (
                        <div className="admin-menu">
                          <button type="button" onClick={() => handleViewProfile(member)}>
                            <Eye size={14} />
                            View profile
                          </button>
                          <button type="button" onClick={() => handleIssueId(member)}>
                            <CreditCard size={14} />
                            Issue ID
                          </button>
                          <button type="button" onClick={() => handleSendNotice(member)}>
                            <Mail size={14} />
                            Send notice
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && members.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="admin-empty-state">
                      No members matched your filters. Adjust your search and try
                      again.
                    </div>
                  </td>
                </tr>
              )}
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="admin-empty-state">Loading members…</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="admin-row" style={{ marginTop: "24px" }}>
          <span className="admin-muted">
            Page {page} of {pageCount}
          </span>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
              style={{ opacity: page === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              className="admin-button"
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={page === pageCount}
              style={{ opacity: page === pageCount ? 0.5 : 1 }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

MembersTable.propTypes = {
  initialMembers: PropTypes.arrayOf(PropTypes.object),
};
