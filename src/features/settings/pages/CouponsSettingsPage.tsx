import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Printer,
  Tag,
  FileText,
  Eye,
  ShoppingCart,
  Infinity as InfinityIcon,
  CheckCircle2,
  Info,
  Trash2,
  X,
  Save,
  Plus,
  Layers,
  ChevronRight,
  Pencil,
  Palette,
} from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import api from "../../../services/api/axios";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { COUPON, type Coupon, type CreateCouponPayload, type CreateBulkCouponsPayload } from "../../../services/api/endpoints/coupon.endpoints";
import { printCoupons } from "../utils/printCoupons";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/CouponsSettingsPage.scss";

interface CouponForm {
  code: string;
  type: "percentage" | "flat";
  value: string;
  min_order_amount: string;
  max_uses: string; // "" = unlimited
  expires_at: string; // yyyy-mm-dd
  is_active: boolean;
}

interface FormErrors {
  code?: string;
  value?: string;
  expires_at?: string;
}

interface BulkForm extends Omit<CouponForm, "code"> {
  prefix: string;
  count: string;
}

interface BulkFormErrors {
  prefix?: string;
  count?: string;
  value?: string;
  expires_at?: string;
}

const EMPTY_FORM: CouponForm = {
  code: "",
  type: "percentage",
  value: "",
  min_order_amount: "",
  max_uses: "",
  expires_at: "",
  is_active: true,
};

const EMPTY_BULK_FORM: BulkForm = {
  prefix: "",
  count: "50",
  type: "percentage",
  value: "",
  min_order_amount: "",
  max_uses: "1",
  expires_at: "",
  is_active: true,
};

const ITEM_ICON_VARIANTS = ["purple", "blue", "orange"] as const;

type ListRow =
  | { kind: "single"; coupon: Coupon }
  | { kind: "batch"; batchId: string; label: string; coupons: Coupon[] };

function couponToForm(c: Coupon): CouponForm {
  return {
    code: c.code,
    type: c.type,
    value: String(c.value),
    min_order_amount: String(c.min_order_amount ?? 0),
    max_uses: c.max_uses != null ? String(c.max_uses) : "",
    expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
    is_active: c.is_active,
  };
}

function formToPayload(f: CouponForm): CreateCouponPayload {
  return {
    code: f.code.trim().toUpperCase(),
    type: f.type,
    value: Number(f.value) || 0,
    min_order_amount: Number(f.min_order_amount) || 0,
    max_uses: f.max_uses.trim() ? Number(f.max_uses) : null,
    expires_at: f.expires_at,
    is_active: f.is_active,
  };
}

function bulkFormToPayload(f: BulkForm): CreateBulkCouponsPayload {
  return {
    prefix: f.prefix.trim().toUpperCase(),
    count: Number(f.count) || 0,
    type: f.type,
    value: Number(f.value) || 0,
    min_order_amount: Number(f.min_order_amount) || 0,
    max_uses: f.max_uses.trim() ? Number(f.max_uses) : null,
    expires_at: f.expires_at,
    is_active: f.is_active,
  };
}

function couponStatus(c: Coupon): { label: string; variant: "" | "gray" | "red" } {
  const expired = new Date(c.expires_at) < new Date();
  if (!c.is_active) return { label: "Inactive", variant: "gray" };
  if (expired) return { label: "Expired", variant: "red" };
  return { label: "Active", variant: "" };
}

export default function CouponsSettingsPage() {
  const navigate = useNavigate();
  const { currencySymbol, formatAmount } = useCurrency();
  const currentSalon = useAppSelector((s) => s.salon.currentSalon);
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  // Snapshot of `form` as it was when the currently-selected coupon was loaded
  // (or last saved) — compared against the live form to gate the Save button,
  // so opening an existing coupon for editing doesn't leave Save clickable
  // with nothing actually changed.
  const [originalForm, setOriginalForm] = useState<CouponForm | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  // View <-> Edit for the detail panel — viewing a selected coupon starts
  // read-only; creating one (single or via the separate Bulk Create modal's
  // own always-usable flow) goes straight to Edit since there's nothing to
  // view yet. Coupon Preview below stays derived from `form` and keeps
  // updating live regardless of this flag.
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  // Bulk creation
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkForm>(EMPTY_BULK_FORM);
  const [bulkErrors, setBulkErrors] = useState<BulkFormErrors>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [lastBulkBatch, setLastBulkBatch] = useState<Coupon[] | null>(null);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  async function fetchCoupons() {
    setLoading(true);
    try {
      const res = await api.get(COUPON.MINE);
      setItems(res.data?.data ?? res.data ?? []);
    } catch {
      showError("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCoupons();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => c.code.toLowerCase().includes(q));
  }, [items, search]);

  const selectedCoupon = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId]
  );

  // Bulk-created coupons share a batch_id — collapse them into one row that
  // expands to reveal every individual code, instead of flooding the list.
  const listRows = useMemo<ListRow[]>(() => {
    const rows: ListRow[] = [];
    const batches = new Map<string, Coupon[]>();
    for (const c of filtered) {
      if (c.batch_id) {
        if (!batches.has(c.batch_id)) batches.set(c.batch_id, []);
        batches.get(c.batch_id)!.push(c);
      }
    }
    const seen = new Set<string>();
    for (const c of filtered) {
      if (c.batch_id) {
        if (seen.has(c.batch_id)) continue;
        seen.add(c.batch_id);
        rows.push({ kind: "batch", batchId: c.batch_id, label: c.batch_label || c.batch_id, coupons: batches.get(c.batch_id)! });
      } else {
        rows.push({ kind: "single", coupon: c });
      }
    }
    return rows;
  }, [filtered]);

  function toggleBatch(batchId: string) {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }

  function handleSelect(coupon: Coupon) {
    setSelectedId(coupon.id);
    setIsCreating(false);
    const snapshot = couponToForm(coupon);
    setForm(snapshot);
    setOriginalForm(snapshot);
    setFormErrors({});
    setIsEditing(false);
  }

  function handleCreateNew() {
    setSelectedId(null);
    setIsCreating(true);
    setForm(EMPTY_FORM);
    setOriginalForm(null);
    setFormErrors({});
    setIsEditing(true);
  }

  function startEditing() {
    setIsEditing(true);
  }

  function handleCancel() {
    if (isCreating) {
      setIsCreating(false);
      setSelectedId(null);
      setForm(EMPTY_FORM);
      setOriginalForm(null);
    } else if (selectedCoupon) {
      const snapshot = couponToForm(selectedCoupon);
      setForm(snapshot);
      setOriginalForm(snapshot);
    }
    setFormErrors({});
    setIsEditing(false);
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.code.trim()) errs.code = "Code is required";
    if (!form.value.trim() || isNaN(Number(form.value)) || Number(form.value) <= 0) {
      errs.value = "Must be a positive number";
    } else if (form.type === "percentage" && Number(form.value) > 100) {
      errs.value = "Cannot exceed 100%";
    }
    if (!form.expires_at) errs.expires_at = "Expiry date is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    // Belt-and-suspenders alongside the disabled Save button — no update
    // call is fired if editing an existing coupon with nothing changed.
    if (!isCreating && !isFormDirty) return;
    setSaving(true);
    const payload = formToPayload(form);
    try {
      if (isCreating) {
        const res = await api.post(COUPON.BASE, payload);
        const created: Coupon = res.data?.data ?? res.data;
        await fetchCoupons();
        setSelectedId(created.id);
        setIsCreating(false);
        setIsEditing(false);
        showSuccess("Coupon created");
      } else if (selectedId) {
        const res = await api.patch(COUPON.BY_ID(selectedId), payload);
        const updated: Coupon = res.data?.data ?? res.data;
        await fetchCoupons();
        const snapshot = couponToForm(updated);
        setForm(snapshot);
        setOriginalForm(snapshot);
        setIsEditing(false);
        showSuccess("Coupon saved");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to save coupon";
      showError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    setDeleting(true);
    try {
      await api.delete(COUPON.BY_ID(selectedId));
      setSelectedId(null);
      setIsCreating(false);
      setForm(EMPTY_FORM);
      setIsEditing(false);
      await fetchCoupons();
      showSuccess("Coupon deleted");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to delete coupon";
      showError(msg);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteBatch(batchId: string, label: string, count: number, coupons: Coupon[]) {
    if (!window.confirm(`Delete all ${count} coupons in "${label}"? This cannot be undone.`)) return;
    setDeletingBatchId(batchId);
    try {
      await api.delete(COUPON.BY_BATCH(batchId));
      if (coupons.some((c) => c.id === selectedId)) {
        setSelectedId(null);
        setIsCreating(false);
        setForm(EMPTY_FORM);
      }
      await fetchCoupons();
      showSuccess(`${count} coupons deleted`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to delete batch";
      showError(msg);
    } finally {
      setDeletingBatchId(null);
    }
  }

  function setField<K extends keyof CouponForm>(key: K, val: CouponForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setBulkField<K extends keyof BulkForm>(key: K, val: BulkForm[K]) {
    setBulkForm((f) => ({ ...f, [key]: val }));
  }

  function openBulkModal() {
    setBulkForm(EMPTY_BULK_FORM);
    setBulkErrors({});
    setLastBulkBatch(null);
    setShowBulkModal(true);
  }

  function validateBulk(): boolean {
    const errs: BulkFormErrors = {};
    if (!bulkForm.prefix.trim()) errs.prefix = "Prefix is required";
    else if (!/^[A-Za-z0-9]{2,10}$/.test(bulkForm.prefix.trim())) errs.prefix = "2-10 letters/numbers only";
    const count = Number(bulkForm.count);
    if (!bulkForm.count.trim() || isNaN(count) || count < 1 || count > 500) {
      errs.count = "Must be between 1 and 500";
    }
    if (!bulkForm.value.trim() || isNaN(Number(bulkForm.value)) || Number(bulkForm.value) <= 0) {
      errs.value = "Must be a positive number";
    } else if (bulkForm.type === "percentage" && Number(bulkForm.value) > 100) {
      errs.value = "Cannot exceed 100%";
    }
    if (!bulkForm.expires_at) errs.expires_at = "Expiry date is required";
    setBulkErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleBulkCreate() {
    if (!validateBulk()) return;
    setBulkSaving(true);
    try {
      const res = await api.post(COUPON.BULK, bulkFormToPayload(bulkForm));
      const created: Coupon[] = res.data?.data ?? res.data ?? [];
      await fetchCoupons();
      setLastBulkBatch(created);
      showSuccess(`${created.length} coupons created`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to create coupons";
      showError(msg);
    } finally {
      setBulkSaving(false);
    }
  }

  function handlePrintBatch() {
    if (lastBulkBatch?.length) printCoupons(lastBulkBatch, currentSalon, formatAmount);
  }

  function handlePrintAll() {
    if (filtered.length === 0) { showError("No coupons to print"); return; }
    printCoupons(filtered, currentSalon, formatAmount);
  }

  const showForm = isCreating || selectedId != null;
  const panelTitle = isCreating ? "Create Coupon" : "Coupon Details";
  const panelSubtitle = isCreating ? "Set up a new coupon code" : "Update coupon information and settings";

  // Whether the live form differs from the snapshot taken when this coupon
  // was loaded/last saved — gates the Save button so opening an existing
  // coupon for editing doesn't leave it clickable with nothing changed yet.
  // Always true while creating a new coupon (there's no "original" to diff against).
  const isFormDirty = isCreating || !originalForm || Object.keys(form).some(
    (key) => form[key as keyof CouponForm] !== originalForm[key as keyof CouponForm]
  );
  const saveDisabled = saving || (!isCreating && !isFormDirty);

  // Warn on tab close/refresh with unsaved changes still pending.
  useEffect(() => {
    if (!isEditing || !isFormDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditing, isFormDirty]);

  const previewValue = form.value.trim() ? Number(form.value) || 0 : 0;
  const previewMinOrder = Number(form.min_order_amount) || 0;
  const previewValueLabel = form.type === "percentage" ? `${previewValue}% OFF` : `${formatAmount(previewValue)} OFF`;
  const previewMaxUses = form.max_uses.trim() ? form.max_uses : "Unlimited";

  return (
    <div className="cp-page">
      {overlay}
      {/* ── Page header ── */}
      <div className="cp-header">
        <div className="cp-header__icon"><Tag size={20} /></div>
        <div>
          <h2 className="cp-header__title">Coupons</h2>
          <p className="cp-header__desc">Create and manage coupons &amp; offers</p>
        </div>
      </div>

      <div className="cp-split">
        {/* ── Left: List Panel ── */}
        <div className="cp-list">
          <div className="cp-list__search">
            <div className="cp-list__search-input-wrap">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search coupons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="cp-list__filter-btn" type="button" title="Filter">
              <SlidersHorizontal size={15} />
            </button>
          </div>

          <div className="cp-list__items" ref={listRef}>
            {loading ? (
              <div className="cp-list__empty">Loading…</div>
            ) : listRows.length === 0 ? (
              <div className="cp-list__empty">{search ? "No results found" : "No coupons yet"}</div>
            ) : (
              listRows.map((row, idx) => {
                const variant = ITEM_ICON_VARIANTS[idx % ITEM_ICON_VARIANTS.length];

                if (row.kind === "single") {
                  const coupon = row.coupon;
                  const status = couponStatus(coupon);
                  const valueLabel = coupon.type === "percentage" ? `${Number(coupon.value).toFixed(2)}% OFF` : `${formatAmount(Number(coupon.value))} OFF`;
                  return (
                    <div
                      key={coupon.id}
                      className={`cp-list__item${coupon.id === selectedId ? " active" : ""}`}
                      onClick={() => handleSelect(coupon)}
                    >
                      <div className={`cp-list__item-icon cp-list__item-icon--${variant}`}>
                        <Tag size={16} />
                      </div>
                      <div className="cp-list__item-body">
                        <div className="cp-list__item-code">{coupon.code}</div>
                        <div className="cp-list__item-sub">{valueLabel}</div>
                      </div>
                      <span className={`cp-list__item-badge${status.variant ? ` cp-list__item-badge--${status.variant}` : ""}`}>
                        {status.label}
                      </span>
                    </div>
                  );
                }

                const first = row.coupons[0];
                const valueLabel = first.type === "percentage" ? `${Number(first.value).toFixed(2)}% OFF` : `${formatAmount(Number(first.value))} OFF`;
                const isOpen = expandedBatches.has(row.batchId);
                const containsSelected = row.coupons.some((c) => c.id === selectedId);
                return (
                  <div key={row.batchId} className={`cp-list__batch${containsSelected && !isOpen ? " active" : ""}`}>
                    <div className="cp-list__batch-head" onClick={() => toggleBatch(row.batchId)}>
                      <span className={`cp-list__batch-chevron${isOpen ? " cp-list__batch-chevron--open" : ""}`}>
                        <ChevronRight size={15} />
                      </span>
                      <div className={`cp-list__item-icon cp-list__item-icon--${variant}`}>
                        <Layers size={16} />
                      </div>
                      <div className="cp-list__item-body">
                        <div className="cp-list__item-code">{row.label}</div>
                        <div className="cp-list__item-sub">{valueLabel} · Min {formatAmount(Number(first.min_order_amount))}</div>
                      </div>
                      <span className="cp-list__batch-count">{row.coupons.length} codes</span>
                      <button
                        type="button"
                        className="cp-list__batch-delete"
                        title="Delete entire batch"
                        disabled={deletingBatchId === row.batchId}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBatch(row.batchId, row.label, row.coupons.length, row.coupons);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="cp-list__nested">
                        {row.coupons.map((coupon) => {
                          const status = couponStatus(coupon);
                          return (
                            <div
                              key={coupon.id}
                              className={`cp-list__nested-item${coupon.id === selectedId ? " active" : ""}`}
                              onClick={() => handleSelect(coupon)}
                            >
                              <span>{coupon.code}</span>
                              <span className={`cp-list__item-badge${status.variant ? ` cp-list__item-badge--${status.variant}` : ""}`}>
                                {status.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="cp-list__footer">
            {filtered.length > 0 && (
              <button className="cp-list__print-btn" onClick={handlePrintAll}>
                <Printer size={14} /> Print All ({filtered.length})
              </button>
            )}
            <div className="cp-list__row">
              <button className="cp-list__create-btn cp-list__create-btn--primary" onClick={handleCreateNew}>
                <Plus size={14} /> Create New
              </button>
              <button className="cp-list__create-btn cp-list__create-btn--outline" onClick={openBulkModal}>
                <Layers size={14} /> Bulk Create
              </button>
            </div>
            {/* Reachable with an empty coupon list too — the per-coupon Design
                button in the details panel needs a selected coupon, so without
                this the designer is invisible until a coupon exists. Opened
                this way the design isn't attached to any coupon and its
                {{tokens}} preview with sample values. */}
            <button
              className="cp-list__create-btn cp-list__create-btn--outline cp-list__design-btn"
              onClick={() => navigate("/dashboard/settings/coupon-designer")}
            >
              <Palette size={14} /> Open Coupon Designer
            </button>
          </div>
        </div>

        {/* ── Right: Detail Panel ── */}
        <div className="cp-detail">
          {!showForm ? (
            <div className="cp-detail__empty">Select a coupon from the list or click Create New</div>
          ) : (
            <>
              <div className="cp-detail__head">
                <div className="cp-detail__head-icon"><FileText size={19} /></div>
                <div className="cp-detail__head-text">
                  <h3 className="cp-detail__title">{panelTitle}</h3>
                  <p className="cp-detail__subtitle">{panelSubtitle}</p>
                </div>
                {/* Only for a saved coupon — there's nothing to attach artwork
                    to until it exists. Opens the full-screen designer and
                    comes back here on close. */}
                {!isCreating && selectedId && (
                  <button
                    className="cp-btn cp-detail__design"
                    onClick={() => navigate(`/dashboard/settings/coupon-designer?coupon=${selectedId}`)}
                    title="Design artwork for this coupon"
                  >
                    <Palette size={14} /> Design
                  </button>
                )}
                <label className="cp-toggle">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setField("is_active", e.target.checked)}
                    disabled={!isEditing}
                  />
                  <span className="cp-toggle__track"><span className="cp-toggle__thumb" /></span>
                  <span className={`cp-toggle__status${!form.is_active ? " cp-toggle__status--off" : ""}`}>
                    {form.is_active ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>

              <div className="cp-form-row">
                <div className="cp-field">
                  <label className="cp-field__label">Coupon Code <span className="cp-required">*</span></label>
                  <input
                    type="text"
                    className={`cp-input${formErrors.code ? " cp-input--error" : ""}`}
                    placeholder="e.g. SAVE10"
                    value={form.code}
                    onChange={(e) => setField("code", e.target.value.toUpperCase())}
                    disabled={!isEditing}
                  />
                  {formErrors.code ? (
                    <span className="settings-error">{formErrors.code}</span>
                  ) : (
                    <div className="cp-field__hint">Enter a unique code for this coupon</div>
                  )}
                </div>

                <div className="cp-field">
                  <label className="cp-field__label">Discount Value <span className="cp-required">*</span></label>
                  <div className={`cp-value-wrap${formErrors.value ? " cp-value-wrap--error" : ""}`}>
                    <input
                      type="number"
                      placeholder="Enter discount value"
                      min={0}
                      value={form.value}
                      onChange={(e) => setField("value", e.target.value)}
                      disabled={!isEditing}
                    />
                    <span className="cp-value-badge">{form.type === "percentage" ? "%" : currencySymbol}</span>
                  </div>
                  {formErrors.value ? (
                    <span className="settings-error">{formErrors.value}</span>
                  ) : (
                    <div className="cp-field__hint">Enter discount value</div>
                  )}
                </div>
              </div>

              <div className="cp-check-row">
                <label className="cp-check-item">
                  <input
                    type="radio"
                    checked={form.type === "percentage"}
                    onChange={() => setField("type", "percentage")}
                    disabled={!isEditing}
                  />
                  Percentage (%)
                </label>
                <label className="cp-check-item">
                  <input
                    type="radio"
                    checked={form.type === "flat"}
                    onChange={() => setField("type", "flat")}
                    disabled={!isEditing}
                  />
                  Flat Amount ({currencySymbol})
                </label>
              </div>

              <div className="cp-form-row">
                <div className="cp-field">
                  <label className="cp-field__label">Minimum Order Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    className="cp-input"
                    min={0}
                    placeholder="0.00"
                    value={form.min_order_amount}
                    onChange={(e) => setField("min_order_amount", e.target.value)}
                    disabled={!isEditing}
                  />
                  <div className="cp-field__hint">Minimum order amount to apply this coupon</div>
                </div>

                <div className="cp-field">
                  <label className="cp-field__label">Max Uses</label>
                  <input
                    type="number"
                    className="cp-input"
                    min={1}
                    placeholder="Unlimited"
                    value={form.max_uses}
                    onChange={(e) => setField("max_uses", e.target.value)}
                    disabled={!isEditing}
                  />
                  <div className="cp-field__hint">Maximum number of times this coupon can be used</div>
                </div>
              </div>

              <div className="cp-form-row">
                <div className="cp-field">
                  <label className="cp-field__label">Expires On</label>
                  <input
                    type="date"
                    className={`cp-input${formErrors.expires_at ? " cp-input--error" : ""}`}
                    value={form.expires_at}
                    onChange={(e) => setField("expires_at", e.target.value)}
                    disabled={!isEditing}
                  />
                  {formErrors.expires_at ? (
                    <span className="settings-error">{formErrors.expires_at}</span>
                  ) : (
                    <div className="cp-field__hint">Select expiry date for this coupon</div>
                  )}
                </div>
                <div className="cp-field" />
              </div>

              <div className="cp-preview">
                <div className="cp-preview__head"><Eye size={15} /> Coupon Preview</div>
                <div className="cp-preview__grid">
                  <div className="cp-preview__stat">
                    <div className="cp-preview__stat-icon"><Tag size={15} /></div>
                    <div>
                      <div className="cp-preview__stat-label">Customer gets</div>
                      <div className="cp-preview__stat-value cp-preview__stat-value--purple">{previewValueLabel}</div>
                    </div>
                  </div>
                  <div className="cp-preview__stat">
                    <div className="cp-preview__stat-icon"><ShoppingCart size={15} /></div>
                    <div>
                      <div className="cp-preview__stat-label">Min. Order</div>
                      <div className="cp-preview__stat-value">{formatAmount(previewMinOrder)}</div>
                    </div>
                  </div>
                  <div className="cp-preview__stat">
                    <div className="cp-preview__stat-icon"><InfinityIcon size={15} /></div>
                    <div>
                      <div className="cp-preview__stat-label">Max Uses</div>
                      <div className="cp-preview__stat-value">{previewMaxUses}</div>
                    </div>
                  </div>
                  <div className="cp-preview__stat">
                    <div>
                      <div className="cp-preview__stat-label">Status</div>
                      <span className={`cp-preview__status${!form.is_active ? " cp-preview__status--inactive" : ""}`}>
                        <CheckCircle2 size={13} /> {form.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="cp-preview__note">
                  <Info size={14} />
                  <span>
                    This coupon will give {previewValueLabel.replace(" OFF", "")} discount on orders above {formatAmount(previewMinOrder)}
                  </span>
                </div>
              </div>

              <div className="cp-actions">
                {!isEditing ? (
                  <button className="cp-btn cp-btn--primary" onClick={startEditing}>
                    <Pencil size={14} /> Edit
                  </button>
                ) : (
                  <>
                    {!isCreating && selectedId != null && (
                      <button
                        className="cp-btn cp-btn--danger cp-btn--push-left"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete Coupon"}
                      </button>
                    )}
                    <button className="cp-btn" onClick={handleCancel} disabled={saving}>
                      Cancel
                    </button>
                    <button className="cp-btn cp-btn--primary" onClick={handleSave} disabled={saveDisabled}>
                      <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bulk Create Modal ── */}
      {showBulkModal && (
        <div
          className="cp-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowBulkModal(false)}
        >
          <div className="cp-modal">
            <div className="cp-modal__head">
              <h3 className="cp-modal__title">Bulk Create Coupons</h3>
              <button className="cp-modal__close" onClick={() => setShowBulkModal(false)}>
                <X size={16} />
              </button>
            </div>

            {!lastBulkBatch ? (
              <>
                <div className="cp-form-row">
                  <div className="cp-field">
                    <label className="cp-field__label">Code Prefix</label>
                    <input
                      type="text"
                      className={`cp-input${bulkErrors.prefix ? " cp-input--error" : ""}`}
                      placeholder="e.g. SUMMER"
                      value={bulkForm.prefix}
                      onChange={(e) => setBulkField("prefix", e.target.value.toUpperCase())}
                    />
                    {bulkErrors.prefix ? (
                      <span className="settings-error">{bulkErrors.prefix}</span>
                    ) : (
                      <div className="cp-field__hint">
                        Each voucher gets a unique code, e.g. {bulkForm.prefix ? `${bulkForm.prefix}A1B2` : "SUMMERA1B2"}
                      </div>
                    )}
                  </div>

                  <div className="cp-field">
                    <label className="cp-field__label">How Many</label>
                    <input
                      type="number"
                      className={`cp-input${bulkErrors.count ? " cp-input--error" : ""}`}
                      min={1}
                      max={500}
                      value={bulkForm.count}
                      onChange={(e) => setBulkField("count", e.target.value)}
                    />
                    {bulkErrors.count && <span className="settings-error">{bulkErrors.count}</span>}
                  </div>
                </div>

                <div className="cp-form-row">
                  <div className="cp-field">
                    <label className="cp-field__label">Discount Value</label>
                    <div className={`cp-value-wrap${bulkErrors.value ? " cp-value-wrap--error" : ""}`}>
                      <input
                        type="number"
                        placeholder="Enter Value"
                        min={0}
                        value={bulkForm.value}
                        onChange={(e) => setBulkField("value", e.target.value)}
                      />
                      <span className="cp-value-badge">{bulkForm.type === "percentage" ? "%" : currencySymbol}</span>
                    </div>
                    {bulkErrors.value && <span className="settings-error">{bulkErrors.value}</span>}
                  </div>

                  <div className="cp-field">
                    <label className="cp-field__label">Max Uses Per Coupon</label>
                    <input
                      type="number"
                      className="cp-input"
                      min={1}
                      placeholder="1"
                      value={bulkForm.max_uses}
                      onChange={(e) => setBulkField("max_uses", e.target.value)}
                    />
                  </div>
                </div>

                <div className="cp-check-row">
                  <label className="cp-check-item">
                    <input
                      type="radio"
                      checked={bulkForm.type === "percentage"}
                      onChange={() => setBulkField("type", "percentage")}
                    />
                    Percentage
                  </label>
                  <label className="cp-check-item">
                    <input
                      type="radio"
                      checked={bulkForm.type === "flat"}
                      onChange={() => setBulkField("type", "flat")}
                    />
                    Flat Amount ({currencySymbol})
                  </label>
                </div>

                <div className="cp-form-row">
                  <div className="cp-field">
                    <label className="cp-field__label">Minimum Order Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      className="cp-input"
                      min={0}
                      placeholder="0"
                      value={bulkForm.min_order_amount}
                      onChange={(e) => setBulkField("min_order_amount", e.target.value)}
                    />
                  </div>

                  <div className="cp-field">
                    <label className="cp-field__label">Expires On</label>
                    <input
                      type="date"
                      className={`cp-input${bulkErrors.expires_at ? " cp-input--error" : ""}`}
                      value={bulkForm.expires_at}
                      onChange={(e) => setBulkField("expires_at", e.target.value)}
                    />
                    {bulkErrors.expires_at && <span className="settings-error">{bulkErrors.expires_at}</span>}
                  </div>
                </div>

                <div className="cp-modal__actions">
                  <button className="cp-btn" onClick={() => setShowBulkModal(false)} disabled={bulkSaving}>
                    Cancel
                  </button>
                  <button className="cp-btn cp-btn--primary" onClick={handleBulkCreate} disabled={bulkSaving}>
                    {bulkSaving ? "Creating…" : `Create ${bulkForm.count || 0} Coupons`}
                  </button>
                </div>
              </>
            ) : (
              <div className="cp-modal__result">
                <div className="cp-modal__result-icon">✅</div>
                <p className="cp-modal__result-title">{lastBulkBatch.length} coupons created</p>
                <p className="cp-modal__result-sub">Print them all now to hand out to customers.</p>
                <div className="cp-modal__result-actions">
                  <button className="cp-btn" onClick={() => setShowBulkModal(false)}>
                    Close
                  </button>
                  <button className="cp-btn cp-btn--primary" onClick={handlePrintBatch}>
                    <Printer size={14} /> Print Vouchers
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
