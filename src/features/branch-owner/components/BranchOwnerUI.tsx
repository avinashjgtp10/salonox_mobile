import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search } from "react-bootstrap-icons";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import { Pagination as UIPagination } from "../../../components/ui/Pagination";

// Thin Branch-Owner-flavored wrappers around the app's real shared
// src/components/ui kit — not a parallel design system. Every one of these
// just forwards to the real component with sensible defaults for this
// portal's cards, so every page here (Inventory, Finance, Staff Performance)
// looks like the rest of the app.

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  fontSize: 13.5,
  background: "#fff",
  color: "#0f172a",
  fontFamily: "inherit",
  outline: "none",
};

export const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  display: "block",
  marginBottom: 7,
};

export function SectionCard({ title, subtitle, action, children, noPadding }: {
  title: string; subtitle?: string; action?: ReactNode; children: ReactNode; noPadding?: boolean;
}) {
  return (
    <Card title={title} subtitle={subtitle} headerActions={action} noPadding={noPadding} shadow="sm">
      {children}
    </Card>
  );
}

// Plain white KPI card — same border/shadow-free treatment as the Reports
// page's own cards (see ReportsPage.scss's .rp-fav-card), not StatCard's
// colored gradient variants.
export function StatTile({ icon, label: l, value, sub }: {
  icon: ReactNode; label: string; value: string | number; sub?: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f3f4f6", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#6b7280", fontSize: 11.5, fontWeight: 500 }}>{l}</div>
        <div style={{ color: "#111827", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{value}</div>
        {sub && <div style={{ color: "#9ca3af", fontSize: 10.5, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

const STATUS_VARIANT: Record<string, "warning" | "success" | "secondary" | "danger" | "info" | "primary"> = {
  pending: "warning",
  completed: "success",
  cancelled: "secondary",
  active: "success",
  inactive: "secondary",
  unsettled: "warning",
  settled: "success",
  paid: "success",
  failed: "danger",
  partial: "info",
};

// Super Admin's soft-pastel pill look (e.g. SalonsPage.tsx's Badge/status
// cells) instead of Bootstrap's solid-color-plus-white-text badge — same
// variant keys as STATUS_VARIANT above so callers don't need to change.
const SOFT_VARIANT_COLORS: Record<string, { bg: string; text: string }> = {
  warning: { bg: "#fffbeb", text: "#d97706" },
  success: { bg: "#f0fdf4", text: "#16a34a" },
  secondary: { bg: "#f8fafc", text: "#64748b" },
  danger: { bg: "#fef2f2", text: "#dc2626" },
  info: { bg: "#eff6ff", text: "#3b82f6" },
  primary: { bg: "#eef2ff", text: "#6366f1" },
};

export function SoftBadge({ variant, children }: { variant: keyof typeof SOFT_VARIANT_COLORS; children: ReactNode }) {
  const c = SOFT_VARIANT_COLORS[variant] ?? SOFT_VARIANT_COLORS.secondary;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <SoftBadge variant={STATUS_VARIANT[status] ?? "secondary"}>{status}</SoftBadge>;
}

// ── Three-dot row actions menu ───────────────────────────────────────────────
// Same Super Admin pattern (SalonsPage.tsx's ActionsMenu) — a single button
// that opens a portal-rendered dropdown, instead of a row of separate
// outline buttons crowding the Actions column.
export type BoMenuAction = { label: string; color: string; bg: string; onClick: () => void; disabled?: boolean };

export function BoActionsMenu({ actions, rowId, openId, setOpenId }: {
  actions: BoMenuAction[]; rowId: string; openId: string | null; setOpenId: (id: string | null) => void;
}) {
  const open = openId === rowId;
  const [hov, setHov] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpenId(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, setOpenId]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.right - 170 });
    }
    setOpenId(open ? null : rowId);
  }

  return (
    <div style={{ display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={toggle}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        title="Actions"
        style={{ width: 30, height: 30, borderRadius: 7, border: "1.5px solid #e2e8f0", background: hov || open ? "#f8fafc" : "#fff", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
      </button>
      {open && coords && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 10000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 170, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
          {actions.map((a, i) => (
            <button key={i}
              onClick={() => { setOpenId(null); a.onClick(); }}
              disabled={a.disabled}
              style={{ display: "flex", alignItems: "center", padding: "8px 10px", borderRadius: 7, border: "none", background: "transparent", color: a.color, fontSize: 12.5, fontWeight: 600, cursor: a.disabled ? "not-allowed" : "pointer", opacity: a.disabled ? 0.5 : 1, textAlign: "left", transition: "background 0.12s" }}
              onMouseEnter={(e) => !a.disabled && (e.currentTarget.style.background = a.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {a.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Bespoke table (Super Admin look) ─────────────────────────────────────────
// Same columns/data/loading/emptyMessage/onRowClick contract as
// components/ui's Table, so any page can swap `Table` for `BoTable` with no
// other JSX changes — just rendered with Super Admin's own inline styles
// (header bg #f8fafc uppercase, plain white rows + #f8fafc hover, no zebra
// stripe) instead of Bootstrap's table classes, which is the look
// Bootstrap's utility-class table can't hit without fighting its own CSS.
export interface BoColumn<T> {
  header: ReactNode;
  key: string;
  render?: (item: T) => ReactNode;
  width?: string | number;
  align?: "left" | "center" | "right";
}

export function BoTable<T extends { id?: string | number }>({
  columns, data, loading = false, emptyMessage, onRowClick,
}: {
  columns: BoColumn<T>[]; data: T[]; loading?: boolean; emptyMessage?: ReactNode; onRowClick?: (item: T) => void;
}) {
  return (
    <div className="bo-table-scroll" style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: Math.max(700, columns.length * 130) }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            {columns.map((col, i) => (
              <th key={i} style={{ padding: "11px 16px", textAlign: col.align || "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [...Array(6)].map((_, i) => (
              <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                {columns.map((_, j) => (
                  <td key={j} style={{ padding: "14px 16px" }}>
                    <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bo-table-shimmer 1.4s infinite" }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>
              {emptyMessage ?? "No results found"}
            </td></tr>
          ) : (
            data.map((item, i) => (
              <tr key={item.id ?? i} style={{ borderTop: "1px solid #f1f5f9", cursor: onRowClick ? "pointer" : "default" }}
                onClick={() => onRowClick?.(item)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                {columns.map((col, j) => (
                  <td key={j} style={{ padding: "13px 16px", textAlign: col.align || "left", color: "#374151", width: col.width }}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <style>{`@keyframes bo-table-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

export function BoEmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return <EmptyState icon={icon} title={text} />;
}

// One reusable search box — icon-left input, used by every Branch Owner
// list page (Salons, Payments, Staff Performance, Staff & Permissions) so
// the search affordance stays pixel-identical instead of four inline copies.
export function BoSearchInput({ value, onChange, placeholder, maxWidth = 320 }: {
  value: string; onChange: (value: string) => void; placeholder: string; maxWidth?: number;
}) {
  return (
    <div style={{ position: "relative", flex: "1 1 220px", maxWidth }}>
      <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }}
      />
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <Button variant="primary" onClick={onClick} disabled={disabled} loading={disabled}>{children}</Button>;
}

export function GhostButton({ children, onClick, disabled, tone = "neutral" }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "neutral" | "danger" | "success";
}) {
  const variant = tone === "danger" ? "outline-danger" : tone === "success" ? "outline-success" : "outline-secondary";
  return <Button variant={variant} size="sm" onClick={onClick} disabled={disabled}>{children}</Button>;
}

// ── Pagination ────────────────────────────────────────────────────────────────
// One reusable client-side pager, built on the real src/components/ui
// Pagination — each block owns its own state via usePagination(items) and
// renders <BoPagination {...pager} />.

export function usePagination<T>(items: T[], initialPageSize = 5) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );
  return {
    currentPage: safePage,
    pageSize,
    totalItems: items.length,
    pageItems,
    onPageChange: setCurrentPage,
    onPageSizeChange: (size: number) => { setPageSize(size); setCurrentPage(1); },
  };
}

export function BoPagination(props: ReturnType<typeof usePagination<unknown>>) {
  if (props.totalItems === 0) return null;
  return (
    <div style={{ padding: "8px 16px 14px" }}>
      <UIPagination
        currentPage={props.currentPage}
        pageSize={props.pageSize}
        totalItems={props.totalItems}
        onPageChange={props.onPageChange}
        onPageSizeChange={props.onPageSizeChange}
        pageSizeOptions={[5, 10, 20]}
      />
    </div>
  );
}
