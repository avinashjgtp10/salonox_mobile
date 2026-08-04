import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { X, Trash } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchBrandsThunk, fetchCategoriesThunk, createProductThunk, updateProductThunk, createBrandThunk, createCategoryThunk } from "../../../middleware/catalog/products.thunk";
import { fetchSuppliersThunk, createSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import api from "../../../services/api/axios";
import { PRODUCTS } from "../../../services/api/endpoints/products.endpoints";
import { SERVICES } from "../../../services/api/endpoints/services.endpoints";
import { PRODUCT_UNITS, TAX_TYPE_OPTIONS, type ProductType, type ProductUnit, type TaxType } from "../types/product.types";
import type { ConsumableDetail } from "../../../types/inventory.types";
import "../styles/ConsumableFormPage.scss";

interface AssignedServiceDraft {
  service_id: string;
  name: string;
  qty: string;
  unit: string;
}

const MIN_SEARCH_LENGTH = 2;

// Searchable dropdown for Category/Brand/Supplier — filters an already-loaded
// list client-side (no debounced API call needed, unlike the Service
// Assignment search below, since these lists are small and already in
// Redux). Reuses the same open/type/pick interaction as that search, just
// without the network round-trip.
const SearchSelect: React.FC<{
  value: string;
  options: { id: string; name: string }[];
  placeholder: string;
  onChange: (id: string) => void;
  onBlur?: () => void;
  allowNone?: boolean;
}> = ({ value, options, placeholder, onChange, onBlur, allowNone }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  const displayValue = open ? query : (selected?.name ?? (value === "" && allowNone ? "None" : ""));
  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className="cf-search-select">
      <input
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onBlur={() => { setTimeout(() => { setOpen(false); onBlur?.(); }, 180); }}
      />
      {open && (
        <div className="cf-search-select__drop">
          {allowNone && (
            <div className="cf-search-select__item" onMouseDown={() => { onChange(""); setQuery(""); setOpen(false); }}>None</div>
          )}
          {filtered.length === 0 ? (
            <div className="cf-search-select__empty">No matches</div>
          ) : (
            filtered.map((o) => (
              <div key={o.id} className="cf-search-select__item" onMouseDown={() => { onChange(o.id); setQuery(""); setOpen(false); }}>{o.name}</div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Inline "+ Add X" affordance — types a name, saves via the given thunk,
// and selects the newly created record. Shared across Category/Brand/
// Supplier so a missing option never forces a trip to another page.
const QuickAdd: React.FC<{
  label: string;
  onAdd: (name: string) => Promise<void>;
}> = ({ label, onAdd }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(value.trim());
      setValue("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="cf-quick-add-link" onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  }

  return (
    <div className="cf-quick-add-row">
      <input
        autoFocus
        placeholder={`${label.replace(/^Add a /i, "")} name`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setOpen(false); setValue(""); } }}
      />
      <button type="button" className="cf-quick-add-save" onClick={submit} disabled={!value.trim() || saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" className="cf-quick-add-cancel" onClick={() => { setOpen(false); setValue(""); }}>
        Cancel
      </button>
    </div>
  );
};

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "retail", label: "Retail" },
  { value: "consumable", label: "Consumable" },
  { value: "both", label: "Both (also sold retail)" },
];

const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { categories, brands } = useSelector((s: RootState) => s.products);
  const suppliers = useSelector((s: RootState) => s.inventory.suppliers);

  // Same form is mounted at two route groups (Catalog > Products, and
  // Catalog > Consumable Inventory) — where the user entered from decides
  // both the default Product Type and where Save/Close return to.
  const fromConsumables = location.pathname.includes("/inventory/consumables");
  const listPath = fromConsumables ? "/dashboard/catalog/inventory/consumables" : "/dashboard/catalog/products";

  // ── Basic info ──────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");

  // ── Inventory setup ─────────────────────────────────────────────────────
  const [productQty, setProductQty] = useState("");
  const [unitSize, setUnitSize] = useState("");
  const [unit, setUnit] = useState<ProductUnit>(fromConsumables ? "ml" : "pcs");
  const [qtyAlert, setQtyAlert] = useState("");

  const [productType, setProductType] = useState<ProductType>(fromConsumables ? "consumable" : "retail");
  const isConsumable = productType === "consumable" || productType === "both";
  const sellsRetail = productType === "retail" || productType === "both";

  // ── Service assignment (consumable/both only) ───────────────────────────
  const [assignedServices, setAssignedServices] = useState<AssignedServiceDraft[]>([]);
  const [originalAssignedIds, setOriginalAssignedIds] = useState<Set<string>>(new Set());
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceResults, setServiceResults] = useState<{ id: string; name: string }[]>([]);
  const [showServiceDrop, setShowServiceDrop] = useState(false);
  const serviceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Supply info ──────────────────────────────────────────────────────────
  const [supplyPrice, setSupplyPrice] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("no_tax");
  const [customTaxRate, setCustomTaxRate] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [retailPrice, setRetailPrice] = useState("");

  // ── Usage stats, for the live preview (edit mode only — a new product has no history yet) ──
  const [usageStats, setUsageStats] = useState<ConsumableDetail["usage_stats"] | null>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Submit-only validation: no error shows just from focusing/blurring a
  // field (blur-triggered validation fires when focus moves to ANOTHER
  // field, e.g. an autofocused Product Name, surfacing its error before the
  // user had even reached it). Errors only appear after a Save attempt;
  // once that's happened, they clear live as each field becomes valid.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
    dispatch(fetchBrandsThunk());
    dispatch(fetchSuppliersThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const productRes = await api.get(PRODUCTS.BY_ID(id));
        const p = productRes.data?.data;
        const consumableType = p.product_type === "consumable" || p.product_type === "both";
        const detail: ConsumableDetail | null = consumableType
          ? (await api.get(`/api/v1/inventory/consumables/${id}`)).data?.data
          : null;
        setName(p.name || "");
        setBarcode(p.barcode || "");
        setCategoryId(p.category_id || "");
        setBrandId(p.brand_id || "");
        setSupplierId(p.supplier_id || "");
        setDescription(p.description || "");
        setUnit((p.measure_unit || "ml") as ProductUnit);
        setUnitSize(p.bottle_size != null ? String(p.bottle_size) : "");
        setProductQty(
          detail ? (p.bottle_size ? String(detail.product_qty) : String(p.amount ?? "")) : String(p.amount ?? "")
        );
        setQtyAlert(p.qty_alert != null ? String(p.qty_alert) : "");
        setProductType((p.product_type as ProductType) || "retail");
        setSupplyPrice(p.supply_price != null ? String(p.supply_price) : "");
        setTaxType((p.tax_type || "no_tax") as TaxType);
        setCustomTaxRate(p.custom_tax_rate != null ? String(p.custom_tax_rate) : "");
        setHsnSac(p.hsn_sac || "");
        setRetailPrice(p.retail_price != null ? String(p.retail_price) : "");
        if (detail) {
          setUsageStats(detail.usage_stats);
          const drafts = detail.assigned_services.map((s) => ({ service_id: s.service_id, name: s.name, qty: String(s.qty), unit: s.unit || "" }));
          setAssignedServices(drafts);
          setOriginalAssignedIds(new Set(drafts.map((d) => d.service_id)));
        }
      } catch {
        setError("Failed to load this product — try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, id]);

  // ── Service search ──────────────────────────────────────────────────────
  function handleServiceSearch(term: string) {
    setServiceSearch(term);
    setShowServiceDrop(true);
    if (serviceDebounceRef.current) clearTimeout(serviceDebounceRef.current);
    if (term.trim().length < MIN_SEARCH_LENGTH) { setServiceResults([]); return; }
    serviceDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(SERVICES.LIST(`search=${encodeURIComponent(term.trim())}&is_active=true&limit=20`));
        const raw = res.data?.data?.data ?? res.data?.data ?? [];
        setServiceResults(Array.isArray(raw) ? raw.map((s: any) => ({ id: String(s.id), name: s.name })) : []);
      } catch {
        setServiceResults([]);
      }
    }, 300);
  }

  function assignService(service: { id: string; name: string }) {
    if (assignedServices.some((a) => a.service_id === service.id)) { setServiceSearch(""); setShowServiceDrop(false); return; }
    setAssignedServices((prev) => [...prev, { service_id: service.id, name: service.name, qty: unitSize || "1", unit }]);
    setServiceSearch("");
    setShowServiceDrop(false);
  }

  async function handleAddCategory(name: string) {
    const result = await dispatch(createCategoryThunk({ name })).unwrap();
    if (result?.id) setCategoryId(result.id);
  }

  async function handleAddBrand(name: string) {
    const result = await dispatch(createBrandThunk({ name })).unwrap();
    if (result?.id) setBrandId(result.id);
  }

  async function handleAddSupplier(name: string) {
    const result = await dispatch(createSupplierThunk({ name })).unwrap();
    if (result?.id) setSupplierId(result.id);
  }

  function removeAssignedService(serviceId: string) {
    setAssignedServices((prev) => prev.filter((a) => a.service_id !== serviceId));
  }

  function updateAssignedServiceQty(serviceId: string, qty: string) {
    setAssignedServices((prev) => prev.map((a) => (a.service_id === serviceId ? { ...a, qty } : a)));
  }

  // ── Live preview calc ────────────────────────────────────────────────────
  const qtyNum = parseFloat(productQty) || 0;
  const sizeNum = parseFloat(unitSize) || 0;
  // Retail-only products track plain stock count — no bottle-size multiplier.
  const totalAvailable = isConsumable && sizeNum > 0 ? qtyNum * sizeNum : qtyNum;
  const alertNum = parseFloat(qtyAlert) || 0;
  const previewStatus = qtyNum <= 0 ? "out_of_stock" : (alertNum > 0 && qtyNum <= alertNum ? "low" : "healthy");
  const avgUsage = usageStats?.average_per_service ?? 0;
  const estimatedServices = avgUsage > 0 ? Math.floor(totalAvailable / avgUsage) : null;

  const nameError = submitAttempted && !name.trim() ? "Product name is required" : "";
  const categoryError = submitAttempted && !categoryId ? "Category is required" : "";
  const qtyError = submitAttempted && (!productQty || qtyNum < 0) ? "Product quantity is required" : "";
  const unitSizeError = submitAttempted && isConsumable && !unitSize ? "Unit size is required" : "";
  const retailPriceError = submitAttempted && sellsRetail && (!retailPrice || parseFloat(retailPrice) <= 0)
    ? "Retail price is required" : "";
  const isValid = !!name.trim() && !!categoryId && !!productQty && qtyNum >= 0
    && (!isConsumable || !!unitSize) && (!sellsRetail || (!!retailPrice && parseFloat(retailPrice) > 0));

  async function syncServiceAssignments(productId: string) {
    const currentIds = new Set(assignedServices.map((a) => a.service_id));
    const removed = [...originalAssignedIds].filter((sid) => !currentIds.has(sid));

    const upsertOne = async (serviceId: string, qty: number, itemUnit: string) => {
      const res = await api.get(SERVICES.BY_ID(serviceId));
      const svc = res.data?.data;
      const recipe = (svc?.consumables_used ?? []).filter((c: any) => c.product_id !== productId);
      await api.patch(SERVICES.BY_ID(serviceId), { consumables_used: [...recipe, { product_id: productId, qty, unit: itemUnit }] });
    };
    const removeOne = async (serviceId: string) => {
      const res = await api.get(SERVICES.BY_ID(serviceId));
      const svc = res.data?.data;
      const recipe = (svc?.consumables_used ?? []).filter((c: any) => c.product_id !== productId);
      await api.patch(SERVICES.BY_ID(serviceId), { consumables_used: recipe });
    };

    for (const a of assignedServices) {
      await upsertOne(a.service_id, parseFloat(a.qty) || 0, a.unit || unit);
    }
    for (const serviceId of removed) {
      await removeOne(serviceId);
    }
  }

  async function handleSubmit() {
    setSubmitAttempted(true);
    if (!isValid) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        category_id: categoryId,
        brand_id: brandId || undefined,
        supplier_id: supplierId || undefined,
        description: description.trim() || undefined,
        measure_unit: unit,
        product_type: productType,
        amount: totalAvailable,
        bottle_size: isConsumable && sizeNum > 0 ? sizeNum : null,
        qty_alert: isConsumable ? (alertNum > 0 ? alertNum : undefined) : Math.round(alertNum),
        supply_price: parseFloat(supplyPrice) || 0,
        tax_type: taxType,
        custom_tax_rate: taxType === "custom" ? parseFloat(customTaxRate) || 0 : undefined,
        hsn_sac: hsnSac.trim() || undefined,
        retail_sales_enabled: sellsRetail,
        retail_price: sellsRetail ? (parseFloat(retailPrice) || 0) : undefined,
      };

      let productId = id;
      if (isEdit && id) {
        await dispatch(updateProductThunk({ id, data: payload })).unwrap();
      } else {
        const created = await dispatch(createProductThunk(payload)).unwrap();
        productId = created.id;
      }

      if (isConsumable && productId) await syncServiceAssignments(productId);

      navigate(listPath);
    } catch (err: any) {
      setError(typeof err === "string" ? err : "Failed to save — try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="cf-page cf-page--loading">Loading…</div>;

  return (
    <div className="cf-page">
      <div className="cf-topbar">
        <button className="cf-close" onClick={() => navigate(listPath)}><X size={20} /></button>
        <h1>{isEdit ? "Edit Product" : "Add Product"}</h1>
        <button className="ci-btn ci-btn--primary" disabled={saving} onClick={handleSubmit}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error && <div className="cf-error-banner">{error}</div>}

      <div className="cf-body">
        {/* 1. Basic Information */}
        <section className="cf-card">
          <h3>Basic Information</h3>
          <div className="cf-field">
            <label>Product Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            {nameError && <span className="cf-field__error">{nameError}</span>}
          </div>
          <div className="cf-field">
            <label>Barcode (Optional)</label>
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>
          <div className="cf-row">
            <div className="cf-field">
              <label>Category *</label>
              <SearchSelect
                value={categoryId}
                options={categories.map((c: any) => ({ id: c.id, name: c.name }))}
                placeholder="Search category…"
                onChange={setCategoryId}
              />
              {categoryError && <span className="cf-field__error">{categoryError}</span>}
              <QuickAdd label="Add a category" onAdd={handleAddCategory} />
            </div>
            <div className="cf-field">
              <label>Brand</label>
              <SearchSelect
                value={brandId}
                options={brands.map((b: any) => ({ id: b.id, name: b.name }))}
                placeholder="Search brand…"
                onChange={setBrandId}
                allowNone
              />
              <QuickAdd label="Add a brand" onAdd={handleAddBrand} />
            </div>
          </div>
          <div className="cf-field">
            <label>Supplier</label>
            <SearchSelect
              value={supplierId}
              options={suppliers.map((s: any) => ({ id: s.id, name: s.name }))}
              placeholder="Search supplier…"
              onChange={setSupplierId}
              allowNone
            />
            <QuickAdd label="Add a supplier" onAdd={handleAddSupplier} />
          </div>
          <div className="cf-field">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="cf-field">
            <label>Product Type</label>
            <div className="cf-pill-toggle">
              {PRODUCT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={productType === opt.value ? "active" : ""}
                  onClick={() => {
                    setProductType(opt.value);
                    // Retail-only products are a plain unit count — no
                    // ml/g/kg measurement, so drop the unit selector and
                    // just track them as "pcs" behind the scenes.
                    if (opt.value === "retail") setUnit("pcs");
                    else if (unit === "pcs") setUnit("ml");
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Inventory Setup */}
        <section className="cf-card cf-card--highlight">
          <h3>Inventory Setup</h3>
          {isConsumable ? (
            <>
              <div className="cf-row">
                <div className="cf-field">
                  <label>Product Quantity *</label>
                  <input type="number" min={0} value={productQty} onChange={(e) => setProductQty(e.target.value)} />
                  {qtyError && <span className="cf-field__error">{qtyError}</span>}
                </div>
                <div className="cf-field">
                  <label>Unit Size *</label>
                  <input type="number" min={0} value={unitSize} onChange={(e) => setUnitSize(e.target.value)} placeholder="e.g. 1000" />
                  {unitSizeError && <span className="cf-field__error">{unitSizeError}</span>}
                </div>
                <div className="cf-field">
                  <label>Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value as ProductUnit)}>
                    {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="cf-total-display">
                Total Available Stock: <strong>{qtyNum || 0} × {sizeNum || 0} {unit} = {totalAvailable.toLocaleString()} {unit}</strong>
              </div>
              <div className="cf-field">
                <label>Low Stock Alert (in bottles/units)</label>
                <input type="number" min={0} value={qtyAlert} onChange={(e) => setQtyAlert(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="cf-field">
                <label>Stock Quantity *</label>
                <input type="number" min={0} step={1} value={productQty} onChange={(e) => setProductQty(e.target.value)} />
                {qtyError && <span className="cf-field__error">{qtyError}</span>}
              </div>
              <div className="cf-field">
                <label>Low Stock Alert</label>
                <input type="number" min={0} step={1} value={qtyAlert} onChange={(e) => setQtyAlert(e.target.value)} />
              </div>
            </>
          )}
        </section>

        {/* 3. Service Assignment — consumable/both only */}
        {isConsumable && (
          <section className="cf-card">
            <h3>Service Assignment</h3>
            <p className="cf-hint">Assign this product to the services that consume it, with how much each one uses.</p>
            <div className="cf-service-search">
              <input
                placeholder="Search a service to assign…"
                value={serviceSearch}
                onChange={(e) => handleServiceSearch(e.target.value)}
                onFocus={() => setShowServiceDrop(true)}
                onBlur={() => setTimeout(() => setShowServiceDrop(false), 180)}
              />
              {showServiceDrop && serviceResults.length > 0 && (
                <div className="cf-service-drop">
                  {serviceResults.map((s) => (
                    <div key={s.id} className="cf-service-drop__item" onMouseDown={() => assignService(s)}>{s.name}</div>
                  ))}
                </div>
              )}
            </div>
            {assignedServices.length > 0 && (
              <div className="cf-assigned-list">
                {assignedServices.map((a) => (
                  <div key={a.service_id} className="cf-assigned-row">
                    <span className="cf-assigned-row__name">{a.name}</span>
                    <input
                      type="number" min={0} className="cf-assigned-row__qty"
                      value={a.qty}
                      onChange={(e) => updateAssignedServiceQty(a.service_id, e.target.value)}
                    />
                    <span className="cf-assigned-row__unit">{unit}</span>
                    <button type="button" onClick={() => removeAssignedService(a.service_id)}><Trash size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 4. Supply Information */}
        <section className="cf-card">
          <h3>Supply Information</h3>
          <div className="cf-row">
            <div className="cf-field">
              <label>Supply Price</label>
              <input type="number" min={0} value={supplyPrice} onChange={(e) => setSupplyPrice(e.target.value)} />
            </div>
            <div className="cf-field">
              <label>Tax Type</label>
              <select value={taxType} onChange={(e) => setTaxType(e.target.value as TaxType)}>
                {TAX_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          {taxType === "custom" && (
            <div className="cf-field">
              <label>Custom Tax Rate (%)</label>
              <input type="number" min={0} value={customTaxRate} onChange={(e) => setCustomTaxRate(e.target.value)} />
            </div>
          )}
          <div className="cf-field">
            <label>HSN/SAC</label>
            <input value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} />
          </div>
          {sellsRetail && (
            <div className="cf-field">
              <label>Retail Price *</label>
              <input type="number" min={0} value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} />
              {retailPriceError && <span className="cf-field__error">{retailPriceError}</span>}
            </div>
          )}
        </section>

        {/* 5. Inventory Preview */}
        <section className="cf-card">
          <h3>Inventory Preview</h3>
          <div className="cf-preview-row"><span>Available Stock</span><span>{totalAvailable.toLocaleString()} {unit}</span></div>
          {isConsumable && (
            <>
              <div className="cf-preview-row">
                <span>Average Service Usage</span>
                <span>{usageStats ? `${avgUsage.toLocaleString()} ${unit}` : "No usage data yet"}</span>
              </div>
              <div className="cf-preview-row"><span>Estimated Services</span><span>{estimatedServices ?? "—"}</span></div>
            </>
          )}
          <div className="cf-preview-row">
            <span>Status</span>
            <span className={`ci-status ci-status--${previewStatus}`}>
              {previewStatus === "healthy" ? "Healthy" : previewStatus === "low" ? "Low Stock" : "Out of Stock"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductFormPage;
