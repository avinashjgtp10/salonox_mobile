// src/components/packages/PackageDashboard.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Package, CheckCircle2, Clock, Target, Search, History, X, Loader2, Sparkles, PenLine, ChevronRight, Layers } from "lucide-react";
import styles from "./packages.module.scss";
import { Pagination } from "../ui/Pagination";
import type { ClientPackage, PackageTemplate } from "../../services/api/endpoints/packages.endpoints";
import { useListPackageTemplatesQuery } from "../../services/api/endpoints/packages.endpoints";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import { useGetClientPackages } from "../../hooks/packages/usePackages";
import { useCurrency } from "../../hooks/useCurrency";

interface Props {
  selectedClient: ClientSearchResult | null;
  onClientChange: (client: ClientSearchResult | null) => void;
  onCreateNew: () => void;
  onCreateFromTemplate: (template: PackageTemplate) => void;
}

const PAGE_SIZE = 20;

function daysUntil(dateStr: string | null) {
  if (dateStr === null) return Infinity;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

const PackageDashboard: React.FC<Props> = ({
  selectedClient, onCreateNew, onCreateFromTemplate,
}) => {
  const { formatAmount } = useCurrency();
  const [activeTab,       setActiveTab]       = useState("");

  // List is salon-wide now (like Sold Memberships) — no client selection
  // gates it. `search` stays controlled for instant typing; the query only
  // refetches off the debounced copy so it doesn't flash loading on every
  // keystroke (same fix as SoldMembershipsPage.tsx / MembershipsListPage.tsx).
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [sortBy,          setSortBy]          = useState("newest");
  const [page,            setPage]            = useState(1);
  const [pageSize,        setPageSize]        = useState(PAGE_SIZE);
  const [expandedId,      setExpandedId]      = useState<string | null>(null);
  const [showChoice,      setShowChoice]      = useState(false);
  const [showTmplPicker,  setShowTmplPicker]  = useState(false);

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  const { data: templates = [] } = useListPackageTemplatesQuery();

  const { packages: allPkgs, total, isLoading, isError, refetch } =
    useGetClientPackages({ search: debouncedSearch.trim() || undefined, page, limit: pageSize });

  // expiry is a derived concept (computed from expiryDate), not trusted from
  // the stored `status` column — mirrors the previous per-client logic, just
  // applied to the salon-wide page instead of one client's packages.
  const clientPkgs = useMemo(() => {
    let result = [...allPkgs];
    if (statusFilter === "active")  result = result.filter(p => daysUntil(p.expiryDate) >= 0);
    if (statusFilter === "expired") result = result.filter(p => daysUntil(p.expiryDate) < 0);
    if (sortBy === "newest") result.sort((a, b) => b.id.localeCompare(a.id));
    if (sortBy === "expiry") result.sort((a, b) =>
      (a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity) -
      (b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity)
    );
    if (sortBy === "amount") result.sort((a, b) => b.totalAmount - a.totalAmount);
    return result;
  }, [allPkgs, statusFilter, sortBy]);

  // Stats reflect the current page's items (same simplification Sold
  // Memberships uses), not an exhaustive salon-wide count.
  const activePkgs  = allPkgs.filter(p => daysUntil(p.expiryDate) >= 0).length;
  const expiredPkgs = allPkgs.length - activePkgs;
  const totalRem    = allPkgs.reduce((a, p) => a + p.services.reduce((s, sv) => s + sv.remainingSessions, 0), 0);

  // One row per client — groups all of the client's packages FROM THE CURRENT
  // PAGE together (pagination is still server-side per-package, so a client
  // whose packages straddle a page boundary will show a partial group on each
  // page — same tradeoff the existing page-scoped stats above already accept).
  const clientGroups = useMemo(() => {
    const map = new Map<string, ClientPackage[]>();
    for (const pkg of clientPkgs) {
      const list = map.get(pkg.clientId);
      if (list) list.push(pkg); else map.set(pkg.clientId, [pkg]);
    }
    return Array.from(map.values());
  }, [clientPkgs]);

  const toggleExpand = (clientId: string) => {
    setExpandedId(prev => (prev === clientId ? null : clientId));
    setActiveTab("");
  };

  const STAT_CARDS = [
    { label: "Total Packages",     value: total,        icon: <Package size={16} />,      variant: "purple"  as const },
    { label: "Active Packages",    value: activePkgs,   icon: <CheckCircle2 size={16} />, variant: "emerald" as const },
    { label: "Expired Packages",   value: expiredPkgs,  icon: <Clock size={16} />,        variant: "rose"    as const },
    { label: "Sessions Remaining", value: totalRem,     icon: <Target size={16} />,       variant: "indigo"  as const },
  ];

  const expandedGroup = expandedId ? clientGroups.find(g => g[0].clientId === expandedId) ?? null : null;

  return (
    <>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.headerTitle}>Client Packages</h2>
          <p className={styles.headerSubtitle}>Track and manage session-based service packages</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowChoice(true)}
            className={styles.btnPrimary}
          >
            + Create Package
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {STAT_CARDS.map(card => (
          <div key={card.label} className={`${styles.statCard} ${styles[`statCard--${card.variant}`]}`}>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>{card.label}</span>
              <div className={styles.statIcon}>{card.icon}</div>
            </div>
            <div className={styles.statValue}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><Search size={13} /></span>
          <input
            className={styles.searchInput}
            placeholder="Search by client or package name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
        <select className={styles.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="expiry">Expiring soon</option>
          <option value="amount">Highest amount</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className={styles.card}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><Loader2 size={36} strokeWidth={1.2} className={styles.spin} /></div>
            <div className={styles.emptyText}>Loading packages…</div>
          </div>
        </div>
      )}

      {/* Error */}
      {!isLoading && isError && (
        <div className={styles.card}>
          <div className={styles.empty}>
            <div className={styles.emptyText} style={{ color: "#dc2626" }}>Failed to load packages.</div>
            <button onClick={() => refetch()} className={styles.btnSecondary} style={{ marginTop: 10 }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Package list */}
      {!isLoading && !isError && (
        clientPkgs.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><Package size={36} strokeWidth={1.2} /></div>
              <div className={styles.emptyText}>
                {search || statusFilter !== "all"
                  ? "No packages match your filters."
                  : "No packages sold yet."}
              </div>
              {!search && statusFilter === "all" && (
                <span onClick={() => setShowChoice(true)} className={styles.emptyLink}>Create a package →</span>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.card} style={{ overflow: "hidden" }}>
            <table className={styles.table}>
              <thead>
                <tr>{["Client", "Packages"].map(h => <th key={h} className={styles.tableTh}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {clientGroups.map(group => {
                  const first   = group[0];
                  const isOpen  = expandedId === first.clientId;
                  const names   = group.map(p => p.packageName).join(", ");
                  return (
                    <tr
                      key={first.clientId}
                      onClick={() => toggleExpand(first.clientId)}
                      className={`${styles.tableRow} ${styles["tableRow--clickable"]} ${isOpen ? styles["tableRow--active"] : ""}`}
                    >
                      <td className={styles.tableTd}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>{first.clientName}</div>
                        {first.mobile && <div style={{ fontSize: 11, color: "#6b7280" }}>{first.mobile}</div>}
                      </td>
                      <td className={styles.tableTd}>
                        <span className={styles.badge} style={{ marginRight: 8 }}>{group.length} package{group.length !== 1 ? "s" : ""}</span>
                        <span
                          style={{
                            display: "inline-block", maxWidth: 280, verticalAlign: "middle",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            fontSize: 12, color: "#6b7280",
                          }}
                          title={names}
                        >
                          {names}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Pagination */}
      {!isLoading && !isError && clientPkgs.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          className="packages-pagination"
        />
      )}

      {/* Client detail — right-side sliding panel, one card per package */}
      {expandedGroup && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1050 }}
            onClick={() => toggleExpand(expandedGroup[0].clientId)}
          />
          <div
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0,
              width: "min(560px, 100vw)",
              background: "#f9fafb",
              zIndex: 1060,
              display: "flex", flexDirection: "column",
              boxShadow: "-10px 0 30px rgba(0,0,0,.15)",
              overflowY: "auto",
              overflowX: "hidden",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{expandedGroup[0].clientName}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{expandedGroup.length} package{expandedGroup.length !== 1 ? "s" : ""}</div>
              </div>
              <button
                onClick={() => toggleExpand(expandedGroup[0].clientId)}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {expandedGroup.map(pkg => {
              const expired       = daysUntil(pkg.expiryDate) < 0;
              const days          = daysUntil(pkg.expiryDate);
              const expiringSoon  = !expired && days <= 30;
              const currentTabId  = activeTab.startsWith(`${pkg.id}:`) ? activeTab.slice(pkg.id.length + 1) : (pkg.services[0]?.serviceId ?? "");
              const histSvc       = pkg.services.find(s => s.serviceId === currentTabId) ?? pkg.services[0];
              const expiryFmt     = pkg.expiryDate
                ? new Date(pkg.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "Never expires";

              return (
                <React.Fragment key={pkg.id}>

                  {/* Package detail card */}
                  <div className={styles.card}>
                    <div className={styles.cardHead}>
                      <div className={styles.cardTitle}>
                        {pkg.packageName}
                        <span className={styles.pkgMeta}>{pkg.id}</span>
                      </div>
                      <div className={styles.pkgHeaderRight}>
                        {expiringSoon && (
                          <span className={`${styles.badge} ${styles["badge--warning"]}`}>
                            <span className={styles.badgeDot} /> Expires in {days}d
                          </span>
                        )}
                        <span className={`${styles.badge} ${expired ? styles["badge--red"] : styles["badge--green"]}`}>
                          <span className={styles.badgeDot} /> {expired ? "EXPIRED" : pkg.status}
                        </span>
                        <span className={styles.pkgExpiry}>
                          Expires <strong className={styles.pkgExpiryValue}>{expiryFmt}</strong>
                        </span>
                      </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>{["Service","Total","Remaining","Progress","Amount"].map(h => <th key={h} className={styles.tableTh} style={{ padding: "10px 8px" }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {pkg.services.map(svc => {
                          const pct   = svc.totalSessions ? Math.round(svc.completedSessions / svc.totalSessions * 100) : 0;
                          const isSel = svc.serviceId === currentTabId;
                          return (
                            <tr
                              key={svc.serviceId}
                              onClick={() => setActiveTab(`${pkg.id}:${svc.serviceId}`)}
                              className={`${styles.tableRow} ${styles["tableRow--clickable"]} ${isSel ? styles["tableRow--active"] : ""}`}
                            >
                              <td className={styles.tableTd} style={{ fontWeight: 600, padding: "10px 8px" }}>{svc.serviceName}</td>
                              <td className={styles.tableTd} style={{ padding: "10px 8px" }}>{svc.totalSessions}</td>
                              <td className={styles.tableTd} style={{ fontWeight: 700, color: "#7c3aed", padding: "10px 8px" }}>{svc.remainingSessions}</td>
                              <td className={styles.tableTd} style={{ padding: "10px 8px" }}>
                                <div className={styles.progressWrap}>
                                  <div className={styles.progressTrack} style={{ flex: "0 0 40px" }}>
                                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className={styles.progressLabel}>{pct}%</span>
                                </div>
                              </td>
                              <td className={styles.tableTd} style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                                {svc.price != null && !isNaN(Number(svc.price))
                                  ? formatAmount(Number(svc.price))
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>

                    <div className={styles.paymentGrid}>
                      {[
                        ["Total amount",  formatAmount(pkg.totalAmount)],
                        ["Paid amount",   formatAmount(pkg.paidAmount)],
                        ["Pending",       formatAmount(pkg.pendingAmount)],
                        ["Mode",          pkg.paymentMethod],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <div className={styles.paymentItemLabel}>{l}</div>
                          <div className={styles.paymentItemValue}>{v}</div>
                        </div>
                      ))}
                      <div>
                        <div className={styles.paymentItemLabel}>Status</div>
                        <span className={`${styles.badge} ${pkg.paymentStatus === "PAID" ? styles["badge--green"] : styles["badge--red"]}`}>
                          {pkg.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Session timeline */}
                  <div className={styles.card}>
                    <div className={styles.cardHead}>
                      <div className={styles.cardTitle}><History size={14} /> Session history</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {pkg.services.map(s => (
                          <button
                            key={s.serviceId}
                            onClick={() => setActiveTab(`${pkg.id}:${s.serviceId}`)}
                            className={`${styles.btnTab} ${s.serviceId === currentTabId ? styles["btnTab--active"] : ""}`}
                          >
                            {s.serviceName.split(" ").slice(0, 2).join(" ")}
                            <span style={{ marginLeft: 4, opacity: .65, fontSize: 10 }}>{s.completedSessions}/{s.totalSessions}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {histSvc && histSvc.sessionHistory.length > 0 ? (
                      <div className={styles.timeline}>
                        {[...histSvc.sessionHistory].reverse().map(h => (
                          <div key={h.sessionNo} className={styles.timelineItem}>
                            <div className={styles.timelineDot}>{h.sessionNo}</div>
                            <div className={styles.timelineContent}>
                              <div className={styles.timelineDate}>{h.date}</div>
                              <div className={styles.timelineMeta}>
                                Staff: <strong>{h.staff}</strong>
                                <span style={{ marginLeft: 10 }}>
                                  <span className={`${styles.badge} ${styles["badge--green"]}`}>{h.status}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.empty} style={{ padding: "24px 20px" }}>
                        <div className={styles.emptyIcon}><History size={28} strokeWidth={1.2} /></div>
                        <div className={styles.emptyText} style={{ fontSize: 13 }}>No sessions completed yet.</div>
                      </div>
                    )}
                  </div>

                </React.Fragment>
              );
            })}
          </div>
        </>
      )}

      {/* ── Choice modal ─────────────────────────────────────────────────────── */}
      {showChoice && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1060 }}
            onClick={() => setShowChoice(false)}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "#fff", borderRadius: 20, width: "min(540px,92vw)",
            zIndex: 1070, boxShadow: "0 24px 60px rgba(0,0,0,.2)",
            overflow: "hidden",
          }}>
            {/* Modal header */}
            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f1f3" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-.02em" }}>Create Package</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                    Choose how you'd like to create this package for <strong style={{ color: "#111827" }}>
                      {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim() : "client"}
                    </strong>
                  </div>
                </div>
                <button
                  onClick={() => setShowChoice(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Two options */}
            <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Option 1 — From Template */}
              <button
                onClick={() => { setShowChoice(false); setShowTmplPicker(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "18px 20px", border: "2px solid #e5e7eb", borderRadius: 14,
                  background: "#fff", cursor: "pointer", textAlign: "left",
                  transition: "all .15s", fontFamily: "inherit", width: "100%",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.background = "#faf5ff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Layers size={24} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                    Buy Existing Package
                    {templates.length > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: "#f5f3ff", color: "#7c3aed", borderRadius: 20, padding: "2px 8px" }}>
                        {templates.length} template{templates.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Choose from pre-built package templates — auto-fills all services, pricing & expiry
                  </div>
                </div>
                <ChevronRight size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
              </button>

              {/* Option 2 — Custom */}
              <button
                onClick={() => { setShowChoice(false); onCreateNew(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "18px 20px", border: "2px solid #e5e7eb", borderRadius: 14,
                  background: "#fff", cursor: "pointer", textAlign: "left",
                  transition: "all .15s", fontFamily: "inherit", width: "100%",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#111827"; (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#374151,#111827)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PenLine size={22} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Create Custom Package</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Build a package from scratch — choose any services, set your own pricing and expiry
                  </div>
                </div>
                <ChevronRight size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Template picker modal ─────────────────────────────────────────────── */}
      {showTmplPicker && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1060 }}
            onClick={() => setShowTmplPicker(false)}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "#fff", borderRadius: 20, width: "min(580px,92vw)", maxHeight: "80vh",
            display: "flex", flexDirection: "column",
            zIndex: 1070, boxShadow: "0 24px 60px rgba(0,0,0,.2)",
          }}>
            <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid #f0f1f3", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-.02em" }}>Choose a Template</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>All form fields will be pre-filled from the selected template</div>
                </div>
                <button
                  onClick={() => setShowTmplPicker(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}>
                  <Layers size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>No templates yet</div>
                  <div style={{ fontSize: 13 }}>Go to the <strong>Templates</strong> tab to create reusable package templates.</div>
                </div>
              ) : templates.map((t, i) => {
                const GRADIENTS = [
                  "linear-gradient(135deg,#667eea,#764ba2)",
                  "linear-gradient(135deg,#f093fb,#f5576c)",
                  "linear-gradient(135deg,#4facfe,#00f2fe)",
                  "linear-gradient(135deg,#43e97b,#38f9d7)",
                  "linear-gradient(135deg,#fa709a,#fee140)",
                  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
                ];
                const grad = GRADIENTS[i % GRADIENTS.length];
                const gstAmt = (t.basePrice - t.discount) * t.gstPercentage / 100;
                const total  = t.basePrice - t.discount + gstAmt;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setShowTmplPicker(false); onCreateFromTemplate(t); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: 14,
                      background: "#fff", cursor: "pointer", textAlign: "left",
                      transition: "all .15s", fontFamily: "inherit", width: "100%",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.background = "#faf5ff"; (e.currentTarget as HTMLButtonElement).style.transform = "translateX(3px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.transform = "translateX(0)"; }}
                  >
                    {/* Color badge */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Sparkles size={20} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{t.name}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {t.services.slice(0, 3).map(s => (
                          <span key={s.id} style={{ fontSize: 11, fontWeight: 500, background: "#f5f3ff", color: "#7c3aed", borderRadius: 20, padding: "2px 8px" }}>
                            {s.serviceName} ×{s.totalSessions}
                          </span>
                        ))}
                        {t.services.length > 3 && (
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>+{t.services.length - 3} more</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#7c3aed" }}>{formatAmount(total)}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {t.neverExpires ? "Never expires" : `${t.expiryMonths}mo`}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default PackageDashboard;
