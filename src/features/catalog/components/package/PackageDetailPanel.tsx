import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../../store/store";
import { setPackagesList } from "../../../../store/schedulerSlice";
import {
  X,
  PencilSquare,
  CheckLg,
  XLg,
  CardList,
  Tag,
  Clock,
  ToggleOn,
  ToggleOff,
  Percent,
  Hash,
  CalendarEvent,
} from "react-bootstrap-icons";
import type {
  Package,
  UpdatePackageDTO,
} from "../../../../services/api/endpoints/packages.endpoints";
import { useUpdatePackageMutation } from "../../../../services/api/endpoints/packages.endpoints";
import { useCurrency } from "../../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../../utils/currencyIcon";
import { formatDateDDMMYYYY } from "../../../../utils/dateFormat";
import Dropdown from "../../../../components/ui/Dropdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditFormState {
  name: string;
  slug: string;
  description: string;
  basePrice: string;
  discountValue: string;
  discountType: "percentage" | "fixed";
  durationMinutes: string;
  category: string;
  status: "Active" | "Draft" | "Inactive";
  colour: string;
}

type PanelMode = "view" | "edit";

interface PackageDetailPanelProps {
  pkg: Package | null;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Spa", "Hair", "Skin", "Nails", "Body"];

const STATUS_BADGE_CLASS: Record<Package["status"], string> = {
  Active: "pkg-status--active",
  Draft: "pkg-status--draft",
  Inactive: "pkg-status--inactive",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toFormState = (pkg: Package): EditFormState => ({
  name: pkg.name ?? "",
  slug: pkg.slug ?? "",
  description: pkg.description ?? "",
  basePrice: String(pkg.basePrice ?? 0),
  discountValue: String(pkg.discountValue ?? 0),
  discountType: pkg.discountType ?? "fixed",
  durationMinutes: String(pkg.durationMinutes ?? 0),
  category: pkg.category ?? "",
  status: pkg.status ?? "Active",
  colour: pkg.colour ?? "#10b981",
});

// ─── Sub-component: Detail Row (outside render — stable reference) ─────────

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, accent, mono }) => (
  <div className="pkgpanel__detail-row">
    <span className="pkgpanel__detail-icon">{icon}</span>
    <div className="pkgpanel__detail-content">
      <span className="pkgpanel__detail-label">{label}</span>
      <span
        className={[
          "pkgpanel__detail-value",
          accent ? "pkgpanel__detail-value--accent" : "",
          mono ? "pkgpanel__detail-value--mono" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </span>
    </div>
  </div>
);

// ─── Sub-component: View Content ──────────────────────────────────────────────

interface ViewContentProps {
  pkg: Package;
}

const ViewContent: React.FC<ViewContentProps> = ({ pkg }) => {
  const { currencySymbol, formatAmount, currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);
  return (
  <div className="pkgpanel__view">
    {/* Hero */}
    <div className="pkgpanel__hero" style={{ background: `linear-gradient(135deg, ${pkg.colour}15 0%, ${pkg.colour}05 100%)` }}>
      <div
        className="pkgpanel__hero-icon glass-icon"
        style={{ color: pkg.colour, boxShadow: `0 8px 24px ${pkg.colour}30` }}
      >
        <CardList size={28} />
      </div>
      <div className="pkgpanel__hero-meta">
        <h3 className="pkgpanel__hero-name">{pkg.name}</h3>
        <span className={`pkg-status ${STATUS_BADGE_CLASS[pkg.status]}`}>
          {pkg.status}
        </span>
      </div>
    </div>

    {/* Details */}
    <div className="pkgpanel__details">
      <DetailRow icon={<Tag size={15} />} label="Category" value={pkg.category} />
      <DetailRow
        icon={<Clock size={15} />}
        label="Duration"
        value={pkg.durationMinutes ? `${pkg.durationMinutes} min` : "N/A"}
      />
      <DetailRow
        icon={<CurrencyIcon size={15} />}
        label="Base Price"
        value={formatAmount(pkg.basePrice)}
        accent
      />
      {pkg.discountValue && pkg.discountValue > 0 && (
        <DetailRow
          icon={<Percent size={15} />}
          label="Discount"
          value={`${pkg.discountValue}${
            pkg.discountType === "percentage" ? "%" : ` ${currencySymbol}`
          } off`}
        />
      )}
      {pkg.description && (
        <div className="pkgpanel__desc-row">
          <span className="pkgpanel__detail-label">Description</span>
          <p className="pkgpanel__desc-text">{pkg.description}</p>
        </div>
      )}
      {pkg.slug && (
        <DetailRow
          icon={<Hash size={15} />}
          label="Slug"
          value={pkg.slug}
          mono
        />
      )}
      {pkg.createdAt && (
        <DetailRow
          icon={<CalendarEvent size={15} />}
          label="Created"
          value={formatDateDDMMYYYY(new Date(pkg.createdAt))}
        />
      )}
    </div>
  </div>
  );
};

// ─── Sub-component: Edit Content ──────────────────────────────────────────────

interface EditContentProps {
  form: EditFormState;
  saving: boolean;
  saveError: string | null;
  onChange: (field: keyof EditFormState, value: string) => void;
}

const EditContent: React.FC<EditContentProps> = ({
  form,
  saving,
  saveError,
  onChange,
}) => {
  const { currencySymbol } = useCurrency();
  return (
  <div className="pkgpanel__edit">
    <div className="pkgpanel__edit-group">
      <label className="pkgpanel__edit-label">
        PACKAGE NAME <span className="text-danger">*</span>
      </label>
      <input
        className="pkgpanel__edit-input"
        value={form.name}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="e.g. Premium Glow Package"
        disabled={saving}
      />
    </div>

    <div className="pkgpanel__edit-group">
      <label className="pkgpanel__edit-label">SLUG</label>
      <input
        className="pkgpanel__edit-input pkgpanel__edit-input--mono"
        value={form.slug}
        onChange={(e) => onChange("slug", e.target.value)}
        placeholder="premium-glow-package"
        disabled={saving}
      />
    </div>

    <div className="pkgpanel__edit-group">
      <label className="pkgpanel__edit-label">DESCRIPTION</label>
      <textarea
        className="pkgpanel__edit-textarea"
        rows={3}
        value={form.description}
        onChange={(e) => onChange("description", e.target.value)}
        placeholder="Describe what's included…"
        disabled={saving}
      />
    </div>

    <div className="pkgpanel__edit-row">
      <div className="pkgpanel__edit-group">
        <label className="pkgpanel__edit-label">
          BASE PRICE ({currencySymbol}) <span className="text-danger">*</span>
        </label>
        <div className="pkgpanel__price-wrap">
          <span className="pkgpanel__price-prefix">{currencySymbol}</span>
          <input
            type="number"
            min="0"
            className="pkgpanel__edit-input pkgpanel__edit-input--price"
            value={form.basePrice}
            onChange={(e) => onChange("basePrice", e.target.value)}
            onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
            disabled={saving}
          />
        </div>
      </div>

      <div className="pkgpanel__edit-group">
        <label className="pkgpanel__edit-label">DURATION (MIN)</label>
        <input
          type="number"
          className="pkgpanel__edit-input"
          value={form.durationMinutes}
          onChange={(e) => onChange("durationMinutes", e.target.value)}
          disabled={saving}
        />
      </div>
    </div>

    <div className="pkgpanel__edit-row">
      <div className="pkgpanel__edit-group">
        <label className="pkgpanel__edit-label">DISCOUNT VALUE</label>
        <input
          type="number"
          className="pkgpanel__edit-input"
          value={form.discountValue}
          onChange={(e) => onChange("discountValue", e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="pkgpanel__edit-group">
        <label className="pkgpanel__edit-label">DISCOUNT TYPE</label>
        <Dropdown
          className="pkgpanel__edit-select"
          searchable={false}
          value={form.discountType}
          disabled={saving}
          options={[
            { id: "fixed", name: `Fixed (${currencySymbol})` },
            { id: "percentage", name: "Percent (%)" },
          ]}
          onChange={(id) => onChange("discountType", id)}
        />
      </div>
    </div>

    <div className="pkgpanel__edit-row">
      <div className="pkgpanel__edit-group">
        <label className="pkgpanel__edit-label">
          CATEGORY <span className="text-danger">*</span>
        </label>
        <Dropdown
          className="pkgpanel__edit-select"
          searchable={false}
          placeholder="Select…"
          value={form.category}
          disabled={saving}
          options={CATEGORIES.map((c) => ({ id: c, name: c }))}
          onChange={(id) => onChange("category", id)}
        />
      </div>

      <div className="pkgpanel__edit-group">
        <label className="pkgpanel__edit-label">STATUS</label>
        <Dropdown
          className="pkgpanel__edit-select"
          searchable={false}
          value={form.status}
          disabled={saving}
          options={["Active", "Draft", "Inactive"].map((s) => ({ id: s, name: s }))}
          onChange={(id) => onChange("status", id as Package["status"])}
        />
      </div>
    </div>

    <div className="pkgpanel__edit-group">
      <label className="pkgpanel__edit-label">ACCENT COLOUR</label>
      <div className="pkgpanel__colour-wrap">
        <input
          type="color"
          className="pkgpanel__colour-picker"
          value={form.colour}
          onChange={(e) => onChange("colour", e.target.value)}
          disabled={saving}
        />
        <span
          className="pkgpanel__colour-preview"
          style={{ background: form.colour }}
        />
        <span className="pkgpanel__colour-value">{form.colour}</span>
      </div>
    </div>

    {/* Status indicator */}
    <div className="pkgpanel__status-row">
      {form.status === "Active" ? (
        <ToggleOn size={22} className="pkgpanel__status-icon pkgpanel__status-icon--on" />
      ) : (
        <ToggleOff size={22} className="pkgpanel__status-icon pkgpanel__status-icon--off" />
      )}
      <span className="pkgpanel__status-label">
        Package is currently <strong>{form.status}</strong>
      </span>
    </div>

    {saveError && <div className="pkgpanel__error">{saveError}</div>}
  </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PackageDetailPanel: React.FC<PackageDetailPanelProps> = ({ pkg, onClose }) => {
  const [mode, setMode] = useState<PanelMode>("view");
  const [form, setForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [updatePackage] = useUpdatePackageMutation();
  const dispatch = useDispatch<AppDispatch>();

  // Reset to view mode and sync form whenever the selected package changes
  useEffect(() => {
    if (pkg) {
      setForm(toFormState(pkg));
      setMode("view");
      setSaveError(null);
    }
  }, [pkg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEnterEdit = useCallback(() => {
    if (!pkg) return;
    setForm(toFormState(pkg));
    setSaveError(null);
    setMode("edit");
  }, [pkg]);

  const handleCancelEdit = useCallback(() => {
    if (!pkg) return;
    setForm(toFormState(pkg));
    setSaveError(null);
    setMode("view");
  }, [pkg]);

  const handleChange = useCallback(
    (field: keyof EditFormState, value: string) => {
      setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!form || !pkg) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: UpdatePackageDTO = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || undefined,
        basePrice: Number(form.basePrice),
        discountValue: Number(form.discountValue),
        discountType: form.discountType,
        durationMinutes: Number(form.durationMinutes),
        category: form.category,
        status: form.status,
        colour: form.colour,
      };
      await updatePackage({ id: pkg.id, data: payload }).unwrap();
      // Same cache-invalidation reason as EditPackagePage.tsx's handleSave —
      // Quick Sale/Calendar's "+Package" row won't see this edit otherwise.
      dispatch(setPackagesList([]));
      setMode("view");
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [form, pkg, updatePackage]);

  // ── Guard ────────────────────────────────────────────────────────────────────

  if (!pkg || !form) return null;

  const canSave = !saving && form.name.trim() !== "" && form.category !== "";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="pkgpanel__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="pkgpanel"
        role="complementary"
        aria-label={`Package detail: ${pkg.name}`}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div className="pkgpanel__header">
          <div className="pkgpanel__header-left">
            <span className="pkgpanel__header-title">
              {mode === "view" ? "Package Details" : "Edit Package"}
            </span>
            <span className={`pkgpanel__mode-badge ${mode === "edit" ? "pkgpanel__mode-badge--edit" : ""}`}>
              {mode === "view" ? "View Mode" : "Edit Mode"}
            </span>
          </div>

          <div className="pkgpanel__header-actions">
            {mode === "view" ? (
              /* VIEW mode — show Edit button */
              <button
                id="pkg-edit-btn"
                className="pkgpanel__btn pkgpanel__btn--edit"
                onClick={handleEnterEdit}
                title="Edit package"
              >
                <PencilSquare size={14} />
                Edit
              </button>
            ) : (
              /* EDIT mode — show Cancel + Save */
              <>
                <button
                  id="pkg-cancel-btn"
                  className="pkgpanel__btn pkgpanel__btn--cancel"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  title="Discard changes"
                >
                  <XLg size={13} />
                  Cancel
                </button>
                <button
                  id="pkg-save-btn"
                  className="pkgpanel__btn pkgpanel__btn--save"
                  onClick={handleSave}
                  disabled={!canSave}
                  title="Save changes"
                >
                  {saving ? (
                    <span className="pkgpanel__spinner" />
                  ) : (
                    <CheckLg size={14} />
                  )}
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}

            {/* Always-visible Close */}
            <button
              id="pkg-panel-close"
              className="pkgpanel__close"
              onClick={onClose}
              title="Close panel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body — key forces remount only on pkg change ── */}
        <div className="pkgpanel__body custom-scroll">
          <div
            key={`${pkg.id}-${mode}`}
            className="pkgpanel__content-transition"
          >
            {mode === "view" ? (
              <ViewContent pkg={pkg} />
            ) : (
              <EditContent
                form={form}
                saving={saving}
                saveError={saveError}
                onChange={handleChange}
              />
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default PackageDetailPanel;
