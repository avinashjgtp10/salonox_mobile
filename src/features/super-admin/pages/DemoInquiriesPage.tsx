import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import Pagination from "../components/Pagination";
import Modal from "../../../components/ui/Modal";
import {
  fetchSuperAdminDemoRequestsThunk,
  setDemoRequestStatusThunk,
} from "../../../middleware/superAdmin/superAdmin.thunk";
import type { SuperAdminDemoRequest } from "../../../store/superAdminSlice";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:         { bg: "#eff6ff", text: "#3b82f6" },
  contacted:   { bg: "#fef3c7", text: "#d97706" },
  converted:   { bg: "#f0fdf4", text: "#16a34a" },
  closed:      { bg: "#f8fafc", text: "#64748b" },
  lost:        { bg: "#fef2f2", text: "#dc2626" },
  unqualified: { bg: "#f1f5f9", text: "#475569" },
};

const STATUSES = ["new", "contacted", "converted", "closed", "lost", "unqualified"];

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.new;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b", fontSize: 12.5, fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#0f172a", fontSize: 13.5, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function DemoRequestDetailModal({
  request, onClose, onStatusChange, changingStatus,
}: {
  request: SuperAdminDemoRequest;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  changingStatus: boolean;
}) {
  const dash = <span style={{ color: "#cbd5e1" }}>—</span>;
  return (
    <Modal show onClose={onClose} title="Demo Request Details" size="md">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{request.name}</span>
        <StatusBadge status={request.status} />
      </div>
      <div>
        <DetailRow label="Email" value={request.email} />
        <DetailRow label="Phone" value={request.phone || dash} />
        <DetailRow label="Salon Name" value={request.salon_name || dash} />
        <DetailRow label="City" value={request.city || dash} />
        <DetailRow label="Locations" value={request.locations_count || dash} />
        <DetailRow label="Received" value={request.created_at ? new Date(request.created_at).toLocaleString("en-IN") : dash} />
        <DetailRow label="Last Updated" value={request.updated_at ? new Date(request.updated_at).toLocaleString("en-IN") : dash} />
      </div>
      <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>Status</span>
        <select
          value={request.status}
          disabled={changingStatus}
          onChange={(e) => onStatusChange(request.id, e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: changingStatus ? "not-allowed" : "pointer", appearance: "none" }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>
    </Modal>
  );
}

export default function DemoInquiriesPage() {
  const dispatch = useAppDispatch();
  const { demoRequests, loading } = useAppSelector((s) => s.superAdmin);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [actionId, setActionId] = useState<string | null>(null);
  // Row-click detail modal — stores the selected request's id (not the
  // object itself) so the modal always reflects the latest data for that
  // row from the store, even after a status change updates it in place.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRequest = selectedId ? demoRequests.find((r) => r.id === selectedId) ?? null : null;

  const load = useCallback(() => {
    dispatch(fetchSuperAdminDemoRequestsThunk({ search: search || undefined }));
    setPage(1);
  }, [dispatch, search]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id: string, status: string) {
    setActionId(id);
    await dispatch(setDemoRequestStatusThunk({ id, status }));
    setActionId(null);
  }

  const filtered = statusFilter ? demoRequests.filter((r) => r.status === statusFilter) : demoRequests;

  const inputStyle: React.CSSProperties = {
    padding: "9px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0",
    background: "#fff", color: "#64748b", fontSize: 13, outline: "none",
    appearance: "none", cursor: "pointer",
  };

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Demo Inquiries</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{filtered.length} request{filtered.length !== 1 ? "s" : ""} from the "Schedule a Free Demo" form</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, salon, city…"
              style={{ padding: "9px 14px 9px 34px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, outline: "none", width: 260, transition: "border-color 0.15s" }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Name", "Contact", "Salon", "City", "Locations", "Status", "Received", "Actions"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.demoRequests ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sa-demo-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No demo requests found</td></tr>
            ) : (
              filtered.slice((page - 1) * perPage, page * perPage).map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.1s", cursor: "pointer" }}
                  onClick={() => setSelectedId(r.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700, fontSize: 13.5 }}>{r.name}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ color: "#374151", fontSize: 13 }}>{r.email}</div>
                    {r.phone && <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{r.phone}</div>}
                  </td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{r.salon_name || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{r.city || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{r.locations_count || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px" }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12 }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
                    <select
                      value={r.status}
                      disabled={actionId === r.id}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      style={{ padding: "5px 9px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: actionId === r.id ? "not-allowed" : "pointer", appearance: "none" }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          total={filtered.length} page={page} perPage={perPage}
          onPageChange={setPage} onPerPageChange={setPerPage}
          itemLabel="requests"
        />
      </div>
      <style>{`@keyframes sa-demo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {selectedRequest && (
        <DemoRequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
          changingStatus={actionId === selectedRequest.id}
        />
      )}
    </div>
  );
}
