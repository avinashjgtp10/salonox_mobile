import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { XLg } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { createProductThunk, fetchBrandsThunk, fetchCategoriesThunk, createBrandThunk, createCategoryThunk } from "../../../middleware/catalog/products.thunk";
import Alert from "../../../components/ui/Alert";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import "../styles/CreateProductPage.scss";



interface FormState {
  productName: string;
  barcode: string;
  brandId: string;
  amount: string;
  qtyAlert: string;
  description: string;
  categoryId: string;
  supplyPrice: string;
  retailSalesEnabled: boolean;
  retailPrice: string;
  markupPercentage: string;
}

const initialForm: FormState = {
  productName: "",
  barcode: "",
  brandId: "",
  amount: "",
  qtyAlert: "",
  description: "",
  categoryId: "",
  supplyPrice: "",
  retailSalesEnabled: true,
  retailPrice: "",
  markupPercentage: "",
};

// Native <select> popups are painted by the OS and can render past the browser
// viewport when the option list is long (e.g. many brands). This draws its own
// menu instead, so it can be clamped to on-screen space and scrolled rather than
// overflowing it.
const BrandSelect: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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
          className="brand-select__toggle form-select shadow-none"
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
                onClick={() => { onChange(opt.value); setOpen(false); }}
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
  const dispatch = useDispatch<AppDispatch>();
  const { brands, categories, loading: { create: loading }, error } = useSelector(
    (state: RootState) => state.products
  );

  const [form, setForm] = useState<FormState>(initialForm);
  const [newBrand, setNewBrand] = useState("");
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validationErrors = {
    productName: !form.productName.trim() ? "Product name is required" : "",
    categoryId: !form.categoryId ? "Product category is required" : "",
    amount: !form.amount.trim() || isNaN(Number(form.amount)) ? "Product quantity is required" : "",
    supplyPrice: !form.supplyPrice.trim() || isNaN(Number(form.supplyPrice)) || Number(form.supplyPrice) <= 0 ? "Supplier price is required" : "",
    qtyAlert: !form.qtyAlert.trim() || !Number.isInteger(Number(form.qtyAlert)) || Number(form.qtyAlert) < 0 ? "Low stock alert is required" : "",
  };

  const isFormValid = Object.values(validationErrors).every((e) => !e);

  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));
  const touchAll = () => setTouched({ productName: true, categoryId: true, amount: true, supplyPrice: true, qtyAlert: true });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    dispatch(fetchBrandsThunk());
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  // Auto-calculate markup when supply + retail price change
  useEffect(() => {
    const supply = parseFloat(form.supplyPrice);
    const retail = parseFloat(form.retailPrice);
    if (supply > 0 && retail > 0) {
      const markup = (((retail - supply) / supply) * 100).toFixed(2);
      setField("markupPercentage", markup);
    }
  }, [form.supplyPrice, form.retailPrice]);

  // Auto-calculate retail price when markup changes
  const handleMarkupChange = (val: string) => {
    const supply = parseFloat(form.supplyPrice);
    const markup = parseFloat(val);
    if (supply > 0 && markup >= 0) {
      const retail = (supply * (1 + markup / 100)).toFixed(2);
      setForm((prev) => ({ ...prev, markupPercentage: val, retailPrice: retail }));
    } else {
      setField("markupPercentage", val);
    }
  };

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
      category_id: form.categoryId || null,
      amount: form.amount ? parseFloat(form.amount) : 0,
      qty_alert: parseInt(form.qtyAlert, 10),
      description: form.description || null,
      supply_price: form.supplyPrice ? parseFloat(form.supplyPrice) : 0,
      retail_price: form.retailSalesEnabled && form.retailPrice ? parseFloat(form.retailPrice) : null,
      markup_percentage: form.retailSalesEnabled && form.markupPercentage ? parseFloat(form.markupPercentage) : null,
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

            <BrandSelect
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

            <Input
              label={<>Product Quantity <span style={{ color: "#dc2626" }}>*</span></>}
              type="number"
              min="0"
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
                Alert when stock drops to or below this number.
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

            <Select
              label={<>Product category <span style={{ color: "#dc2626" }}>*</span></>}
              containerClass="mt-3"
              value={form.categoryId}
              onChange={(e) => { setField("categoryId", e.target.value); touch("categoryId"); }}
              onBlur={() => touch("categoryId")}
            >
              <option value="">Select a category</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
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
            <Input
              label={<>Supply price <span style={{ color: "#dc2626" }}>*</span></>}
              type="number"
              min="0"
              placeholder="0.00"
              value={form.supplyPrice}
              onChange={(e) => { setField("supplyPrice", e.target.value); touch("supplyPrice"); }}
              onBlur={() => touch("supplyPrice")}
              onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
              iconLeft={<span>₹</span>}
              containerClass="mt-1"
            />
            {touched.supplyPrice && validationErrors.supplyPrice && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{validationErrors.supplyPrice}</div>
            )}

            <div className="d-flex align-items-center justify-content-between mt-4 mb-1">
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
              <div className="row g-3">
                <div className="col-6">
                  <Input
                    label="Retail price"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={form.retailPrice}
                    onChange={(e) => setField("retailPrice", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
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
                    value={form.markupPercentage}
                    onChange={(e) => handleMarkupChange(e.target.value)}
                    iconLeft={<span>%</span>}
                    containerClass=""
                  />
                </div>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
};

export default CreateProductPage;
