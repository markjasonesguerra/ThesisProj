import { useMemo, useState, useEffect } from "react";
import {
  Award,
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  DollarSign,
  Download,
  Filter,
  LineChart,
  PieChart,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import "../styles/admin-base.css";
import api from "../api/admin";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "membership", label: "Membership" },
  { id: "financial", label: "Financial" },
  { id: "operations", label: "Operations" },
  { id: "custom", label: "Custom Reports" },
];
const exportHistory = [];
const scheduledReports = [];

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const timeRange = "30d";

  const rangeShortLabels = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "12m": "Last 12 months",
  };

  const rangeDurationLabels = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    "12m": "12 months",
  };

  const newJoinerFieldByRange = {
    "7d": "newJoiners7d",
    "30d": "newJoiners30d",
    "90d": "newJoiners90d",
    "12m": "newJoiners12m",
  };

  const [summary, setSummary] = useState(null);

  const selectedRangeShort = rangeShortLabels[timeRange] ?? "Selected range";
  const selectedRangeDuration = rangeDurationLabels[timeRange] ?? "selected range";

  const newJoinersValue = useMemo(() => {
    const members = summary?.members;
    if (!members) return null;

    if (members.newJoinersByRange && members.newJoinersByRange[timeRange] != null) {
      return members.newJoinersByRange[timeRange];
    }
    if (members.newRegistrationsByRange && members.newRegistrationsByRange[timeRange] != null) {
      return members.newRegistrationsByRange[timeRange];
    }

    if (members.newJoiners && typeof members.newJoiners === "object" && members.newJoiners[timeRange] != null) {
      return members.newJoiners[timeRange];
    }
    if (members.newRegistrations && typeof members.newRegistrations === "object" && members.newRegistrations[timeRange] != null) {
      return members.newRegistrations[timeRange];
    }

    const field = newJoinerFieldByRange[timeRange];
    if (field && members[field] != null) {
      return members[field];
    }
    const registrationField = field ? field.replace("newJoiners", "newRegistrations") : null;
    if (registrationField && members[registrationField] != null) {
      return members[registrationField];
    }

    if (members.newJoiners30d != null) {
      return members.newJoiners30d;
    }
    if (members.newRegistrations30d != null) {
      return members.newRegistrations30d;
    }

    return null;
  }, [summary, timeRange]);

  // helpers available to all hooks in this component
  const formatCount = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString());
  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(v ?? 0));
  const formatPercent = (v, digits = 1) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) {
      return '—';
    }
    const numeric = Number(v);
    const sign = numeric >= 0 ? '' : '-';
    return `${sign}${Math.abs(numeric).toFixed(digits)}%`;
  };

  const formatStatValue = (value, formatType = 'count') => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '—';
    }
    switch (formatType) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return `${Number(value).toFixed(1)}%`;
      default:
        return formatCount(value);
    }
  };

  const growthTrend = summary?.members?.growthTrend ?? [];

  const growthChartData = useMemo(() => {
    if (!growthTrend.length) {
      return null;
    }

    const totals = growthTrend.map((point) => Number(point.totalMembers ?? 0));
    const newMembersSeries = growthTrend.map((point) => Number(point.newMembers ?? point.registrations ?? 0));
    const maxValue = Math.max(1, ...totals, ...newMembersSeries);
    const xDenominator = Math.max(growthTrend.length - 1, 1);

    const toPoints = (series) => series
      .map((value, index) => {
        const x = (index / xDenominator) * 100;
        const y = 100 - ((value / maxValue) * 100);
        return `${x},${y}`;
      })
      .join(' ');

    const gridSteps = 4;
    const gridLines = Array.from({ length: gridSteps + 1 }, (_value, idx) => (idx / gridSteps) * 100);

    return {
      labels: growthTrend.map((point) => point.label ?? point.month),
      maxValue,
      totals,
      newMembers: newMembersSeries,
      totalsPoints: toPoints(totals),
      newMembersPoints: toPoints(newMembersSeries),
      gridLines,
    };
  }, [growthTrend]);

  const memberDistribution = useMemo(() => {
    const entries = summary?.members?.distribution ?? [];
    if (!entries.length) {
      return { segments: [], pieStyle: null, total: 0 };
    }
    const palette = ['#2563eb', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#6b7280', '#14b8a6', '#facc15'];
    const total = entries.reduce((acc, item) => acc + Number(item.count ?? 0), 0);
    if (!total) {
      return { segments: [], pieStyle: null, total: 0 };
    }

    let cumulativePercent = 0;
    const segments = entries.map((item, index) => {
      const value = Number(item.count ?? 0);
      const percent = (value / total) * 100;
      const startPercent = cumulativePercent;
      cumulativePercent += percent;
      return {
        company: item.company,
        value,
        percent,
        color: palette[index % palette.length],
        startDeg: (startPercent / 100) * 360,
        endDeg: (cumulativePercent / 100) * 360,
      };
    });

    const pieStyle = {
      background: `conic-gradient(${segments
        .map((segment) => `${segment.color} ${segment.startDeg}deg ${segment.endDeg}deg`)
        .join(', ')})`,
    };

    return { segments, pieStyle, total };
  }, [summary]);

  const performanceHighlights = useMemo(() => {
    const toHighlights = (items) => (items ?? []).map((item) => ({
      label: item.label,
      value: item.value,
      format: item.format ?? 'count',
      meta: item.meta ?? null,
    }));

    return {
      membership: toHighlights(summary?.performance?.membership),
      financial: toHighlights(summary?.performance?.financial),
      operations: toHighlights(summary?.performance?.operations),
    };
  }, [summary]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.getReportsSummary();
        if (!mounted) return;
        setSummary(res.data);
      } catch (err) {
        console.error('Unable to load reports summary', err);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  function currencyFormat(amount) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  }

  // membership & finance highlights are data-driven where possible; default to empty/placeholder
  const membershipHighlights = performanceHighlights.membership;
  const financialHighlights = performanceHighlights.financial;
  const operationsHighlights = performanceHighlights.operations;

  const registrationKPIs = [
    { label: "Avg processing time", value: "2.3 days" },
    { label: "Approval rate", value: "94%" },
    { label: "Pending reviews", value: "47" },
    { label: "Duplicate detections", value: "3 (6.4%)" },
  ];

  const topKpis = useMemo(() => {
    const membersTotal = summary?.members?.total;
    const newJoiners30d = summary?.members?.newJoiners30d;
    const membersGrowthPercent = summary?.members?.growthPercent;

    const revenueYtd = summary?.financial?.revenueYtd;
    const revenuePrevYear = summary?.financial?.revenuePrevYear;
    const revenueYoYPercent = summary?.financial?.revenueYoYPercent ?? (
      revenuePrevYear > 0 && revenueYtd != null
        ? ((revenueYtd - revenuePrevYear) / revenuePrevYear) * 100
        : null
    );

    const collectionRate = summary?.financial?.collectionRate;
    const collectionNote = summary?.financial?.collectionNote;

    const activeCompanies = summary?.members?.activeEmployers;
    const payingEmployers = summary?.members?.payingEmployers;

    const normalizeCurrency = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? currencyFormat(numeric) : '—';
    };

    const normalizePercent = (value, fallback = '—') => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return fallback;
      }
      const rounded = numeric.toFixed(1);
      const sign = numeric > 0 ? '+' : '';
      return `${sign}${rounded}%`;
    };

    const membersDelta = (() => {
      if (Number.isFinite(membersGrowthPercent)) {
        return `${membersGrowthPercent >= 0 ? '+' : ''}${membersGrowthPercent.toFixed(1)}% vs prior 30d`;
      }
      if (Number.isFinite(newJoiners30d)) {
        return `+${formatCount(newJoiners30d)} in last 30 days`;
      }
      return '—';
    })();

    const revenueDelta = normalizePercent(revenueYoYPercent, revenuePrevYear ? '0% vs last year' : '—')
      .replace('NaN', '—');

    const collectionDelta = (() => {
      if (collectionNote) {
        return collectionNote;
      }
      if (Number.isFinite(collectionRate)) {
        return collectionRate >= 95 ? 'Above target' : collectionRate >= 85 ? 'On track' : 'Needs attention';
      }
      return '—';
    })();

    const companiesDelta = (() => {
      if (Number.isFinite(payingEmployers) && payingEmployers > 0) {
        return `${formatCount(payingEmployers)} remitting this year`;
      }
      if (Number.isFinite(activeCompanies) && activeCompanies > 0) {
        return 'Distinct employers represented';
      }
      return '—';
    })();

    return [
      {
        id: 'members',
        label: 'Total Members',
        value: formatCount(membersTotal),
        delta: membersDelta,
        tone: 'positive',
      },
      {
        id: 'revenue',
        label: 'Revenue (YTD)',
        value: normalizeCurrency(revenueYtd),
        delta: revenueDelta,
        tone: 'positive',
      },
      {
        id: 'collection',
        label: 'Collection Rate',
        value: normalizePercent(collectionRate, '—').replace('NaN', '—'),
        delta: collectionDelta,
        tone: Number.isFinite(collectionRate) && collectionRate >= 90 ? 'positive' : 'neutral',
      },
      {
        id: 'companies',
        label: 'Active Companies',
        value: formatCount(activeCompanies),
        delta: companiesDelta,
        tone: 'neutral',
      },
    ];
  }, [summary]);

  return (
    <div className="admin-page admin-stack-xl reports-page">
      <section className="reports-header">
        <div className="reports-header__text">
          <h1>Reports & Analytics</h1>
          <p className="admin-muted">Comprehensive insights and reporting for ALUzon operations.</p>
        </div>
        <div className="reports-header__actions">
          <button type="button" className="admin-button">
            <Calendar size={16} /> Schedule Report
          </button>
          <button type="button" className="admin-button">
            <Filter size={16} /> Custom Filter
          </button>
          <button type="button" className="admin-button is-primary">
            <Download size={16} /> Export All
          </button>
        </div>
      </section>

      {summary?.meta?.isSample ? (
        <div className="admin-alert admin-alert--info">
          Displaying sample analytics until live data is available.
        </div>
      ) : null}

      <div className="reports-tab-strip">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`reports-tab ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="reports-tab-content">
        {activeTab === "overview" ? (
            <>
              <section className="reports-kpi-grid">
                {topKpis.map((kpi) => (
                  <article key={kpi.id} className="reports-kpi-card">
                    <span className="reports-kpi-card__label">{kpi.label}</span>
                    <strong className="reports-kpi-card__value">{kpi.value}</strong>
                    <span className={`reports-kpi-card__delta ${kpi.tone === 'positive' ? 'is-positive' : ''}`}>
                      {kpi.delta}
                    </span>
                  </article>
                ))}
              </section>

              <div className="admin-grid-two">
                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <LineChart size={18} />
                    <div>
                      <h2>Membership growth</h2>
                      <p className="admin-muted">Member count and new joiners for the past {selectedRangeDuration}.</p>
                    </div>
                  </header>
                  {growthChartData ? (
                    <div className="reports-line-chart">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                        {growthChartData.gridLines.map((y, index) => (
                          <line key={`grid-${y}-${index}`} x1="0" x2="100" y1={y} y2={y} className="reports-line-chart__grid" />
                        ))}
                        <polyline points={growthChartData.totalsPoints} className="reports-line-chart__series is-total" />
                        <polyline points={growthChartData.newMembersPoints} className="reports-line-chart__series is-new" />
                      </svg>
                      <div className="reports-line-chart__legend">
                        <span><span className="reports-line-chart__dot is-total" /> Members</span>
                        <span><span className="reports-line-chart__dot is-new" /> New joiners</span>
                      </div>
                      <div className="reports-line-chart__labels">
                        {growthTrend.map((point) => (
                          <span key={point.month}>{point.label ?? point.month}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="admin-empty-state is-minimal">No member growth data yet.</div>
                  )}
                  <div className="admin-inline-list">
                    <span>
                      Total members: {formatCount(summary?.members?.total)}
                      {summary?.members?.retentionRate != null ? ` (${formatPercent(summary.members.retentionRate)})` : ''}
                    </span>
                    <span>
                      New joiners ({selectedRangeShort}): {newJoinersValue != null ? formatCount(newJoinersValue) : '—'}
                      {summary?.members?.newJoinersChange != null ? ` (${summary.members.newJoinersChange >= 0 ? '+' : ''}${Math.abs(Number(summary.members.newJoinersChange)).toFixed(1)}% vs prior)` : ''}
                    </span>
                    <span>
                      Growth vs prior 30d: {summary?.members?.growthPercent != null ? `${summary.members.growthPercent >= 0 ? '+' : ''}${Math.abs(Number(summary.members.growthPercent)).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </article>

                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <PieChart size={18} />
                    <div>
                      <h2>Member distribution</h2>
                      <p className="admin-muted">Breakdown by employer segments.</p>
                    </div>
                  </header>
                  {memberDistribution.segments.length ? (
                    <div className="reports-pie-card">
                      <div className="reports-pie-card__chart" style={memberDistribution.pieStyle}>
                        <div className="reports-pie-card__chart-overlay">
                          <strong>{formatCount(memberDistribution.total)}</strong>
                          <span>Total</span>
                        </div>
                      </div>
                      <ul className="reports-pie-card__legend">
                        {memberDistribution.segments.map((segment) => (
                          <li key={segment.company}>
                            <span className="reports-pie-card__swatch" style={{ backgroundColor: segment.color }} />
                            <span className="reports-pie-card__label">{segment.company}</span>
                            <strong>{formatCount(segment.value)}</strong>
                            <span className="reports-pie-card__percent">{segment.percent.toFixed(1)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="admin-empty-state is-minimal">No employer distribution data yet.</div>
                  )}
                </article>
              </div>

              <article className="admin-card">
                <header className="admin-card__heading">
                  <TrendingUp size={18} />
                  <div>
                    <h2>Performance summary</h2>
                    <p className="admin-muted">Cross-functional KPIs monitored in the latest reporting cycle.</p>
                  </div>
                </header>
                <div className="admin-summary-columns">
                  <div className="admin-summary-column">
                    <h3>Membership health</h3>
                    {membershipHighlights.length ? (
                      <ul className="admin-stat-list">
                        {membershipHighlights.map((item) => (
                          <li key={item.label}>
                            <span>{item.label}</span>
                            <span>{formatStatValue(item.value, item.format)}</span>
                            <small>{item.meta ?? '—'}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="admin-empty-state is-minimal">No membership KPIs yet.</div>
                    )}
                  </div>
                  <div className="admin-summary-column">
                    <h3>Financial performance</h3>
                    {financialHighlights.length ? (
                      <ul className="admin-stat-list">
                        {financialHighlights.map((item) => (
                          <li key={item.label}>
                            <span>{item.label}</span>
                            <span>{formatStatValue(item.value, item.format)}</span>
                            <small>{item.meta ?? '—'}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="admin-empty-state is-minimal">No financial KPIs yet.</div>
                    )}
                  </div>
                  <div className="admin-summary-column">
                    <h3>Operational health</h3>
                    {operationsHighlights.length ? (
                      <ul className="admin-stat-list">
                        {operationsHighlights.map((item) => (
                          <li key={item.label}>
                            <span>{item.label}</span>
                            <span>{formatStatValue(item.value, item.format)}</span>
                            <small>{item.meta ?? '—'}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="admin-empty-state is-minimal">No operations KPIs yet.</div>
                    )}
                  </div>
                </div>
              </article>

            </>
            ) : null}

        {activeTab === "membership" ? (
            <>
              <section className="admin-card-grid cols-3">
                {(() => {
                  const labels = [
                    { title: "Active members", meta: "Across 128 locals" },
                    { title: "New joiners", meta: `Past ${selectedRangeDuration}` },
                    { title: "Retention", meta: "Trailing 12 months" },
                  ];
                  const values = [
                    summary?.members?.total != null ? formatCount(summary.members.total) : '—',
                    newJoinersValue != null ? formatCount(newJoinersValue) : '—',
                    summary?.members?.retentionRate != null ? `${Number(summary.members.retentionRate).toFixed(1)}%` : '—',
                  ];
                  return labels.map((lab, index) => (
                    <article key={lab.title} className="admin-card admin-stack-sm">
                      <span className="admin-card__label">{lab.title}</span>
                      <span className="admin-highlight-value">{values[index]}</span>
                      <span className="admin-muted">{lab.meta}</span>
                    </article>
                  ));
                })()}
              </section>

              <div className="admin-grid-two">
                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <Users size={18} />
                    <div>
                      <h2>By union position</h2>
                      <p className="admin-muted">Active members holding union leadership roles.</p>
                    </div>
                  </header>
                  <div className="admin-stack-sm">
                    {[
                      { label: "Board member", value: 1234, percent: 6 },
                      { label: "Treasurer", value: 567, percent: 3 },
                      { label: "Secretary", value: 389, percent: 2 },
                      { label: "Vice president", value: 156, percent: 1 },
                      { label: "President", value: 112, percent: 1 },
                    ].map((item) => (
                      <div key={item.label} className="admin-progress-row">
                        <div className="admin-progress-row__label">
                          <span>{item.label}</span>
                          <strong>{item.value.toLocaleString()}</strong>
                        </div>
                        <div className="admin-progress">
                          <span style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <BarChart3 size={18} />
                    <div>
                      <h2>By years employed</h2>
                      <p className="admin-muted">Experience distribution across active members.</p>
                    </div>
                  </header>
                  <div className="admin-stack-sm">
                    {[
                      { label: "1-5 years", value: 7698, percent: 40 },
                      { label: "6-10 years", value: 5774, percent: 30 },
                      { label: "11-15 years", value: 3849, percent: 20 },
                      { label: "16-20 years", value: 1540, percent: 8 },
                      { label: "20+ years", value: 386, percent: 2 },
                    ].map((item) => (
                      <div key={item.label} className="admin-progress-row">
                        <div className="admin-progress-row__label">
                          <span>{item.label}</span>
                          <strong>{item.value.toLocaleString()}</strong>
                        </div>
                        <div className="admin-progress">
                          <span style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </>
            ) : null}

        {activeTab === "financial" ? (
            <>
              <section className="admin-card-grid cols-4">
                {financialHighlights.map((item) => (
                  <article key={item.label} className="admin-card admin-stack-sm admin-card--center">
                    <span className="admin-card__value">{formatStatValue(item.value, item.format)}</span>
                    <span className="admin-muted">{item.label}</span>
                    <span className="admin-card__meta">{item.meta ?? '—'}</span>
                  </article>
                ))}
              </section>

              <article className="admin-card admin-stack-md">
                <header className="admin-card__heading">
                  <DollarSign size={18} />
                  <div>
                    <h2>Dues collection performance</h2>
                    <p className="admin-muted">Collected vs target by month.</p>
                  </div>
                </header>
                <div className="admin-chart-placeholder">
                  <div className="admin-chart-placeholder__content">
                    <span>Bar chart placeholder – connect your BI chart</span>
                    <div className="admin-chart-legend">
                      <span className="is-primary">Collected</span>
                      <span className="is-muted">Target</span>
                    </div>
                  </div>
                </div>
                <div className="admin-inline-list">
                  <span>Target attainment: 108%</span>
                  <span>Variance: +₱120K</span>
                  <span>Payroll imports: 92%</span>
                </div>
              </article>

              <div className="admin-grid-two">
                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <Building2 size={18} />
                    <div>
                      <h2>Top performing companies</h2>
                      <p className="admin-muted">Collections vs target over the last quarter.</p>
                    </div>
                  </header>
                  <div className="admin-stack-sm">
                    {[
                      { label: "SM Investments", value: "₱1.2M", percent: 96 },
                      { label: "Ayala Corporation", value: "₱980K", percent: 90 },
                      { label: "Jollibee Foods", value: "₱742K", percent: 82 },
                      { label: "LRT Operations", value: "₱615K", percent: 78 },
                    ].map((row) => (
                      <div key={row.label} className="admin-progress-row">
                        <div className="admin-progress-row__label">
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                        <div className="admin-progress">
                          <span style={{ width: `${row.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <Target size={18} />
                    <div>
                      <h2>Collection focus areas</h2>
                      <p className="admin-muted">Priorities surfaced by AI monitoring.</p>
                    </div>
                  </header>
                  <ul className="admin-list-plain">
                    <li>
                      <span>Outstanding payroll uploads</span>
                      <strong>12 companies</strong>
                    </li>
                    <li>
                      <span>Members with 2+ missed deductions</span>
                      <strong>428 accounts</strong>
                    </li>
                    <li>
                      <span>Manual remittances awaiting reconciliation</span>
                      <strong>₱186K</strong>
                    </li>
                    <li>
                      <span>Projected arrears (next 30d)</span>
                      <strong>₱92K</strong>
                    </li>
                  </ul>
                </article>
              </div>
            </>
            ) : null}

        {activeTab === "operations" ? (
            <>
              <section className="admin-card-grid cols-4">
                {operationsHighlights.map((item) => (
                  <article key={item.label} className="admin-card admin-stack-sm admin-card--center">
                    <span className="admin-card__value">{formatStatValue(item.value, item.format)}</span>
                    <span className="admin-muted">{item.label}</span>
                    <span className="admin-card__meta">{item.meta ?? '—'}</span>
                  </article>
                ))}
              </section>

              <div className="admin-grid-two">
                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <ClipboardList size={18} />
                    <div>
                      <h2>Registration processing</h2>
                      <p className="admin-muted">Queue health metrics from the last review cycle.</p>
                    </div>
                  </header>
                  <div className="admin-grid-two">
                    {registrationKPIs.map((entry) => (
                      <div key={entry.label} className="admin-kpi-tile">
                        <strong>{entry.value}</strong>
                        <span>{entry.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="admin-inline-list">
                    <span>Fast-track approvals: 67%</span>
                    <span>Manual escalations: 9 cases</span>
                    <span>Consent follow-ups: 14 pending</span>
                  </div>
                </article>

                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <ShieldCheck size={18} />
                    <div>
                      <h2>System performance</h2>
                      <p className="admin-muted">Platform uptime and service reliability.</p>
                    </div>
                  </header>
                  <ul className="admin-list-plain">
                    <li>
                      <span>Database health</span>
                      <strong>98%</strong>
                    </li>
                    <li>
                      <span>API response time</span>
                      <strong>142 ms</strong>
                    </li>
                    <li>
                      <span>Storage usage</span>
                      <strong>67%</strong>
                    </li>
                    <li>
                      <span>Uptime (30d)</span>
                      <strong>99.9%</strong>
                    </li>
                  </ul>
                </article>
              </div>

              <article className="admin-card admin-stack-md">
                <header className="admin-card__heading">
                  <Award size={18} />
                  <div>
                    <h2>Assistance programs</h2>
                    <p className="admin-muted">Benefit disbursements and satisfaction scores.</p>
                  </div>
                </header>
                <div className="admin-grid-two">
                  <div className="admin-assistance-tile">
                    <strong>247</strong>
                    <span>Total requests (30d)</span>
                    <small>+18% vs prior</small>
                  </div>
                  <div className="admin-assistance-tile">
                    <strong>₱2.57M</strong>
                    <span>Funds released</span>
                    <small>Avg turn-around: 3.2 days</small>
                  </div>
                  <div className="admin-assistance-tile">
                    <strong>91%</strong>
                    <span>Member satisfaction</span>
                    <small>Survey sample: 186</small>
                  </div>
                  <div className="admin-assistance-tile">
                    <strong>12</strong>
                    <span>Escalated cases</span>
                    <small>Flagged for manual audit</small>
                  </div>
                </div>
              </article>
            </>
            ) : null}

        {activeTab === "custom" ? (
            <>
              <div className="admin-grid-two">
                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <BarChart3 size={18} />
                    <div>
                      <h2>Report builder</h2>
                      <p className="admin-muted">Choose data sources, filters, and formats.</p>
                    </div>
                  </header>
                  <div className="admin-form-grid">
                    <label className="admin-field">
                      <span>Report type</span>
                      <select defaultValue="membership">
                        <option value="membership">Membership report</option>
                        <option value="financial">Financial summary</option>
                        <option value="attendance">Event attendance</option>
                        <option value="assistance">Benefits & assistance</option>
                        <option value="ai">AI analytics</option>
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Date range</span>
                      <select defaultValue="month">
                        <option value="week">Last 7 days</option>
                        <option value="month">Last 30 days</option>
                        <option value="quarter">Last 3 months</option>
                        <option value="year">Last 12 months</option>
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Primary filter</span>
                      <select defaultValue="company">
                        <option value="company">By company</option>
                        <option value="union">By union position</option>
                        <option value="status">By status</option>
                        <option value="region">By region</option>
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Output format</span>
                      <select defaultValue="pdf">
                        <option value="pdf">PDF report</option>
                        <option value="excel">Excel spreadsheet</option>
                        <option value="csv">CSV file</option>
                        <option value="dashboard">Interactive dashboard</option>
                      </select>
                    </label>
                  </div>
                  <button type="button" className="admin-button is-primary admin-report-action">
                    <BarChart3 size={16} /> Generate report
                  </button>
                </article>

                <article className="admin-card admin-stack-md">
                  <header className="admin-card__heading">
                    <Calendar size={18} />
                    <div>
                      <h2>Scheduled reports</h2>
                      <p className="admin-muted">Automated deliveries to stakeholders.</p>
                    </div>
                  </header>
                  <div className="admin-stack-sm">
                    {scheduledReports.map((entry) => (
                      <div key={entry.id} className="admin-scheduled-row">
                        <div>
                          <strong>{entry.name}</strong>
                          <p className="admin-muted">{entry.cadence} • Next run {entry.nextRun}</p>
                        </div>
                        <div className="admin-scheduled-row__actions">
                          <button type="button" className="admin-button admin-button--ghost">Pause</button>
                          <button type="button" className="admin-button admin-button--ghost">Edit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <article className="admin-card admin-stack-md">
                <header className="admin-card__heading">
                  <Download size={18} />
                  <div>
                    <h2>Export history</h2>
                    <p className="admin-muted">Track completed downloads and formats.</p>
                  </div>
                </header>
                <div className="admin-table-wrapper">
                  <table className="admin-table admin-table--condensed">
                    <thead>
                      <tr>
                        <th>Report</th>
                        <th>Date</th>
                        <th>Size</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {exportHistory.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.date}</td>
                          <td>{row.size}</td>
                          <td>
                            <span className="admin-chip is-green">{row.status}</span>
                          </td>
                          <td>
                            <button type="button" className="admin-button admin-button--ghost">
                              <Download size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </>
            ) : null}
      </div>
    </div>
  );
}
