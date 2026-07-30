import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { XLg } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { createProductThunk, fetchBrandsThunk, fetchCategoriesThunk, createBrandThunk, createCategoryThunk } from "../../../middleware/catalog/products.thunk";
import { fetchSuppliersThunk, createSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import Alert from "../../../components/ui/Alert";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { PRODUCT_UNITS, isConsumableType, TAX_TYPE_OPTIONS } from "../types/product.types";
import type { ProductType, ProductUnit, TaxType } from "../types/product.types";
import { PRODUCT_MESSAGES } from "../../../constants/messages";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/CreateProductPage.scss";



interface FormState {
  productName: string;
  barcode: string;
  brandId: string;
  supplierId: string;
  amount: string;
  qtyAlert: string;
  description: string;
  categoryId: string;
  supplyPrice: string;
  retailSalesEnabled: boolean;
  retailPrice: string;
  productType: ProductType;
  unit: ProductUnit | "";
  sizeValue: string;
  taxType: TaxType;
  customTaxRate: string;
  hsnSac: string;
}

const initialForm: FormState = {
  productName: "",
  barcode: "",
  brandId: "",
  supplierId: "",
  amount: "",
  qtyAlert: "",
  description: "",
  categoryId: "",
  supplyPrice: "",
  retailSalesEnabled: true,
  retailPrice: "",
  productType: "retail",
  unit: "",
  sizeValue: "",
  taxType: "no_tax",
  customTaxRate: "",
  hsnSac: "",
};

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "retail", label: "Retail" },
  { value: "consumable", label: "Consumable" },
  { value: "both", label: "Both" },
];

const formatCategoryName = (name: unknown) =>
  String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

// Native <select> popups are painted by the OS and can render past the browser
// viewport when the option list is long (e.g. many brands). This draws its own
// menu instead, so it can be clamped to on-screen space and scrolled rather than
// overflowing it.
const ProductSelect: React.FC<{
  label: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  onBlur?: () => void;
}> = ({ label, value, options, onChange, onBlur }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onBlur]);

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const margin = 12;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const openUpward = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(280, openUpward ? spaceAbove : spaceBelow));
      setMenuStyle(
        openUpward
          ? { bottom: "calc(100% + 4px)", top: "auto", maxHeight }
          : { top: "calc(100% + 4px)", bottom: "auto", maxHeight }
      );
    }
    setOpen((o) => !o);
  };

  const selected = options.find((o) => o.value === value);

  return (
    <div className="mt-3">
      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{label}</label>
      <div className="brand-select" ref={containerRef}>
        <button
          type="button"
          className="brand-select__toggle"
          onClick={handleToggle}
        >
          <span className="brand-select__value">{selected?.label ?? options[0]?.label}</span>
        </button>
        {open && (
          <div className="brand-select__menu" style={menuStyle}>
            {options.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`brand-select__option${opt.value === value ? " active" : ""}`}
                onClick={() => { onChange(opt.value); onBlur?.(); setOpen(false); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const dispatch = useDispatch<AppDispatch>();
  const { brands, categories, loading: { create: loading }, error } = useSelector(
    (state: RootState) => state.products
  );
  const suppliers = useSelector((state: RootState) => state.inventory.suppliers);

  const [form, setForm] = useState<FormState>(initialForm);
  const [newBrand, setNewBrand] = useState("");
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [newSupplier, setNewSupplier] = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isConsumable = isConsumableType(form.productType);

  const validationErrors = {
    productName: !form.productName.trim() ? PRODUCT_MESSAGES.PRODUCT_NAME_REQUIRED : "",
    categoryId: !form.categoryId ? PRODUCT_MESSAGES.CATEGORY_REQUIRED : "",
    amount: !form.amount.trim() || isNaN(Number(form.amount)) ? PRODUCT_MESSAGES.QUANTITY_REQUIRED : "",
    retailPrice: form.retailSalesEnabled && (!form.retailPrice.trim() || isNaN(Number(form.retailPrice)) || Number(form.retailPrice) <= 0)
      ? "Retail price is required"
      : "",
    qtyAlert: !form.qtyAlert.trim() || isNaN(Number(form.qtyAlert)) || (!isConsumable && !Number.isInteger(Number(form.qtyAlert))) || Number(form.qtyAlert) < 0
      ? PRODUCT_MESSAGES.LOW_STOCK_ALERT_REQUIRED
      : form.amount.trim() && !isNaN(Number(form.amount)) && Number(form.qtyAlert) >= Number(form.amount)
        ? PRODUCT_MESSAGES.LOW_STOCK_ALERT_EXCEEDS_QUANTITY
        : "",
    unit: isConsumable && !form.unit ? "Unit is required for consumable products" : "",
    hsnSac: form.hsnSac.trim() && !/^\d+$/.test(form.hsnSac.trim()) ? PRODUCT_MESSAGES.HSN_SAC_INVALID : "",
  };

  const isFormValid = Object.values(validationErrors).every((e) => !e);

  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));
  const touchAll = () => setTouched({ productName: true, categoryId: true, amount: true, retailPrice: true, qtyAlert: true, unit: true, hsnSac: true });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    dispatch(fetchBrandsThunk());
    dispatch(fetchCategoriesThunk());
    dispatch(fetchSuppliersThunk());
  }, [dispatch]);

  // Supply price and Retail price are fully independent fields — no
  // auto-fill, default, or markup-driven sync between them.
  const handleSupplyPriceChange = (val: string) => setField("supplyPrice", val);

  const handleRetailPriceChange = (val: string) => setField("retailPrice", val);

  const handleAddBrand = async () => {
    if (!newBrand.trim()) return;
    setSavingBrand(true);
    const result = await dispatch(createBrandThunk({ name: newBrand.trim() })) as any;
    setSavingBrand(false);
    if (result?.payload?.id) {
      setField("brandId", result.payload.id);
    }
    setNewBrand("");
    setShowAddBrand(false);
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.trim()) return;
    setSavingSupplier(true);
    const result = await dispatch(createSupplierThunk({ name: newSupplier.trim() })) as any;
    setSavingSupplier(false);
    if (result?.payload?.id) {
      setField("supplierId", result.payload.id);
    }
    setNewSupplier("");
    setShowAddSupplier(false);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setSavingCategory(true);
    const result = await dispatch(createCategoryThunk({ name: newCategory.trim() })) as any;
    setSavingCategory(false);
    if (result?.payload?.id) {
      setField("categoryId", result.payload.id);
    }
    setNewCategory("");
    setShowAddCategory(false);
  };

  const handleSubmit = async () => {
    touchAll();
    if (!isFormValid) return;

    const payload = {
      name: form.productName.trim(),
      retail_sales_enabled: form.retailSalesEnabled,
      barcode: form.barcode || null,
      brand_id: form.brandId || null,
      supplier_id: form.supplierId || null,
      category_id: form.categoryId || null,
      amount: form.amount ? parseFloat(form.amount) : 0,
      qty_alert: isConsumable ? parseFloat(form.qtyAlert) : parseInt(form.qtyAlert, 10),
      description: form.description || null,
      supply_price: form.supplyPrice ? parseFloat(form.supplyPrice) : 0,
      // Retail price is a required, independent field (validated above) when
      // retail sales is enabled — no markup/supply-price fallback needed.
      retail_price: form.retailSalesEnabled ? parseFloat(form.retailPrice) || 0 : null,
      product_type: form.productType,
      unit: form.unit || null,
      size: form.sizeValue.trim() && form.unit ? `${form.sizeValue.trim()} ${form.unit}` : null,
      tax_type: form.taxType,
      custom_tax_rate: form.taxType === "custom" && form.customTaxRate ? parseFloat(form.customTaxRate) : null,
      hsn_sac: form.hsnSac.trim() || null,
    };

    const result = await dispatch(createProductThunk(payload));
    if (createProductThunk.fulfilled.match(result)) {
      navigate("/dashboard/catalog/products");
    }
  };

  return (
    <div className="cpp">
      {/* Top bar */}
      <div className="cpp__topbar d-flex align-items-center justify-content-between px-4 shadow-sm border-bottom">
        <Button variant="ghost" onClick={() => navigate(-1)} className="cpp__close-btn p-0 border-0">
          <XLg size={20} />
        </Button>
        <h5 className="cpp__topbar-title mb-0 fw-bold">Create a product</h5>
        <Button
          variant="dark"
          onClick={handleSubmit}
          disabled={loading}
          className="cpp__submit-btn"
        >
          {loading ? "Saving..." : "Create product"}
        </Button>
      </div>

      {/* Body */}
      <div className="cpp__body">
        <div className="container-narrow">

          {error && <Alert message={error} />}

          {/* 1. Basic info */}
          <Card title="Basic info" className="mb-4">
            <Input
              label={<>Product name <span style={{ color: "#dc2626" }}>*</span></>}
              placeholder="e.g. Organic Shampoo"
              value={form.productName}
              onChange={(e) => { setField("productName", e.target.value); touch("productName"); }}
              onBlur={() => touch("productName")}
              required
            />
            {touched.productName && validationErrors.productName && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{validationErrors.productName}</div>
            )}

            <Input
              label={<>Product barcode <span className="text-muted fw-normal">(Optional)</span></>}
              type="text"
              placeholder="UPC, EAN, GTIN"
              value={form.barcode}
              onChange={(e) => setField("barcode", e.target.value)}
              containerClass="mt-3"
            />

            <ProductSelect
              label="Product brand"
              value={form.brandId}
              onChange={(v) => setField("brandId", v)}
              options={[
                { value: "", label: "Select a brand" },
                ...brands.map((b: any) => ({ value: b.id, label: b.name })),
              ]}
            />
            {/* Add Brand inline */}
            {!showAddBrand ? (
              <button
                type="button"
                className="btn btn-link p-0 mt-1 text-decoration-none fw-medium"
                style={{ fontSize: "13px", color: "#6366f1" }}
                onClick={() => setShowAddBrand(true)}
              >
                + Add a brand
              </button>
            ) : (
              <div className="d-flex align-items-center gap-2 mt-2 p-3 rounded-3 border bg-white" style={{ fontSize: "13px" }}>
                <input
                  autoFocus
                  type="text"
                  className="form-control form-control-sm shadow-none border-secondary-subtle"
                  placeholder="Brand name"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddBrand(); if (e.key === "Escape") setShowAddBrand(false); }}
                />
                <button
                  type="button"
                  className="btn btn-dark btn-sm rounded-pill px-3 fw-medium flex-shrink-0"
                  onClick={handleAddBrand}
                  disabled={!newBrand.trim() || savingBrand}
                >
                  {savingBrand ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm rounded-pill px-3 fw-medium flex-shrink-0 border"
                  onClick={() => { setShowAddBrand(false); setNewBrand(""); }}
                >
                  Cancel
                </button>
              </div>
            )}

            <ProductSelect
              label="Supplier"
              value={form.supplierId}
              onChange={(v) => setField("supplierId", v)}
              options={[
                { value: "", label: "Select a supplier" },
                ...suppliers.map((s: any) => ({ value: s.id, label: s.name })),
              ]}
            />
            {/* Add Supplier inline */}
            {!showAddSupplier ? (
              <button
                type="button"
                className="btn btn-link p-0 mt-1 text-decoration-none fw-medium"
                style={{ fontSize: "13px", color: "#6366f1" }}
                onClick={() => setShowAddSupplier(true)}
              >
                + Add a supplier
              </button>
            ) : (
              <div className="d-flex align-items-center gap-2 mt-2 p-3 rounded-3 border bg-white" style={{ fontSize: "13px" }}>
                <input
                  autoFocus
                  type="text"
                  className="form-control form-control-sm shadow-none border-secondary-subtle"
                  placeholder="Supplier name"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSupplier(); if (e.key === "Escape") setShowAddSupplier(false); }}
                />
                <button
                  type="button"
                  className="btn btn-dark btn-sm rounded-pill px-3 fw-medium flex-shrink-0"
                  onClick={handleAddSupplier}
                  disabled={!newSupplier.trim() || savingSupplier}
                >
                  {savingSupplier ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm rounded-pill px-3 fw-medium flex-shrink-0 border"
                  onClick={() => { setShowAddSupplier(false); setNewSupplier(""); }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="mt-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Product type <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div className="d-flex gap-2" role="group" aria-label="Product type">
                {PRODUCT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 ${form.productType === opt.value ? "btn-dark" : "btn-outline-secondary"}`}
                    onClick={() => {
                      setField("productType", opt.value);
                      touch("unit");
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="d-flex flex-wrap mt-1" style={{ gap: 12 }}>
              <div style={{ flex: "1 1 40%", minWidth: 140 }}>
                <Input
                  label="Size"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 100"
                  value={form.sizeValue}
                  onChange={(e) => setField("sizeValue", e.target.value)}
                  containerClass=""
                />
              </div>
              <div style={{ flex: "1 1 60%", minWidth: 180 }}>
                <ProductSelect
                  label={<>Unit of measure {isConsumable && <span style={{ color: "#dc2626" }}>*</span>}</>}
                  value={form.unit}
                  onChange={(v) => { setField("unit", v as ProductUnit); touch("unit"); }}
                  onBlur={() => touch("unit")}
                  options={[
                    { value: "", label: "Select a unit" },
                    ...PRODUCT_UNITS.map((u) => ({ value: u, label: u })),
                  ]}
                />
              </div>
            </div>
            {form.sizeValue && form.unit && (
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>
                Will be saved as: {form.sizeValue} {form.unit}
              </div>
            )}
            {touched.unit && validationErrors.unit && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{validationErrors.unit}</div>
            )}

            <Input
              label={<>Product Quantity <span style={{ color: "#dc2626" }}>*</span></>}
              type="number"
              min="0"
              step={isConsumable ? "0.01" : "1"}
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => { setField("amount", e.target.value); touch("amount"); }}
              onBlur={() => touch("amount")}
              containerClass="mt-3"
            />
            {touched.amount && validationErrors.amount && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{validationErrors.amount}</div>
            )}

            <Input
              label={<>Low stock alert <span style={{ color: "#dc2626" }}>*</span></>}
              type="number"
              min="0"
              step={isConsumable ? "0.01" : "1"}
              placeholder="e.g. 5"
              value={form.qtyAlert}
              onChange={(e) => { setField("qtyAlert", e.target.value); touch("qtyAlert"); }}
              onBlur={() => touch("qtyAlert")}
              containerClass="mt-3"
            />
            {touched.qtyAlert && validationErrors.qtyAlert ? (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{validationErrors.qtyAlert}</div>
            ) : (
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>
                {PRODUCT_MESSAGES.LOW_STOCK_ALERT_HINT}
              </div>
            )}

            <Input
              label="Product description"
              multiline
              rows={4}
              maxLength={1000}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              containerClass="mt-3"
              showCharCount
            />

            <ProductSelect
              label={<>Product category <span style={{ color: "#dc2626" }}>*</span></>}
              value={form.categoryId}
              onChange={(v) => { setField("categoryId", v); touch("categoryId"); }}
              onBlur={() => touch("categoryId")}
              options={[
                { value: "", label: "Select a category" },
                ...categories.map((c: any) => ({ value: c.id, label: formatCategoryName(c.name) })),
              ]}
            />
            {touched.categoryId && validationErrors.categoryId && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{validationErrors.categoryId}</div>
            )}
            {/* Add Category inline */}
            {!showAddCategory ? (
              <button
                type="button"
                className="btn btn-link p-0 mt-1 text-decoration-none fw-medium"
                style={{ fontSize: "13px", color: "#6366f1" }}
                onClick={() => setShowAddCategory(true)}
              >
                + Add a category
              </button>
            ) : (
              <div className="d-flex align-items-center gap-2 mt-2 p-3 rounded-3 border bg-white" style={{ fontSize: "13px" }}>
                <input
                  autoFocus
                  type="text"
                  className="form-control form-control-sm shadow-none border-secondary-subtle"
                  placeholder="Category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); if (e.key === "Escape") setShowAddCategory(false); }}
                />
                <button
                  type="button"
                  className="btn btn-dark btn-sm rounded-pill px-3 fw-medium flex-shrink-0"
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim() || savingCategory}
                >
                  {savingCategory ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm rounded-pill px-3 fw-medium flex-shrink-0 border"
                  onClick={() => { setShowAddCategory(false); setNewCategory(""); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </Card>

          {/* 2. Pricing */}
          <Card title="Pricing" className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <div>
                <div className="fw-semibold" style={{ fontSize: "14px" }}>Retail sales</div>
                <div className="text-muted" style={{ fontSize: "13px" }}>
                  Allow sales of this product at checkout.
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={form.retailSalesEnabled}
                  onChange={() => setField("retailSalesEnabled", !form.retailSalesEnabled)}
                  style={{ cursor: "pointer", width: "2.5rem", height: "1.25rem" }}
                />
              </div>
              <span style={{ fontSize: "14px" }}>Enable retail sales</span>
            </div>

            {form.retailSalesEnabled && (
              <div className="mb-1">
                <Input
                  label={<>Retail price <span style={{ color: "#dc2626" }}>*</span></>}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.retailPrice}
                  onChange={(e) => { handleRetailPriceChange(e.target.value.replace(/[^0-9.]/g, "")); touch("retailPrice"); }}
                  onBlur={() => touch("retailPrice")}
                  onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
                  iconLeft={<span>{currencySymbol}</span>}
                  containerClass=""
                />
                {touched.retailPrice && validationErrors.retailPrice && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{validationErrors.retailPrice}</div>
                )}
              </div>
            )}

            <Input
              label="Supply price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={form.supplyPrice}
              onChange={(e) => handleSupplyPriceChange(e.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
              iconLeft={<span>{currencySymbol}</span>}
              containerClass="mt-3"
            />
          </Card>

          {/* 3. Tax & compliance */}
          <Card title="Tax & compliance" className="mb-4">
            <ProductSelect
              label="GST"
              value={form.taxType}
              onChange={(v) => setField("taxType", v as TaxType)}
              options={TAX_TYPE_OPTIONS}
            />

            {form.taxType === "custom" && (
              <Input
                label="Custom tax rate"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={form.customTaxRate}
                onChange={(e) => setField("customTaxRate", e.target.value)}
                onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
                iconLeft={<span>%</span>}
                containerClass="mt-3"
              />
            )}

            <Input
              label={<>HSN/SAC code <span className="text-muted fw-normal">(Optional)</span></>}
              type="text"
              inputMode="numeric"
              placeholder="e.g. 3305"
              value={form.hsnSac}
              onChange={(e) => { setField("hsnSac", e.target.value.replace(/\D/g, "")); touch("hsnSac"); }}
              onBlur={() => touch("hsnSac")}
              containerClass="mt-3"
            />
            {touched.hsnSac && validationErrors.hsnSac && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{validationErrors.hsnSac}</div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
};

export default CreateProductPage;
