import { useState, useMemo, type ReactNode } from "react";
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

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "secondary"} style={{ textTransform: "capitalize" }}>{status}</Badge>;
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
