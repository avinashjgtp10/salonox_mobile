import React, { useState, useEffect } from "react";
import { X, PencilSquare, BoxSeam } from "react-bootstrap-icons";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import "../styles/ProductDrawer.scss";

// ── Constants ─────────────────────────────────────────────────────────────────

const MEASURE_UNITS = [
  { value: "ml", label: "ml" },
  { value: "l",  label: "l"  },
  { value: "g",  label: "g"  },
  { value: "kg", label: "kg" },
  { value: "pcs", label: "pcs" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
];

const TAX_OPTIONS = [
  { value: "no_tax",  label: "No tax"   },
  { value: "gst_5",   label: "GST 5%"   },
  { value: "gst_12",  label: "GST 12%"  },
  { value: "gst_18",  label: "GST 18%"  },
  { value: "gst_28",  label: "GST 28%"  },
  { value: "custom",  label: "Custom"   },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditForm {
  name: string;
  barcode: string;
  brand_id: string;
  category_id: string;
  measure_unit: string;
  amount: string;
  supply_price: string;
  retail_price: string;
  markup_percentage: string;
  tax_type: string;
  custom_tax_rate: string;
  team_commission_enabled: boolean;
  team_commission_rate: string;
  short_description: string;
  description: string;
  retail_sales_enabled: boolean;
}

interface ProductDrawerProps {
  product: any;
  brands: any[];
  categories: any[];
  loading: boolean;
  onClose: () => void;
  onSave: (id: string, data: Record<string, any>) => Promise<any>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const productToForm = (p: any): EditForm => ({
  name:                    p.name ?? "",
  barcode:                 p.barcode ?? "",
  brand_id:                p.brand_id ?? "",
  category_id:             p.category_id ?? "",
  measure_unit:            p.measure_unit ?? "ml",
  amount:                  p.amount != null ? String(p.amount) : "",
  supply_price:            p.supply_price != null ? String(p.supply_price) : "",
  retail_price:            p.retail_price != null ? String(p.retail_price) : "",
  markup_percentage:       p.markup_percentage != null ? String(p.markup_percentage) : "",
  tax_type:                p.tax_type ?? "no_tax",
  custom_tax_rate:         p.custom_tax_rate != null ? String(p.custom_tax_rate) : "",
  team_commission_enabled: p.team_commission_enabled ?? false,
  team_commission_rate:    p.team_commission_rate != null ? String(p.team_commission_rate) : "",
  short_description:       p.short_description ?? "",
  description:             p.description ?? "",
  retail_sales_enabled:    p.retail_sales_enabled ?? true,
});

const taxLabel = (value: string) =>
  TAX_OPTIONS.find((t) => t.value === value)?.label ?? value;

// ── Component ─────────────────────────────────────────────────────────────────

const ProductDrawer: React.FC<ProductDrawerProps> = ({
  product,
  brands,
  categories,
  loading,
  onClose,
  onSave,
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<EditForm>(() => productToForm(product));
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever a new product is opened
  useEffect(() => {
    setForm(productToForm(product));
    setMode("view");
    setError(null);
  }, [product.id]);

  const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleMarkupChange = (val: string) => {
    const supply = parseFloat(form.supply_price);
    const markup = parseFloat(val);
    if (supply > 0 && markup >= 0) {
      const retail = (supply * (1 + markup / 100)).toFixed(2);
      setForm((prev) => ({ ...prev, markup_percentage: val, retail_price: retail }));
    } else {
      setField("markup_percentage", val);
    }
  };

  // Auto-recalculate markup when supply/retail change
  useEffect(() => {
    if (mode !== "edit") return;
    const supply = parseFloat(form.supply_price);
    const retail = parseFloat(form.retail_price);
    if (supply > 0 && retail > 0) {
      const markup = (((retail - supply) / supply) * 100).toFixed(2);
      setField("markup_percentage", markup);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.supply_price, form.retail_price]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Product name is required."); return; }
    setError(null);

    const payload: Record<string, any> = {
      name:                    form.name.trim(),
      measure_unit:            form.measure_unit,
      retail_sales_enabled:    form.retail_sales_enabled,
      tax_type:                form.tax_type,
      team_commission_enabled: form.team_commission_enabled,
      ...(form.barcode            && { barcode:              form.barcode }),
      ...(form.brand_id           && { brand_id:             form.brand_id }),
      ...(form.category_id        && { category_id:          form.category_id }),
      ...(form.amount             && { amount:               parseFloat(form.amount) }),
      ...(form.supply_price       && { supply_price:         parseFloat(form.supply_price) }),
      ...(form.retail_sales_enabled && form.retail_price     && { retail_price:       parseFloat(form.retail_price) }),
      ...(form.retail_sales_enabled && form.markup_percentage && { markup_percentage: parseFloat(form.markup_percentage) }),
      ...(form.tax_type === "custom" && form.custom_tax_rate  && { custom_tax_rate:   parseFloat(form.custom_tax_rate) }),
      ...(form.team_commission_enabled && form.team_commission_rate && { team_commission_rate: parseFloat(form.team_commission_rate) }),
      ...(form.short_description  && { short_description:    form.short_description }),
      ...(form.description        && { description:          form.description }),
    };

    const result = await onSave(product.id, payload);
    if (result?.error) {
      setError(result.payload ?? "Failed to save changes.");
    } else {
      setMode("view");
    }
  };

  const handleCancel = () => {
    setForm(productToForm(product));
    setError(null);
    setMode("view");
  };

  const brandName  = brands.find((b: any) => b.id === product.brand_id)?.name ?? "—";
  const categoryName = categories.find((c: any) => c.id === product.category_id)?.name ?? "—";

  return (
    <>
      {/* Backdrop */}
      <div className="pd-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="pd-panel">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="pd-panel__header">
          <div className="pd-panel__header-left">
            <div className="pd-panel__icon"><BoxSeam size={18} /></div>
            <div>
              <h6 className="pd-panel__title">{product.name}</h6>
              <span className="pd-panel__sku">{product.barcode ?? "No SKU"}</span>
            </div>
          </div>
          <div className="pd-panel__header-actions">
            {mode === "view" && (
              <Button
                variant="outline-dark"
                size="sm"
                iconLeft={<PencilSquare size={14} />}
                onClick={() => setMode("edit")}
              >
                Edit
              </Button>
            )}
            <button className="pd-panel__close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="pd-panel__body">
          {error && (
            <div className="alert alert-danger rounded-3 py-2 px-3 mb-3" style={{ fontSize: "13px" }}>
              {error}
            </div>
          )}

          {mode === "view" ? (
            // ── View Mode ────────────────────────────────────────────
            <>
              <section className="pd-section">
                <h6 className="pd-section__title">Basic info</h6>
                <Field label="Product name"   value={product.name} />
                <Field label="SKU / Barcode"  value={product.barcode ?? "—"} />
                <Field label="Brand"          value={brandName} />
                <Field label="Category"       value={categoryName} />
                <Field
                  label="Measure / Amount"
                  value={product.amount != null ? `${product.amount} ${product.measure_unit ?? ""}` : "—"}
                />
                <Field label="Stock level"    value={`${product.amount ?? 0} in stock`} badge={
                  (product.amount ?? 0) === 0 ? "out" : (product.amount ?? 0) < 5 ? "low" : undefined
                } />
              </section>

              <section className="pd-section">
                <h6 className="pd-section__title">Pricing</h6>
                <Field label="Supply price"  value={product.supply_price  != null ? `₹${Number(product.supply_price).toLocaleString()}` : "—"} />
                <Field label="Retail price"  value={product.retail_price  != null ? `₹${Number(product.retail_price).toLocaleString()}`  : "—"} />
                <Field label="Markup"        value={product.markup_percentage != null ? `${product.markup_percentage}%` : "—"} />
                <Field label="Tax"           value={taxLabel(product.tax_type ?? "no_tax")} />
                {product.tax_type === "custom" && (
                  <Field label="Custom tax rate" value={`${product.custom_tax_rate ?? 0}%`} />
                )}
              </section>

              <section className="pd-section">
                <h6 className="pd-section__title">Commission</h6>
                <Field
                  label="Team commission"
                  value={product.team_commission_enabled ? "Enabled" : "Disabled"}
                  badge={product.team_commission_enabled ? "on" : undefined}
                />
                {product.team_commission_enabled && (
                  <Field label="Commission rate" value={`${product.team_commission_rate ?? 0}%`} />
                )}
              </section>

              {(product.short_description || product.description) && (
                <section className="pd-section">
                  <h6 className="pd-section__title">Description</h6>
                  {product.short_description && (
                    <Field label="Short description" value={product.short_description} />
                  )}
                  {product.description && (
                    <Field label="Full description" value={product.description} multiline />
                  )}
                </section>
              )}
            </>
          ) : (
            // ── Edit Mode ────────────────────────────────────────────
            <>
              <section className="pd-section">
                <h6 className="pd-section__title">Basic info</h6>
                <Input
                  label="Product name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                />
                <Input
                  label={<>SKU / Barcode <span className="text-muted fw-normal">(Optional)</span></>}
                  value={form.barcode}
                  onChange={(e) => setField("barcode", e.target.value)}
                />
                <Select
                  label="Brand"
                  value={form.brand_id}
                  onChange={(e) => setField("brand_id", e.target.value)}
                >
                  <option value="">No brand</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
                <Select
                  label="Category"
                  value={form.category_id}
                  onChange={(e) => setField("category_id", e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                <div className="row g-2">
                  <div className="col-6">
                    <Select
                      label="Measure unit"
                      value={form.measure_unit}
                      onChange={(e) => setField("measure_unit", e.target.value)}
                    >
                      {MEASURE_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-6">
                    <Input
                      label="Amount"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.amount}
                      onChange={(e) => setField("amount", e.target.value)}
                      containerClass=""
                    />
                  </div>
                </div>
                <Input
                  label="Short description"
                  value={form.short_description}
                  onChange={(e) => setField("short_description", e.target.value)}
                  maxLength={100}
                  showCharCount
                  containerClass="mt-2"
                />
                <Input
                  label="Full description"
                  multiline
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  maxLength={1000}
                  showCharCount
                />
              </section>

              <section className="pd-section">
                <h6 className="pd-section__title">Pricing</h6>
                <Input
                  label="Supply price"
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={form.supply_price}
                  onChange={(e) => setField("supply_price", e.target.value)}
                  iconLeft={<span>₹</span>}
                />
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input shadow-none"
                      type="checkbox"
                      role="switch"
                      checked={form.retail_sales_enabled}
                      onChange={() => setField("retail_sales_enabled", !form.retail_sales_enabled)}
                      style={{ cursor: "pointer", width: "2.5rem", height: "1.25rem" }}
                    />
                  </div>
                  <span style={{ fontSize: "13px" }}>Enable retail sales</span>
                </div>
                {form.retail_sales_enabled && (
                  <div className="row g-2">
                    <div className="col-6">
                      <Input
                        label="Retail price"
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={form.retail_price}
                        onChange={(e) => setField("retail_price", e.target.value)}
                        iconLeft={<span>₹</span>}
                        containerClass=""
                      />
                    </div>
                    <div className="col-6">
                      <Input
                        label="Markup"
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={form.markup_percentage}
                        onChange={(e) => handleMarkupChange(e.target.value)}
                        iconLeft={<span>%</span>}
                        containerClass=""
                      />
                    </div>
                  </div>
                )}
                <Select
                  label="Tax"
                  value={form.tax_type}
                  onChange={(e) => setField("tax_type", e.target.value)}
                >
                  {TAX_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
                {form.tax_type === "custom" && (
                  <Input
                    label="Custom tax rate (%)"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={form.custom_tax_rate}
                    onChange={(e) => setField("custom_tax_rate", e.target.value)}
                  />
                )}
              </section>

              <section className="pd-section">
                <h6 className="pd-section__title">Commission</h6>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input shadow-none"
                      type="checkbox"
                      role="switch"
                      checked={form.team_commission_enabled}
                      onChange={() => setField("team_commission_enabled", !form.team_commission_enabled)}
                      style={{ cursor: "pointer", width: "2.5rem", height: "1.25rem" }}
                    />
                  </div>
                  <span style={{ fontSize: "13px" }}>Enable team commission</span>
                </div>
                {form.team_commission_enabled && (
                  <Input
                    label="Commission rate (%)"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={form.team_commission_rate}
                    onChange={(e) => setField("team_commission_rate", e.target.value)}
                  />
                )}
              </section>
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        {mode === "edit" && (
          <div className="pd-panel__footer">
            <Button variant="outline-dark" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button variant="dark" onClick={handleSave} loading={loading}>
              Save changes
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Field (view-mode row) ─────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  badge?: "low" | "out" | "on";
  multiline?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, badge, multiline }) => (
  <div className="pd-field">
    <span className="pd-field__label">{label}</span>
    <span className={`pd-field__value${multiline ? " pd-field__value--multiline" : ""}`}>
      {value}
      {badge === "out" && <span className="pd-badge pd-badge--danger ms-2">Out of stock</span>}
      {badge === "low" && <span className="pd-badge pd-badge--warning ms-2">Low stock</span>}
      {badge === "on"  && <span className="pd-badge pd-badge--success ms-2">Active</span>}
    </span>
  </div>
);

export default ProductDrawer;
