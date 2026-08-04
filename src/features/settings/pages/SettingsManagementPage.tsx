import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Save } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
  deleteSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import { clearSettingError } from "../../../store/settingSlice";
import type { Setting, CreateSettingPayload } from "../../../types/setting.types";
import {
  TAX_TYPES,
  inferTaxType,
  parseTaxValue,
  isTaxSetting,
  type TaxValuePayload,
  type TaxApplicableFor,
} from "../utils/taxSettings";
import {
  TAX_MODULE_SETTING_KEY,
  DEFAULT_TAX_MODULE_CONFIG,
  findTaxModuleSetting,
  parseTaxModuleValue,
  type TaxModuleConfig,
} from "../utils/taxModuleSettings";

interface TaxForm {
  tax_type: string;
  tax_name: string;
  tax_value: string;
  active: boolean;
  inclusive_taxes: boolean;
  applicable_service: boolean;
  applicable_product: boolean;
  applicable_membership: boolean;
  applicable_packages: boolean;
}

interface FormErrors {
  tax_name?: string;
  tax_value?: string;
}

const EMPTY_FORM: TaxForm = {
  tax_type: "",
  tax_name: "",
  tax_value: "",
  active: true,
  inclusive_taxes: false,
  // All four default to taxed — a new GST rule should apply to every
  // billable item type out of the box; staff opt individual types OUT
  // (e.g. a genuinely tax-exempt product line), not opt each one in.
  applicable_service: true,
  applicable_product: true,
  applicable_membership: true,
  applicable_packages: true,
};

// The form still stores the same two underlying booleans (active,
// inclusive_taxes) — this just maps them to one mutually-exclusive choice
// instead of two independent checkboxes, since "inactive but inclusive"
// was a meaningless combination anyway.
type TaxStatus = "active" | "inactive" | "included";

const TAX_STATUS_INFO: Record<TaxStatus, { label: string; hint: string }> = {
  active:   { label: "Active",   hint: "Added on top of the bill and included in GST reports." },
  inactive: { label: "Inactive", hint: "No tax calculated — excluded from bills and reports." },
  included: { label: "Included", hint: "Already built into the item price (inclusive) — still shown on the bill and included in reports." },
};

function statusFromForm(f: Pick<TaxForm, "active" | "inclusive_taxes">): TaxStatus {
  if (!f.active) return "inactive";
  return f.inclusive_taxes ? "included" : "active";
}

function applyStatus<T extends { active: boolean; inclusive_taxes: boolean }>(f: T, status: TaxStatus): T {
  switch (status) {
    case "inactive": return { ...f, active: false, inclusive_taxes: false };
    case "included": return { ...f, active: true, inclusive_taxes: true };
    case "active":
    default:          return { ...f, active: true, inclusive_taxes: false };
  }
}

function taxFormToPayload(f: TaxForm): CreateSettingPayload {
  const value: TaxValuePayload = {
    tax_type: f.tax_type,
    tax_value: f.tax_value,
    active: f.active,
    inclusive_taxes: f.inclusive_taxes,
    applicable_for: {
      service: f.applicable_service,
      product: f.applicable_product,
      membership: f.applicable_membership,
      packages: f.applicable_packages,
    },
  };
  return {
    key: f.tax_name,
    value: JSON.stringify(value),
  };
}

function settingToTaxForm(s: Setting): TaxForm {
  const parsed = parseTaxValue(s.value);
  const applicable: Partial<TaxApplicableFor> = parsed.applicable_for ?? {};
  return {
    tax_type: parsed.tax_type || inferTaxType(s.key ?? ""),
    tax_name: s.key ?? "",
    tax_value: parsed.tax_value ?? (typeof s.value === "string" ? s.value : ""),
    active:                parsed.active             != null ? Boolean(parsed.active)             : true,
    inclusive_taxes:       parsed.inclusive_taxes    != null ? Boolean(parsed.inclusive_taxes)    : true,
    // Same "taxed unless explicitly excluded" default as EMPTY_FORM — a
    // legacy tax row saved before per-item-type applicability existed shows
    // as applying to everything here, so reopening and saving it carries
    // that forward explicitly instead of silently staying service-only.
    applicable_service:    applicable.service        != null ? Boolean(applicable.service)        : true,
    applicable_product:    applicable.product         != null ? Boolean(applicable.product)        : true,
    applicable_membership: applicable.membership      != null ? Boolean(applicable.membership)     : true,
    applicable_packages:   applicable.packages         != null ? Boolean(applicable.packages)       : true,
  };
}

function listLabel(s: Setting): string {
  const parsed = parseTaxValue(s.value);
  const type = parsed.tax_type || inferTaxType(s.key ?? "");
  const name = s.key ?? "";
  const val = parsed.tax_value ?? "";
  const prefix = type && type !== "Other" ? type : name.toUpperCase();
  if (!val) return prefix;
  const suffix = parsed.inclusive_taxes ? ", incl." : "";
  return `${prefix} (${val}%${suffix})`;
}

export default function SettingsManagementPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.setting);
  const currentSalon = useAppSelector((s) => s.salon?.currentSalon);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<TaxForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  // Set true by any edit to the currently open tax form (create or select),
  // reset on select/create/save/cancel — same "did anything actually change"
  // tracking used on the other settings pages, just page-local here since
  // this form doesn't map 1:1 to a single saved record until it's created.
  const [formDirty, setFormDirty] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // Editability is driven entirely by the "Enable GST" toggle below — no
  // separate Edit button/mode. GST off = everything here is read-only;
  // GST on = the module config and tax mappings become editable immediately.
  const [pageSaving, setPageSaving] = useState(false);

  // ── GST module config (master toggle, invoice prefix, etc.) ────────────────
  const [moduleConfig, setModuleConfig] = useState<TaxModuleConfig>(DEFAULT_TAX_MODULE_CONFIG);
  const [savedModuleConfig, setSavedModuleConfig] = useState<TaxModuleConfig>(DEFAULT_TAX_MODULE_CONFIG);
  const [moduleSettingId, setModuleSettingId] = useState<string | number | null>(null);
  const [moduleSaving, setModuleSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      showError(error);
      dispatch(clearSettingError());
    }
  }, [error, dispatch]);

  // Loads the saved module config from Redux exactly once — same reasoning as
  // RewardsSettingsPage.tsx (must not resync unconditionally on every items change,
  // or in-progress edits would get clobbered by the next background refetch).
  useEffect(() => {
    if (moduleSettingId) return;
    const found = findTaxModuleSetting(items);
    if (!found) return;
    setModuleSettingId(found.id);
    const parsed = parseTaxModuleValue(found.value);
    setModuleConfig(parsed);
    setSavedModuleConfig(parsed);
  }, [items, moduleSettingId]);

  const moduleHasChanges = useMemo(
    () => JSON.stringify(moduleConfig) !== JSON.stringify(savedModuleConfig),
    [moduleConfig, savedModuleConfig]
  );

  async function saveModuleConfig() {
    setModuleSaving(true);
    const next = {
      ...moduleConfig,
      invoice_prefix: moduleConfig.invoice_prefix || "INV",
    };
    const value = JSON.stringify(next);

    let ok = false;
    if (moduleSettingId) {
      const result = await dispatch(updateSettingThunk({ id: moduleSettingId, data: { key: TAX_MODULE_SETTING_KEY, value } }));
      ok = updateSettingThunk.fulfilled.match(result);
    } else {
      const result = await dispatch(createSettingThunk({
        key: TAX_MODULE_SETTING_KEY, value, description: "GST module configuration",
      }));
      if (createSettingThunk.fulfilled.match(result)) {
        setModuleSettingId(result.payload.id);
        ok = true;
      }
    }

    setModuleSaving(false);
    if (ok) {
      setModuleConfig(next);
      setSavedModuleConfig(next);
    }
    // Success/error messaging now lives in the page-level Save handler below —
    // this only ever runs as part of that combined save, not from its own
    // independent button anymore.
    return ok;
  }

  function cancelModuleConfigChanges() {
    setModuleConfig(savedModuleConfig);
  }

  const taxSettings = useMemo(() => items.filter(isTaxSetting), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return taxSettings;
    return taxSettings.filter((s) => {
      const parsed = parseTaxValue(s.value);
      return (
        s.key.toLowerCase().includes(q) ||
        String(parsed.tax_value ?? "").toLowerCase().includes(q) ||
        String(parsed.tax_type ?? "").toLowerCase().includes(q)
      );
    });
  }, [taxSettings, search]);

  const selectedSetting = useMemo(
    () => items.find((s) => s.id === selectedId) ?? null,
    [items, selectedId]
  );

  function handleSelect(setting: Setting) {
    setSelectedId(setting.id);
    setIsCreating(false);
    setForm(settingToTaxForm(setting));
    setFormErrors({});
    setFormDirty(false);
  }

  function handleCreateNew() {
    setSelectedId(null);
    setIsCreating(true);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormDirty(false);
  }

  function handleCancel() {
    if (isCreating) {
      setIsCreating(false);
      setSelectedId(null);
      setForm(EMPTY_FORM);
      setFormErrors({});
    } else if (selectedSetting) {
      setForm(settingToTaxForm(selectedSetting));
      setFormErrors({});
    }
    setFormDirty(false);
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.tax_name.trim()) errs.tax_name = "Tax Name is required";
    if (!form.tax_value.trim()) errs.tax_value = "Tax Value is required";
    else if (isNaN(Number(form.tax_value))) errs.tax_value = "Must be a number";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(): Promise<boolean> {
    if (!validate()) return false;
    const payload = taxFormToPayload(form);
    let ok = false;

    if (isCreating) {
      const result = await dispatch(createSettingThunk(payload));
      if (createSettingThunk.fulfilled.match(result)) {
        const created = result.payload as Setting;
        const newId = created.id;
        await dispatch(fetchSettingsThunk());
        setSelectedId(newId);
        setIsCreating(false);
        // Populate form from the server response so checkboxes reflect what was saved
        setForm(settingToTaxForm(created));
        ok = true;
      }
    } else if (selectedId != null) {
      const result = await dispatch(updateSettingThunk({ id: selectedId, data: payload }));
      if (updateSettingThunk.fulfilled.match(result)) {
        await dispatch(fetchSettingsThunk());
        // Populate form from the server response so checkboxes reflect what was saved
        setForm(settingToTaxForm(result.payload as Setting));
        ok = true;
      }
    }

    if (ok) setFormDirty(false);
    return ok;
  }

  async function handleDelete() {
    if (selectedId == null) return;
    const result = await dispatch(deleteSettingThunk(selectedId));
    if (deleteSettingThunk.fulfilled.match(result)) {
      setSelectedId(null);
      setIsCreating(false);
      setForm(EMPTY_FORM);
      setFormDirty(false);
      // Re-fetch to ensure list is accurate
      dispatch(fetchSettingsThunk());
    }
  }

  function setCheck(field: keyof TaxForm, val: boolean) {
    setFormDirty(true);
    setForm((f) => ({ ...f, [field]: val }));
  }

  function handleTypeClick(type: string) {
    const existing = taxSettings.find((s) => parseTaxValue(s.value).tax_type === type);
    if (existing) {
      handleSelect(existing);
      return;
    }
    // No mapping for this type yet — clicking it would start creating one,
    // which requires GST to be enabled.
    if (!moduleConfig.enabled) return;
    setSelectedId(null);
    setIsCreating(true);
    setForm({ ...EMPTY_FORM, tax_type: type, tax_name: type });
    setFormErrors({});
    setFormDirty(false);
  }

  const showForm = isCreating || selectedId != null;
  const isDeleting = loading.delete;
  const panelTitle = isCreating ? "Create Tax" : "Tax Details";

  const pageIsDirty = moduleHasChanges || formDirty;

  // Warn on tab close/refresh with unsaved changes still pending.
  useEffect(() => {
    if (!pageIsDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pageIsDirty]);

  function handlePageCancel() {
    if (!pageIsDirty) return;
    if (moduleHasChanges) cancelModuleConfigChanges();
    if (showForm) handleCancel();
    setFormDirty(false);
  }

  async function handlePageSave() {
    if (!pageIsDirty) return;

    setPageSaving(true);
    const moduleOk = moduleHasChanges ? await saveModuleConfig() : true;
    const formOk = showForm && formDirty ? await handleSave() : true;
    setPageSaving(false);

    if (moduleOk && formOk) {
      showSuccess("Tax settings saved");
    } else {
      showError("Some changes failed to save — please check the highlighted fields and try again.");
    }
  }

  return (
    <>
      {overlay}
      {/* Page Header */}
      <div className="settings-page-header">
        <div>
          <h2 className="settings-page-title">GST &amp; Tax Settings</h2>
          <p className="settings-page-subtitle">
            Configure GST module behavior and manage tax mappings applied across the app.
          </p>
        </div>
      </div>

      {/* ── GST module config ── */}
      <div className="gst-module">
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">
              Enable GST{" "}
              <span className={`s-badge gst-module__status-badge ${moduleConfig.enabled ? "s-badge-success" : "s-badge-gray"}`}>
                {moduleConfig.enabled ? "Active" : "Inactive"}
              </span>
            </p>
            <p className="settings-toggle-desc">
              {moduleConfig.enabled
                ? "GST is calculated on eligible bills using the Tax Mappings below."
                : "GST is off — no tax is calculated or shown anywhere in the app."}
            </p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={moduleConfig.enabled}
              onChange={(e) => setModuleConfig((c) => ({ ...c, enabled: e.target.checked }))}
              disabled={moduleSaving}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>

        {moduleConfig.enabled && (
          <div className="gst-module__grid">
            <div className="gst-module__field">
              <label className="sm-split__label">Invoice Number Prefix</label>
              <input
                type="text"
                className="sm-split__input"
                value={moduleConfig.invoice_prefix}
                onChange={(e) => setModuleConfig((c) => ({ ...c, invoice_prefix: e.target.value.toUpperCase() }))}
                onBlur={() => setModuleConfig((c) => ({ ...c, invoice_prefix: c.invoice_prefix || "INV" }))}
                placeholder="INV"
                disabled={!moduleConfig.enabled || moduleSaving}
              />
            </div>

            <label className="sm-split__check-item gst-module__check">
              <input
                type="checkbox"
                checked={moduleConfig.show_breakup_on_invoice}
                onChange={(e) => setModuleConfig((c) => ({ ...c, show_breakup_on_invoice: e.target.checked }))}
                disabled={!moduleConfig.enabled || moduleSaving}
              />
              Show GST breakup on invoice
            </label>

            <label className="sm-split__check-item gst-module__check">
              <input
                type="checkbox"
                checked={moduleConfig.enable_gst_reports}
                onChange={(e) => setModuleConfig((c) => ({ ...c, enable_gst_reports: e.target.checked }))}
                disabled={!moduleConfig.enabled || moduleSaving}
              />
              Enable GST Reports
            </label>

            <div className="gst-module__field">
              <label className="sm-split__label">GSTIN / Business Legal Name</label>
              <div className="gst-module__gstin">
                <span>{currentSalon?.gst_number || "Not set"}</span>
                <span className="gst-module__gstin-sep">·</span>
                <span>{currentSalon?.business_name || "Not set"}</span>
                <a href="/dashboard/settings/business" className="gst-module__gstin-link">
                  Edit in Business Settings
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sm-split">
      {/* ── Left: List Panel ── */}
      <div className="sm-split__list">
        {/* Search */}
        <div className="sm-split__search">
          <span className="sm-split__search-icon">
            <Search size={14} />
          </span>
          <input
            type="text"
            className="sm-split__search-input"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Items */}
        <div className="sm-split__items" ref={listRef}>
          {loading.fetchAll ? (
            <div className="sm-split__list-loading">Loading…</div>
          ) : (
            <>
              {/* ── Predefined tax type shortcuts ── */}
              <div className="sm-split__type-hint">Tax Types</div>
              {TAX_TYPES.filter((t) => t !== "Other").map((type) => (
                <div
                  key={type}
                  className={`sm-split__item sm-split__item--type${
                    showForm && form.tax_type === type ? " active" : ""
                  }`}
                  onClick={() => handleTypeClick(type)}
                >
                  {type}
                </div>
              ))}

              {/* ── Saved tax mappings from the API ── */}
              {filtered.length > 0 && (
                <>
                  <div className="sm-split__type-hint" style={{ marginTop: 8 }}>
                    Tax Mappings
                  </div>
                  {filtered.map((setting) => (
                    <div
                      key={setting.id}
                      className={`sm-split__item${setting.id === selectedId ? " active" : ""}`}
                      onClick={() => handleSelect(setting)}
                    >
                      {listLabel(setting)}
                    </div>
                  ))}
                </>
              )}

              {search && filtered.length === 0 && (
                <div className="sm-split__list-loading">No results found</div>
              )}
            </>
          )}
        </div>

        {/* Create New */}
        <div className="sm-split__footer">
          <button className="sm-split__create-btn" onClick={handleCreateNew} disabled={!moduleConfig.enabled}>
            Create New
          </button>
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      <div className="sm-split__detail">
        {!showForm ? (
          <div className="sm-split__empty-state">
            <p>Select a tax from the list or click Create New</p>
          </div>
        ) : (
          <>
            <h3 className="sm-split__detail-title">{panelTitle}</h3>

            {/* Row 1: Tax Name + Tax Value */}
            <div className="sm-split__form-row">
              <div className="sm-split__form-group">
                <label className="sm-split__label">Tax Name</label>
                <input
                  type="text"
                  className={`sm-split__input${formErrors.tax_name ? " sm-split__input--error" : ""}`}
                  placeholder="Enter Tax Name"
                  value={form.tax_name}
                  onChange={(e) => { setFormDirty(true); setForm((f) => ({ ...f, tax_name: e.target.value })); }}
                  disabled={!moduleConfig.enabled}
                />
                {formErrors.tax_name && (
                  <span className="settings-error">{formErrors.tax_name}</span>
                )}
              </div>

              <div className="sm-split__form-group">
                <label className="sm-split__label">Tax Value</label>
                <div className={`sm-split__value-wrap${formErrors.tax_value ? " sm-split__value-wrap--error" : ""}`}>
                  <input
                    type="number"
                    className="sm-split__value-input"
                    placeholder="Enter Tax Value"
                    value={form.tax_value}
                    min={0}
                    onChange={(e) => { setFormDirty(true); setForm((f) => ({ ...f, tax_value: e.target.value })); }}
                    disabled={!moduleConfig.enabled}
                  />
                  <span className="sm-split__value-badge">%</span>
                </div>
                {formErrors.tax_value && (
                  <span className="settings-error">{formErrors.tax_value}</span>
                )}
              </div>
            </div>

            {/* Status: Active / Inactive / Included */}
            <p className="sm-split__applicable-label">Status</p>
            <div className="sm-split__status-row">
              {(Object.keys(TAX_STATUS_INFO) as TaxStatus[]).map((status) => (
                <label
                  key={status}
                  className={`sm-split__status-pill${statusFromForm(form) === status ? " active" : ""}`}
                >
                  <input
                    type="radio"
                    name="tax-status"
                    checked={statusFromForm(form) === status}
                    onChange={() => { setFormDirty(true); setForm((f) => applyStatus(f, status)); }}
                    disabled={!moduleConfig.enabled}
                  />
                  {TAX_STATUS_INFO[status].label}
                </label>
              ))}
            </div>
            <p className="sm-split__status-hint">{TAX_STATUS_INFO[statusFromForm(form)].hint}</p>

            {/* Applicable For */}
            <p className="sm-split__applicable-label">Applicable For</p>
            <div className="sm-split__applicable-row" style={{ marginBottom: 20 }}>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.applicable_service}
                  onChange={(e) => setCheck("applicable_service", e.target.checked)}
                  disabled={!moduleConfig.enabled}
                />
                Service
              </label>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.applicable_product}
                  onChange={(e) => setCheck("applicable_product", e.target.checked)}
                  disabled={!moduleConfig.enabled}
                />
                Product
              </label>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.applicable_membership}
                  onChange={(e) => setCheck("applicable_membership", e.target.checked)}
                  disabled={!moduleConfig.enabled}
                />
                Membership
              </label>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.applicable_packages}
                  onChange={(e) => setCheck("applicable_packages", e.target.checked)}
                  disabled={!moduleConfig.enabled}
                />
                Packages
              </label>
            </div>

            {/* Delete stays here as an immediate, standalone action (not a
                pending change) — Save/Cancel for edits now live in the page
                header above. */}
            {moduleConfig.enabled && !isCreating && selectedId != null && (
              <>
                <hr className="sm-split__divider" />
                <div className="sm-split__actions">
                  <button
                    type="button"
                    className="sm-split__btn sm-split__btn--danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    style={{ marginRight: "auto" }}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      </div>
      
      <div className="settings-action-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-color, #eaeaea)" }}>
        <Button
          variant="outline-dark"
          onClick={handlePageCancel}
          disabled={pageSaving || !pageIsDirty}
          iconLeft={<X size={14} />}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          loading={pageSaving}
          disabled={pageSaving || !pageIsDirty}
          onClick={handlePageSave}
          iconLeft={<Save size={14} />}
        >
          Save Changes
        </Button>
      </div>
    </>
  );
}
