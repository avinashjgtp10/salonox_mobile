import { useState, useEffect, useMemo, useRef } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
  deleteSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import { clearSettingError } from "../../../store/settingSlice";
import type { Setting, CreateSettingPayload } from "../../../types/setting.types";

const TAX_TYPES = ["CGST", "SGST", "IGST", "GST", "VAT", "CESS", "Other"];

function inferTaxType(key: string): string {
  const upper = key.trim().toUpperCase();
  for (const t of TAX_TYPES) {
    if (t === "Other") continue;
    if (upper === t || upper.startsWith(t)) return t;
  }
  return "";
}

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
  inclusive_taxes: true,
  applicable_service: true,
  applicable_product: true,
  applicable_membership: false,
  applicable_packages: false,
};

function taxFormToPayload(f: TaxForm): CreateSettingPayload {
  return {
    key: f.tax_name,
    value: f.tax_value,
    tax_type: f.tax_type,
    active: f.active,
    inclusive_taxes: f.inclusive_taxes,
    applicable_for: {
      service: f.applicable_service,
      product: f.applicable_product,
      membership: f.applicable_membership,
      packages: f.applicable_packages,
    },
  };
}

function settingToTaxForm(s: Setting): TaxForm {
  const applicable = (s.applicable_for as Record<string, boolean> | undefined) ?? {};
  const savedType = (s.tax_type as string) ?? "";
  return {
    tax_type: savedType || inferTaxType(s.key ?? ""),
    tax_name: s.key ?? "",
    tax_value: s.value !== null && s.value !== undefined ? String(s.value) : "",
    active:                s.active             != null ? Boolean(s.active)             : true,
    inclusive_taxes:       s.inclusive_taxes    != null ? Boolean(s.inclusive_taxes)    : true,
    applicable_service:    applicable.service   != null ? Boolean(applicable.service)   : true,
    applicable_product:    applicable.product   != null ? Boolean(applicable.product)   : true,
    applicable_membership: applicable.membership!= null ? Boolean(applicable.membership): false,
    applicable_packages:   applicable.packages  != null ? Boolean(applicable.packages)  : false,
  };
}

function listLabel(s: Setting): string {
  const type = (s.tax_type as string) || inferTaxType(s.key ?? "");
  const name = s.key ?? "";
  const val  = s.value !== null && s.value !== undefined ? String(s.value) : "";
  const prefix = type && type !== "Other" ? type : name.toUpperCase();
  return val ? `${prefix} (${val}%)` : prefix;
}

export default function SettingsManagementPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.setting);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<TaxForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearSettingError());
    }
  }, [error, dispatch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      s.key.toLowerCase().includes(q) ||
      String(s.value).toLowerCase().includes(q) ||
      String(s.tax_type ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const selectedSetting = useMemo(
    () => items.find((s) => s.id === selectedId) ?? null,
    [items, selectedId]
  );

  function handleSelect(setting: Setting) {
    setSelectedId(setting.id);
    setIsCreating(false);
    setForm(settingToTaxForm(setting));
    setFormErrors({});
  }

  function handleCreateNew() {
    setSelectedId(null);
    setIsCreating(true);
    setForm(EMPTY_FORM);
    setFormErrors({});
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
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.tax_name.trim()) errs.tax_name = "Tax Name is required";
    if (!form.tax_value.trim()) errs.tax_value = "Tax Value is required";
    else if (isNaN(Number(form.tax_value))) errs.tax_value = "Must be a number";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = taxFormToPayload(form);

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
      }
    } else if (selectedId != null) {
      const result = await dispatch(updateSettingThunk({ id: selectedId, data: payload }));
      if (updateSettingThunk.fulfilled.match(result)) {
        await dispatch(fetchSettingsThunk());
        // Populate form from the server response so checkboxes reflect what was saved
        setForm(settingToTaxForm(result.payload as Setting));
      }
    }
  }

  async function handleDelete() {
    if (selectedId == null) return;
    const result = await dispatch(deleteSettingThunk(selectedId));
    if (deleteSettingThunk.fulfilled.match(result)) {
      setSelectedId(null);
      setIsCreating(false);
      setForm(EMPTY_FORM);
      // Re-fetch to ensure list is accurate
      dispatch(fetchSettingsThunk());
    }
  }

  function setCheck(field: keyof TaxForm, val: boolean) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function handleTypeClick(type: string) {
    setSelectedId(null);
    setIsCreating(true);
    setForm({ ...EMPTY_FORM, tax_type: type, tax_name: type });
    setFormErrors({});
  }

  const showForm = isCreating || selectedId != null;
  const isSaving = loading.create || loading.update;
  const isDeleting = loading.delete;
  const panelTitle = isCreating ? "Create Tax" : "Tax Details";

  return (
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
                    isCreating && form.tax_type === type ? " active" : ""
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
          <button className="sm-split__create-btn" onClick={handleCreateNew}>
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
                  onChange={(e) => setForm((f) => ({ ...f, tax_name: e.target.value }))}
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
                    onChange={(e) => setForm((f) => ({ ...f, tax_value: e.target.value }))}
                  />
                  <span className="sm-split__value-badge">%</span>
                </div>
                {formErrors.tax_value && (
                  <span className="settings-error">{formErrors.tax_value}</span>
                )}
              </div>
            </div>

            {/* Active + Inclusive Taxes */}
            <div className="sm-split__check-row">
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setCheck("active", e.target.checked)}
                />
                Active
              </label>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.inclusive_taxes}
                  onChange={(e) => setCheck("inclusive_taxes", e.target.checked)}
                />
                Inclusive Taxes
              </label>
            </div>

            {/* Applicable For */}
            <p className="sm-split__applicable-label">Applicable For</p>
            <div className="sm-split__applicable-row" style={{ marginBottom: 20 }}>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.applicable_service}
                  onChange={(e) => setCheck("applicable_service", e.target.checked)}
                />
                Service
              </label>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.applicable_product}
                  onChange={(e) => setCheck("applicable_product", e.target.checked)}
                />
                Product
              </label>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.applicable_membership}
                  onChange={(e) => setCheck("applicable_membership", e.target.checked)}
                />
                Membership
              </label>
              <label className="sm-split__check-item">
                <input
                  type="checkbox"
                  checked={form.applicable_packages}
                  onChange={(e) => setCheck("applicable_packages", e.target.checked)}
                />
                Packages
              </label>
            </div>

            <hr className="sm-split__divider" />

            <div className="sm-split__actions">
              {!isCreating && selectedId != null && (
                <button
                  className="sm-split__btn sm-split__btn--danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{ marginRight: "auto" }}
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              )}
              <button
                className="sm-split__btn"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="sm-split__btn sm-split__btn--primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
