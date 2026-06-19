import { useState, useRef, useEffect, useCallback } from "react";
import { Search, BoxSeam, X, PencilSquare, CheckLg, XLg, Trash } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { Button, Card, Pagination, Loader } from "../../../components/ui";
import {
  useListClientPackagesQuery,
  useUpdateClientPackageMutation,
  useDeleteClientPackageMutation,
} from "../../../services/api/endpoints/packages.endpoints";
import type {
  ClientPackage,
  UpdateClientPackageDTO,
} from "../../../services/api/endpoints/packages.endpoints";
import "../styles/MembershipsPage.scss";

const STATUS_OPTIONS = ["All", "Active", "Completed", "Expired"];
const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Bank Transfer", "Online", "Other"];

function statusBadgeClass(status: string) {
  const s = status?.toLowerCase();
  if (s === "active")    return "badge-active";
  if (s === "completed") return "badge-completed";
  if (s === "expired")   return "badge-expired";
  return "badge-inactive";
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  if (dateStr === "2099-12-31") return "Never expires";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Edit state types ─────────────────────────────────────────────────────────

interface EditServiceRow {
  serviceId:     string;
  serviceName:   string;
  totalSessions: string;
  price:         string;
}

interface EditState {
  packageName:   string;
  expiryDate:    string;
  neverExpires:  boolean;
  paymentMethod: string;
  basePrice:     string;
  gstPercentage: string;
  discount:      string;
  services:      EditServiceRow[];
}

function toEditState(pkg: ClientPackage): EditState {
  return {
    packageName:   pkg.packageName ?? "",
    expiryDate:    pkg.expiryDate === "2099-12-31" ? "" : (pkg.expiryDate ?? ""),
    neverExpires:  !pkg.expiryDate || pkg.expiryDate === "2099-12-31",
    paymentMethod: pkg.paymentMethod ?? "Cash",
    basePrice:     String(pkg.basePrice ?? 0),
    gstPercentage: String(pkg.gstPercentage ?? 0),
    discount:      String(pkg.discount ?? 0),
    services: (pkg.services ?? []).map(s => ({
      serviceId:     s.serviceId,
      serviceName:   s.serviceName,
      totalSessions: String(s.totalSessions),
      price:         String(s.price),
    })),
  };
}

// ─── View panel content ───────────────────────────────────────────────────────

function ViewPanel({ pkg }: { pkg: ClientPackage }) {
  return (
    <div>
      <div className="pkg-sold-panel__hero">
        <div className="pkg-sold-panel__hero-name">{pkg.packageName}</div>
        <span className={`memberships-status-badge ${statusBadgeClass(pkg.status)}`}>{pkg.status}</span>
      </div>

      <div className="pkg-sold-panel__section">
        <div className="pkg-sold-panel__section-title">Client</div>
        <div className="pkg-sold-panel__row">
          <span className="pkg-sold-panel__label">Name</span>
          <span className="pkg-sold-panel__value">{pkg.clientName}</span>
        </div>
        {pkg.mobile && (
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">Mobile</span>
            <span className="pkg-sold-panel__value">{pkg.mobile}</span>
          </div>
        )}
        {pkg.email && (
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">Email</span>
            <span className="pkg-sold-panel__value">{pkg.email}</span>
          </div>
        )}
      </div>

      <div className="pkg-sold-panel__section">
        <div className="pkg-sold-panel__section-title">Details</div>
        <div className="pkg-sold-panel__row">
          <span className="pkg-sold-panel__label">Created</span>
          <span className="pkg-sold-panel__value">{formatDate(pkg.createdDate)}</span>
        </div>
        <div className="pkg-sold-panel__row">
          <span className="pkg-sold-panel__label">Expiry</span>
          <span className="pkg-sold-panel__value">{formatDate(pkg.expiryDate)}</span>
        </div>
        <div className="pkg-sold-panel__row">
          <span className="pkg-sold-panel__label">Payment</span>
          <span className="pkg-sold-panel__value" style={{ textTransform: "capitalize" }}>
            {pkg.paymentMethod?.replace("_", " ")}
          </span>
        </div>
        <div className="pkg-sold-panel__row">
          <span className="pkg-sold-panel__label">Pay status</span>
          <span className="pkg-sold-panel__value">{pkg.paymentStatus}</span>
        </div>
      </div>

      <div className="pkg-sold-panel__section">
        <div className="pkg-sold-panel__section-title">Pricing</div>
        <div className="pkg-sold-panel__row">
          <span className="pkg-sold-panel__label">Base price</span>
          <span className="pkg-sold-panel__value">₹{Number(pkg.basePrice).toLocaleString("en-IN")}</span>
        </div>
        {Number(pkg.gstPercentage) > 0 && (
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">GST ({pkg.gstPercentage}%)</span>
            <span className="pkg-sold-panel__value">₹{Number(pkg.gstAmount).toFixed(2)}</span>
          </div>
        )}
        {Number(pkg.discount) > 0 && (
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">Discount</span>
            <span className="pkg-sold-panel__value" style={{ color: "#16a34a" }}>
              -₹{Number(pkg.discount).toFixed(2)}
            </span>
          </div>
        )}
        <div className="pkg-sold-panel__row pkg-sold-panel__row--total">
          <span className="pkg-sold-panel__label">Total</span>
          <span className="pkg-sold-panel__value pkg-sold-panel__value--total">
            ₹{Number(pkg.totalAmount).toFixed(2)}
          </span>
        </div>
      </div>

      {(pkg.services?.length ?? 0) > 0 && (
        <div className="pkg-sold-panel__section">
          <div className="pkg-sold-panel__section-title">Services</div>
          <table className="pkg-sold-panel__svc-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Total</th>
                <th>Done</th>
                <th>Left</th>
              </tr>
            </thead>
            <tbody>
              {pkg.services.map(s => (
                <tr key={s.serviceId}>
                  <td>{s.serviceName}</td>
                  <td>{s.totalSessions}</td>
                  <td>{s.completedSessions}</td>
                  <td style={{ fontWeight: 700, color: "#7c3aed" }}>{s.remainingSessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Edit panel content ───────────────────────────────────────────────────────

interface EditPanelProps {
  edit:            EditState;
  saving:          boolean;
  saveError:       string | null;
  onChange:        (field: keyof Omit<EditState, "services">, value: string | boolean) => void;
  onServiceChange: (idx: number, field: keyof EditServiceRow, value: string) => void;
}

function EditPanel({ edit, saving, saveError, onChange, onServiceChange }: EditPanelProps) {
  const base   = parseFloat(edit.basePrice)     || 0;
  const gstPct = parseFloat(edit.gstPercentage) || 0;
  const disc   = parseFloat(edit.discount)      || 0;
  const gstAmt = (base - disc) * gstPct / 100;
  const total  = base - disc + gstAmt;

  return (
    <div className="pkg-sold-panel__edit">
      <div className="pkg-sold-panel__edit-group">
        <label className="pkg-sold-panel__edit-label">Package Name</label>
        <input
          className="pkg-sold-panel__edit-input"
          value={edit.packageName}
          onChange={e => onChange("packageName", e.target.value)}
          disabled={saving}
          placeholder="Package name"
        />
      </div>

      <div className="pkg-sold-panel__edit-group">
        <label className="pkg-sold-panel__edit-label">Expiry Date</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {!edit.neverExpires && (
            <input
              type="date"
              className="pkg-sold-panel__edit-input"
              value={edit.expiryDate}
              onChange={e => onChange("expiryDate", e.target.value)}
              disabled={saving}
              style={{ flex: 1 }}
            />
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={edit.neverExpires}
              onChange={e => onChange("neverExpires", e.target.checked)}
              disabled={saving}
            />
            Never expires
          </label>
        </div>
      </div>

      <div className="pkg-sold-panel__edit-group">
        <label className="pkg-sold-panel__edit-label">Payment Method</label>
        <select
          className="pkg-sold-panel__edit-select"
          value={edit.paymentMethod}
          onChange={e => onChange("paymentMethod", e.target.value)}
          disabled={saving}
        >
          {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div className="pkg-sold-panel__edit-row">
        <div className="pkg-sold-panel__edit-group">
          <label className="pkg-sold-panel__edit-label">Base Price (₹)</label>
          <input
            type="number"
            className="pkg-sold-panel__edit-input"
            value={edit.basePrice}
            onChange={e => onChange("basePrice", e.target.value)}
            disabled={saving}
            min={0}
          />
        </div>
        <div className="pkg-sold-panel__edit-group">
          <label className="pkg-sold-panel__edit-label">GST (%)</label>
          <input
            type="number"
            className="pkg-sold-panel__edit-input"
            value={edit.gstPercentage}
            onChange={e => onChange("gstPercentage", e.target.value)}
            disabled={saving}
            min={0}
          />
        </div>
      </div>

      <div className="pkg-sold-panel__edit-group" style={{ maxWidth: "50%" }}>
        <label className="pkg-sold-panel__edit-label">Discount (₹)</label>
        <input
          type="number"
          className="pkg-sold-panel__edit-input"
          value={edit.discount}
          onChange={e => onChange("discount", e.target.value)}
          disabled={saving}
          min={0}
        />
      </div>

      <div className="pkg-sold-panel__price-preview">
        Total: <strong>₹{total.toFixed(2)}</strong>
        {gstAmt > 0 && <span style={{ marginLeft: 10, opacity: 0.7, fontSize: 12 }}>incl. ₹{gstAmt.toFixed(2)} GST</span>}
      </div>

      {edit.services.length > 0 && (
        <div className="pkg-sold-panel__edit-group">
          <label className="pkg-sold-panel__edit-label">Services</label>
          {edit.services.map((svc, i) => (
            <div key={svc.serviceId} className="pkg-sold-panel__svc-edit-row">
              <input
                className="pkg-sold-panel__edit-input"
                value={svc.serviceName}
                onChange={e => onServiceChange(i, "serviceName", e.target.value)}
                disabled={saving}
                placeholder="Name"
                style={{ flex: 2 }}
              />
              <input
                type="number"
                className="pkg-sold-panel__edit-input"
                value={svc.totalSessions}
                onChange={e => onServiceChange(i, "totalSessions", e.target.value)}
                disabled={saving}
                placeholder="Sessions"
                min={1}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                className="pkg-sold-panel__edit-input"
                value={svc.price}
                onChange={e => onServiceChange(i, "price", e.target.value)}
                disabled={saving}
                placeholder="₹"
                min={0}
                style={{ flex: 1 }}
              />
            </div>
          ))}
          <div className="pkg-sold-panel__svc-edit-hints">
            <span style={{ flex: 2 }}>Name</span>
            <span style={{ flex: 1 }}>Sessions</span>
            <span style={{ flex: 1 }}>Price (₹)</span>
          </div>
        </div>
      )}

      {saveError && (
        <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
          {saveError}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PackagesSoldPage() {
  const navigate = useNavigate();

  const [searchTerm,   setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(10);
  const searchRef = useRef<HTMLInputElement>(null);

  // Panel state
  const [selectedPkg, setSelectedPkg] = useState<ClientPackage | null>(null);
  const [panelMode,   setPanelMode]   = useState<"view" | "edit">("view");
  const [edit,        setEdit]        = useState<EditState | null>(null);
  const [saving,         setSaving]        = useState(false);
  const [saveError,      setSaveError]     = useState<string | null>(null);
  const [confirmDelete,  setConfirmDelete] = useState(false);
  const [deleting,       setDeleting]      = useState(false);
  const [deleteError,    setDeleteError]   = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useListClientPackagesQuery(
    { search: searchTerm || undefined, status: statusFilter !== "All" ? statusFilter : undefined, page: currentPage, limit: pageSize },
    { skip: false },
  );

  const [updateClientPackage] = useUpdateClientPackageMutation();
  const [deleteClientPackage] = useDeleteClientPackageMutation();

  const packages: ClientPackage[] = data?.items ?? [];
  const total = data?.total ?? 0;

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const openPanel = useCallback((pkg: ClientPackage) => {
    setSelectedPkg(pkg);
    setPanelMode("view");
    setEdit(null);
    setSaveError(null);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedPkg(null);
    setPanelMode("view");
    setEdit(null);
    setSaveError(null);
    setConfirmDelete(false);
    setDeleteError(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedPkg) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteClientPackage(selectedPkg.id).unwrap();
      closePanel();
      refetch();
    } catch {
      setDeleteError("Failed to delete package. Please try again.");
      setDeleting(false);
    }
  }, [selectedPkg, deleteClientPackage, closePanel, refetch]);

  const enterEdit = useCallback(() => {
    if (!selectedPkg) return;
    const s = selectedPkg.status?.toLowerCase();
    if (s === "expired" || s === "completed") return;
    setEdit(toEditState(selectedPkg));
    setPanelMode("edit");
    setSaveError(null);
  }, [selectedPkg]);

  const cancelEdit = useCallback(() => {
    setPanelMode("view");
    setEdit(null);
    setSaveError(null);
  }, []);

  const handleChange = useCallback(
    (field: keyof Omit<EditState, "services">, value: string | boolean) => {
      setEdit(prev => prev ? { ...prev, [field]: value } : prev);
    },
    [],
  );

  const handleServiceChange = useCallback(
    (idx: number, field: keyof EditServiceRow, value: string) => {
      setEdit(prev => {
        if (!prev) return prev;
        const services = [...prev.services];
        services[idx] = { ...services[idx], [field]: value };
        return { ...prev, services };
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!edit || !selectedPkg) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: UpdateClientPackageDTO = {
        packageName:   edit.packageName   || undefined,
        expiryDate:    edit.neverExpires ? "2099-12-31" : (edit.expiryDate || undefined),
        paymentMethod: edit.paymentMethod || undefined,
        basePrice:     parseFloat(edit.basePrice)     || undefined,
        gstPercentage: parseFloat(edit.gstPercentage) || 0,
        discount:      parseFloat(edit.discount)      || 0,
        services: edit.services.map(s => ({
          serviceId:     s.serviceId,
          serviceName:   s.serviceName,
          totalSessions: parseInt(s.totalSessions, 10) || 1,
          price:         parseFloat(s.price) || 0,
        })),
      };
      const updated = await updateClientPackage({ id: selectedPkg.id, data: payload }).unwrap();
      setSelectedPkg(updated);
      setPanelMode("view");
      setEdit(null);
      refetch();
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [edit, selectedPkg, updateClientPackage, refetch]);

  return (
    <div className="memberships-page container-fluid" style={{ position: "relative" }}>

      {/* Backdrop */}
      {selectedPkg && (
        <div className="pkg-sold-panel__backdrop" onClick={closePanel} aria-hidden="true" />
      )}

      {/* ── HEADER ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h4 fw-bold mb-1">Packages sold</h3>
          <p className="text-muted small mb-0">View all packages purchased by your clients.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button variant="outline-dark" pill onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            variant="dark"
            pill
            className="px-4 fw-bold"
            onClick={() => navigate("/dashboard/catalog/packages")}
          >
            Manage packages
          </Button>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="d-flex gap-3 align-items-center mb-4 flex-wrap">
        <div className="memberships-search" style={{ maxWidth: 320 }}>
          <Search size={14} className="memberships-search__icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by client or package…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="memberships-search__input"
          />
        </div>
        <div className="d-flex gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`memberships-page-btn${statusFilter === s ? " active" : ""}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE ── */}
      {isLoading ? (
        <Card className="text-center py-5 border-0 rounded-4 shadow-sm d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
          <Loader message="Loading packages…" className="py-5" />
        </Card>
      ) : packages.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-4 empty-state-card">
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div
              className="d-flex align-items-center justify-content-center mb-3"
              style={{ width: 60, height: 60, borderRadius: 15, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <BoxSeam size={28} className="text-white" />
            </div>
            <h5 className="fw-bold mb-1 text-dark">
              {searchTerm || statusFilter !== "All" ? "No packages found" : "No packages sold yet"}
            </h5>
            <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 380, textAlign: "center" }}>
              {searchTerm || statusFilter !== "All"
                ? "Try adjusting your search or filter."
                : "Create and sell packages to your clients from the Packages section."}
            </p>
            {!searchTerm && statusFilter === "All" && (
              <Button variant="outline-dark" pill className="px-4 fw-bold" onClick={() => navigate("/dashboard/catalog/packages")}>
                Go to Packages
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card noPadding className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 p-0">
          <table className="memberships-table w-100">
            <thead>
              <tr>
                <th>Client</th>
                <th>Package</th>
                <th>Services</th>
                <th>Created</th>
                <th>Expiry</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => (
                <tr
                  key={pkg.id}
                  className={`memberships-table-row${selectedPkg?.id === pkg.id ? " memberships-table-row--selected" : ""}`}
                  onClick={() => openPanel(pkg)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{pkg.clientName}</div>
                    {pkg.mobile && <div className="text-muted" style={{ fontSize: 12 }}>{pkg.mobile}</div>}
                  </td>
                  <td>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{pkg.packageName}</div>
                    {pkg.category && <div className="text-muted" style={{ fontSize: 11 }}>{pkg.category}</div>}
                  </td>
                  <td>
                    <span className="text-muted small">
                      {pkg.services?.length ?? 0} service{(pkg.services?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td><span className="small text-muted">{formatDate(pkg.createdDate)}</span></td>
                  <td><span className="small text-muted">{formatDate(pkg.expiryDate)}</span></td>
                  <td>
                    <span className="small" style={{ textTransform: "capitalize" }}>
                      {pkg.paymentMethod?.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span className={`memberships-status-badge ${statusBadgeClass(pkg.status)}`}>
                      {pkg.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="fw-bold small">₹{Number(pkg.totalAmount || 0).toFixed(2)}</div>
                    {Number(pkg.pendingAmount) > 0 && (
                      <div style={{ fontSize: 11, color: "#dc2626" }}>Due: ₹{Number(pkg.pendingAmount).toFixed(2)}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── PAGINATION ── */}
      {total > 0 && !isLoading && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setCurrentPage}
          onPageSizeChange={sz => { setPageSize(sz); setCurrentPage(1); }}
          className="mt-4 mb-4"
        />
      )}

      {/* ── DETAIL / EDIT PANEL ── */}
      {selectedPkg && (
        <aside className="pkg-sold-panel" role="complementary" aria-label="Package details">
          {/* Header */}
          <div className="pkg-sold-panel__header">
            <div>
              <div className="pkg-sold-panel__header-title">
                {panelMode === "view" ? "Package Details" : "Edit Package"}
              </div>
              <span className={`pkg-sold-panel__mode-badge${panelMode === "edit" ? " pkg-sold-panel__mode-badge--edit" : ""}`}>
                {panelMode === "view" ? "View" : "Edit Mode"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {panelMode === "view" ? (
                <>
                  <button className="pkg-sold-panel__btn pkg-sold-panel__btn--delete" onClick={() => setConfirmDelete(true)}>
                    <Trash size={13} /> Delete
                  </button>
                  {selectedPkg.status?.toLowerCase() === "expired" || selectedPkg.status?.toLowerCase() === "completed" ? (
                    <span
                      className="pkg-sold-panel__locked-badge"
                      title={`Package is ${selectedPkg.status.toLowerCase()} — editing is disabled`}
                    >
                      🔒 {selectedPkg.status}
                    </span>
                  ) : (
                    <button className="pkg-sold-panel__btn pkg-sold-panel__btn--edit" onClick={enterEdit}>
                      <PencilSquare size={13} /> Edit
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="pkg-sold-panel__btn pkg-sold-panel__btn--cancel"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    <XLg size={12} /> Cancel
                  </button>
                  <button
                    className="pkg-sold-panel__btn pkg-sold-panel__btn--save"
                    onClick={handleSave}
                    disabled={saving || !edit?.packageName?.trim()}
                  >
                    {saving ? <span className="pkg-sold-panel__spinner" /> : <CheckLg size={13} />}
                    {saving ? "Saving…" : "Save"}
                  </button>
                </>
              )}
              <button className="pkg-sold-panel__close" onClick={closePanel} title="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="pkg-sold-panel__body">
            {panelMode === "view" ? (
              <ViewPanel pkg={selectedPkg} />
            ) : edit ? (
              <EditPanel
                edit={edit}
                saving={saving}
                saveError={saveError}
                onChange={handleChange}
                onServiceChange={handleServiceChange}
              />
            ) : null}
          </div>

          {/* Delete confirmation */}
          {confirmDelete && (
            <div className="pkg-sold-panel__confirm-overlay">
              <div className="pkg-sold-panel__confirm-box">
                <div className="pkg-sold-panel__confirm-icon">
                  <Trash size={22} />
                </div>
                <div className="pkg-sold-panel__confirm-title">Delete Package?</div>
                <div className="pkg-sold-panel__confirm-msg">
                  Are you sure you want to delete <strong>{selectedPkg.packageName}</strong> for{" "}
                  <strong>{selectedPkg.clientName}</strong>? This action cannot be undone.
                </div>
                {deleteError && (
                  <div style={{ color: "#dc2626", fontSize: 12, textAlign: "center" }}>{deleteError}</div>
                )}
                <div className="pkg-sold-panel__confirm-actions">
                  <button
                    className="pkg-sold-panel__btn pkg-sold-panel__btn--cancel"
                    onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="pkg-sold-panel__btn pkg-sold-panel__btn--delete-confirm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? <span className="pkg-sold-panel__spinner" /> : <Trash size={13} />}
                    {deleting ? "Deleting…" : "Yes, Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
