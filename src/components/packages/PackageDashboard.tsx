// src/components/packages/PackageDashboard.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Package, CheckCircle2, Clock, Target, Search, History, X, Loader2, Sparkles, PenLine, ChevronRight, Layers, MoreVertical, Trash2, Minus, Plus } from "lucide-react";
import styles from "./packages.module.scss";
import { Pagination } from "../ui/Pagination";
import type { PackageTemplate, ClientPackage } from "../../services/api/endpoints/packages.endpoints";
import {
  useListPackageTemplatesQuery,
  useUpdateClientPackageMutation,
  useDeleteClientPackageMutation,
} from "../../services/api/endpoints/packages.endpoints";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import { useGetClientPackages } from "../../hooks/packages/usePackages";
import { useCurrency } from "../../hooks/useCurrency";
import { getPackageServiceDisplayStatus, type PackageServiceDisplayStatus } from "../../features/bookings/utils/packageServiceStatus";
import { maskMobile } from "../../utils/maskMobile";
import { usePermissions } from "../../hooks/usePermissions";
import { useAppDispatch } from "../../hooks/useAppRedux";
import { showPermissionDenied } from "../../store/permissionDialogSlice";

const friendlyPermissionDenied = (permKey: string) =>
  `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`;

const SCHEDULE_STATUS_BADGE: Record<PackageServiceDisplayStatus, string> = {
  "Not Scheduled": "",
  "Scheduled":      "badge--purple",
  "Completed":      "badge--green",
  "Cancelled":      "badge--red",
  "No Show":        "badge--red",
  "Expired":        "badge--warning",
};

interface Props {
  selectedClient: ClientSearchResult | null;
  onClientChange: (client: ClientSearchResult | null) => void;
  onCreateNew: () => void;
  onCreateFromTemplate: (template: PackageTemplate) => void;
}

const PAGE_SIZE = 10;

function daysUntil(dateStr: string | null) {
  if (dateStr === null) return Infinity;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function formatDMY(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

const PackageDashboard: React.FC<Props> = ({
  selectedClient, onCreateNew, onCreateFromTemplate,
}) => {
  const { formatAmount } = useCurrency();
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(friendlyPermissionDenied(permKey)));
  const [activeTab,       setActiveTab]       = useState("");

  // List is salon-wide now — no client selection gates it. `search` stays
  // controlled for instant typing; the query only refetches off the
  // debounced copy so it doesn't flash loading on every keystroke (same fix
  // as MembershipsListPage.tsx).
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

  // Per-row "⋮" actions menu (Edit / Delete) — separate from expandedId
  // (the read-only detail panel a row-click opens), so opening the actions
  // menu never also opens/closes that panel.
  const [actionsMenuId,   setActionsMenuId]   = useState<string | null>(null);
  const [editingPkg,      setEditingPkg]      = useState<ClientPackage | null>(null);
  const [sessionEdits,    setSessionEdits]    = useState<Record<string, number>>({});
  const [savingEdit,      setSavingEdit]      = useState(false);
  const [deletingId,      setDeletingId]      = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  const { data: templates = [] } = useListPackageTemplatesQuery();

  const { packages: allPkgs, total, isLoading, isError, refetch } =
    useGetClientPackages({ search: debouncedSearch.trim() || undefined, page, limit: pageSize });

  const [updateClientPackage] = useUpdateClientPackageMutation();
  const [deleteClientPackage] = useDeleteClientPackageMutation();

  // Close the actions menu on any outside click — the actions cell below
  // stops click propagation for anything inside it (button + menu), so this
  // only ever fires for genuine outside clicks. Same pattern used for
  // ServiceCard's/ClientsListPage's own per-row menus.
  useEffect(() => {
    if (!actionsMenuId) return;
    const handler = () => setActionsMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [actionsMenuId]);

  function openEditSessions(pkg: ClientPackage) {
    if (!can("edit_package")) { denyPerm("edit_package"); return; }
    setSessionEdits(Object.fromEntries(pkg.services.map(s => [s.serviceId, s.totalSessions])));
    setEditingPkg(pkg);
  }

  async function handleSaveSessionEdits() {
    if (!editingPkg) return;
    if (!can("edit_package")) { denyPerm("edit_package"); setEditingPkg(null); return; }
    setSavingEdit(true);
    try {
      await updateClientPackage({
        id: editingPkg.id,
        data: {
          services: editingPkg.services.map(svc => ({
            serviceId: svc.serviceId,
            totalSessions: sessionEdits[svc.serviceId] ?? svc.totalSessions,
          })),
        },
      }).unwrap();
      setEditingPkg(null);
    } catch {
      // Mutation error is surfaced via its own isError state if needed later —
      // keeping this in line with how Templates' delete already handles it.
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePackage(pkg: ClientPackage) {
    if (!can("delete_package")) { denyPerm("delete_package"); return; }
    if (!confirm(`Delete ${pkg.packageName} for ${pkg.clientName}? This cannot be undone.`)) return;
    setDeletingId(pkg.id);
    try {
      await deleteClientPackage(pkg.id).unwrap();
      if (expandedId === pkg.id) setExpandedId(null);
    } finally {
      setDeletingId(null);
    }
  }

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

  // One row per PACKAGE, not per client — a client with several packages
  // simply appears several times, once per package (see the table below),
  // so each record can show its own price/sessions/dates/status alongside
  // the client's name.
  const toggleExpand = (packageId: string) => {
    setExpandedId(prev => (prev === packageId ? null : packageId));
    setActiveTab("");
  };

  const STAT_CARDS = [
    { label: "Total Packages",     value: total,        icon: <Package size={16} />,      variant: "purple"  as const },
    { label: "Active Packages",    value: activePkgs,   icon: <CheckCircle2 size={16} />, variant: "emerald" as const },
    { label: "Expired Packages",   value: expiredPkgs,  icon: <Clock size={16} />,        variant: "rose"    as const },
    { label: "Sessions Remaining", value: totalRem,     icon: <Target size={16} />,       variant: "indigo"  as const },
  ];

  const expandedPkg = expandedId ? allPkgs.find(p => p.id === expandedId) ?? null : null;

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
            onClick={() => {
              if (!can("create_package")) { denyPerm("create_package"); return; }
              setShowChoice(true);
            }}
            className={styles.btnPrimary}
            style={!can("create_package") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
                <span
                  onClick={() => {
                    if (!can("create_package")) { denyPerm("create_package"); return; }
                    setShowChoice(true);
                  }}
                  className={styles.emptyLink}
                  style={!can("create_package") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                >
                  Create a package →
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.card} style={{ overflow: "hidden", marginBottom: 0, borderRadius: "12px 12px 0 0" }}>
            <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {["Client", "Package Name", "Package Price", "Sessions Used", "Sessions Remaining", "Purchase Date", "Expiry Date", "Status", ""].map(h => (
                    <th key={h || "actions"} className={styles.tableTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientPkgs.map(pkg => {
                  const expired    = daysUntil(pkg.expiryDate) < 0;
                  const usedTotal  = pkg.services.reduce((s, sv) => s + sv.completedSessions, 0);
                  const remTotal   = pkg.services.reduce((s, sv) => s + sv.remainingSessions, 0);
                  const isOpen     = expandedId === pkg.id;
                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => toggleExpand(pkg.id)}
                      className={`${styles.tableRow} ${styles["tableRow--clickable"]} ${isOpen ? styles["tableRow--active"] : ""}`}
                    >
                      <td className={styles.tableTd}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>{pkg.clientName}</div>
                        {pkg.mobile && <div style={{ fontSize: 11, color: "#6b7280" }}>{maskMobile(pkg.mobile)}</div>}
                      </td>
                      <td className={styles.tableTd} style={{ fontWeight: 600, color: "#111827" }}>{pkg.packageName}</td>
                      <td className={styles.tableTd} style={{ whiteSpace: "nowrap" }}>{formatAmount(pkg.totalAmount)}</td>
                      <td className={styles.tableTd}>{usedTotal}</td>
                      <td className={styles.tableTd} style={{ fontWeight: 700, color: "#7c3aed" }}>{remTotal}</td>
                      <td className={styles.tableTd} style={{ whiteSpace: "nowrap" }}>{formatDMY(pkg.createdDate)}</td>
                      <td className={styles.tableTd} style={{ whiteSpace: "nowrap" }}>{pkg.expiryDate ? formatDMY(pkg.expiryDate) : "Never expires"}</td>
                      <td className={styles.tableTd}>
                        <span className={`${styles.badge} ${expired ? styles["badge--red"] : styles["badge--green"]}`}>
                          <span className={styles.badgeDot} /> {expired ? "Expired" : pkg.status}
                        </span>
                      </td>
                      <td className={styles.tableTd} onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
                        <button
                          className={styles.kebabBtn}
                          onClick={() => setActionsMenuId(prev => (prev === pkg.id ? null : pkg.id))}
                          title="Package actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {actionsMenuId === pkg.id && (
                          <ul className={styles.actionsMenu}>
                            <li>
                              <button
                                className={styles.actionsItem}
                                style={!can("edit_package") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                onClick={() => { setActionsMenuId(null); openEditSessions(pkg); }}
                              >
                                <PenLine size={13} /> Edit Package
                              </button>
                            </li>
                            <li>
                              <button
                                className={`${styles.actionsItem} ${styles["actionsItem--danger"]}`}
                                disabled={deletingId === pkg.id}
                                style={!can("delete_package") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                onClick={() => { setActionsMenuId(null); handleDeletePackage(pkg); }}
                              >
                                <Trash2 size={13} /> {deletingId === pkg.id ? "Deleting…" : "Delete"}
                              </button>
                            </li>
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
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

      {/* Package detail — right-side sliding panel for the single expanded package */}
      {expandedPkg && (() => {
        const pkg            = expandedPkg;
        const expired        = daysUntil(pkg.expiryDate) < 0;
        const days           = daysUntil(pkg.expiryDate);
        const expiringSoon   = !expired && days <= 30;
        const currentTabId   = activeTab.startsWith(`${pkg.id}:`) ? activeTab.slice(pkg.id.length + 1) : (pkg.services[0]?.serviceId ?? "");
        const histSvc        = pkg.services.find(s => s.serviceId === currentTabId) ?? pkg.services[0];
        const expiryFmt      = pkg.expiryDate
          ? new Date(pkg.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "Never expires";

        return (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1050 }}
            onClick={() => toggleExpand(pkg.id)}
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
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{pkg.clientName}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{pkg.packageName}</div>
              </div>
              <button
                onClick={() => toggleExpand(pkg.id)}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

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
                        <tr>{["Service","Total","Remaining","Progress","Amount","Status"].map(h => <th key={h} className={styles.tableTh} style={{ padding: "10px 8px" }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {pkg.services.map(svc => {
                          const pct   = svc.totalSessions ? Math.round(svc.completedSessions / svc.totalSessions * 100) : 0;
                          const isSel = svc.serviceId === currentTabId;
                          const schedInfo = getPackageServiceDisplayStatus(svc, pkg.expiryDate);
                          const badgeMod  = SCHEDULE_STATUS_BADGE[schedInfo.status];
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
                              <td className={styles.tableTd} style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                                <span className={`${styles.badge} ${badgeMod ? styles[badgeMod] : ""}`} title={schedInfo.scheduledAt ? `${new Date(schedInfo.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}${schedInfo.staffName ? ` · ${schedInfo.staffName}` : ""}` : undefined}>
                                  <span className={styles.badgeDot} /> {schedInfo.status}
                                </span>
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
          </div>
        </>
        );
      })()}

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

      {/* ── Edit Package modal — increase/decrease remaining sessions per
          service. A session already completed can't be un-completed, so each
          stepper is floored at that service's own completedSessions. ──────── */}
      {editingPkg && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1060 }}
            onClick={() => setEditingPkg(null)}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "#fff", borderRadius: 20, width: "min(480px,92vw)", maxHeight: "80vh",
            display: "flex", flexDirection: "column",
            zIndex: 1070, boxShadow: "0 24px 60px rgba(0,0,0,.2)",
          }}>
            <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid #f0f1f3", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-.02em" }}>Edit Package</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                    {editingPkg.packageName} — adjust total sessions per service
                  </div>
                </div>
                <button
                  onClick={() => setEditingPkg(null)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {editingPkg.services.map(svc => {
                const value = sessionEdits[svc.serviceId] ?? svc.totalSessions;
                const floor = Math.max(svc.completedSessions, 1);
                return (
                  <div key={svc.serviceId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "#111827" }}>{svc.serviceName}</div>
                      <div style={{ fontSize: 11.5, color: "#6b7280" }}>{svc.completedSessions} session{svc.completedSessions !== 1 ? "s" : ""} already completed</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <button
                        type="button"
                        disabled={value <= floor}
                        onClick={() => setSessionEdits(prev => ({ ...prev, [svc.serviceId]: Math.max(floor, value - 1) }))}
                        style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: value <= floor ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: value <= floor ? "#d1d5db" : "#374151" }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ minWidth: 26, textAlign: "center", fontWeight: 700, fontSize: 14, color: "#111827" }}>{value}</span>
                      <button
                        type="button"
                        onClick={() => setSessionEdits(prev => ({ ...prev, [svc.serviceId]: value + 1 }))}
                        style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f1f3", flexShrink: 0, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setEditingPkg(null)}
                disabled={savingEdit}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSessionEdits}
                disabled={savingEdit}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: savingEdit ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: savingEdit ? 0.6 : 1 }}
              >
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default PackageDashboard;
