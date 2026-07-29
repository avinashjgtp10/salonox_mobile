import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { XLg } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { updateProductThunk, fetchProductsThunk, fetchBrandsThunk, fetchCategoriesThunk, createBrandThunk, createCategoryThunk } from "../../../middleware/catalog/products.thunk";
import { fetchSuppliersThunk, createSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import Alert from "../../../components/ui/Alert";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import { retailFromActiveMethod, markupPercentFromRetail, flatAmountFromRetail } from "../utils/productPricing";
import type { MarkupMethod } from "../utils/productPricing";
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
  markupPercentage: string;
  flatAmount: string;
  markupMethod: MarkupMethod;
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
  markupPercentage: "",
  flatAmount: "",
  markupMethod: "percentage",
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

const EditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const dispatch = useDispatch<AppDispatch>();
  const { items: products, brands, categories, loading: { update: loading }, error } = useSelector(
    (state: RootState) => state.products
  );
  const suppliers = useSelector((state: RootState) => state.inventory.suppliers);

  const product = products.find((p: any) => p.id === id);

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
  const [qtyAlertTouched, setQtyAlertTouched] = useState(false);
  const [unitTouched, setUnitTouched] = useState(false);
  const [hsnSacTouched, setHsnSacTouched] = useState(false);

  const isConsumable = isConsumableType(form.productType);

  const qtyAlertError = !form.qtyAlert.trim() || isNaN(Number(form.qtyAlert)) || (!isConsumable && !Number.isInteger(Number(form.qtyAlert))) || Number(form.qtyAlert) < 0
    ? PRODUCT_MESSAGES.LOW_STOCK_ALERT_REQUIRED
    : form.amount.trim() && !isNaN(Number(form.amount)) && Number(form.qtyAlert) >= Number(form.amount)
      ? PRODUCT_MESSAGES.LOW_STOCK_ALERT_EXCEEDS_QUANTITY
      : "";

  const unitError = isConsumable && !form.unit ? "Unit is required for consumable products" : "";

  const hsnSacError = form.hsnSac.trim() && !/^\d+$/.test(form.hsnSac.trim()) ? PRODUCT_MESSAGES.HSN_SAC_INVALID : "";

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProductsThunk());
    }
    dispatch(fetchBrandsThunk());
    dispatch(fetchCategoriesThunk());
    dispatch(fetchSuppliersThunk());
  }, [dispatch, products.length]);

  // Pre-fill form when product loads
  useEffect(() => {
    if (product) {
      setForm({
        productName: product.name || "",
        barcode: product.barcode || "",
        brandId: product.brand_id || "",
        supplierId: product.supplier_id || "",
        categoryId: product.category_id || "",
        amount: product.amount != null ? String(product.amount) : "",
        qtyAlert: product.qty_alert != null ? String(product.qty_alert) : "",
        description: product.description || "",
        supplyPrice: product.supply_price != null ? String(product.supply_price) : "",
        retailSalesEnabled: product.retail_sales_enabled ?? true,
        retailPrice: product.retail_price != null ? String(product.retail_price) : "",
        markupPercentage: product.markup_percentage != null ? String(product.markup_percentage) : "",
        flatAmount: "",
        markupMethod: "percentage",
        productType: (product.product_type as ProductType) || "retail",
        unit: (product.unit as ProductUnit) || "",
        sizeValue: product.size ? String(parseFloat(product.size)) : "",
        taxType: (product.tax_type as TaxType) || "no_tax",
        customTaxRate: product.custom_tax_rate != null ? String(product.custom_tax_rate) : "",
        hsnSac: product.hsn_sac || "",
      });
    }
  }, [product]);

  // Supply price change recalculates retail price from whichever markup method is active
  const handleSupplyPriceChange = (val: string) => {
    setForm((prev) => {
      const supply = parseFloat(val) || 0;
      const markup = parseFloat(prev.markupPercentage) || 0;
      const flat = parseFloat(prev.flatAmount) || 0;
      const hasMarkupInput = prev.markupMethod === "percentage" ? prev.markupPercentage !== "" : prev.flatAmount !== "";
      const retail = hasMarkupInput ? String(retailFromActiveMethod(supply, prev.markupMethod, markup, flat)) : prev.retailPrice;
      return { ...prev, supplyPrice: val, retailPrice: retail };
    });
  };

  // Markup % changes: becomes the active method, clears flat amount, recalculates retail price
  const handleMarkupChange = (val: string) => {
    setForm((prev) => {
      const supply = parseFloat(prev.supplyPrice) || 0;
      const markup = parseFloat(val) || 0;
      const retail = val === "" ? prev.retailPrice : String(retailFromActiveMethod(supply, "percentage", markup, 0));
      return { ...prev, markupPercentage: val, flatAmount: "", markupMethod: "percentage", retailPrice: retail };
    });
  };

  // Manual retail price edits recalculate the corresponding value for the active markup method
  const handleRetailPriceChange = (val: string) => {
    setForm((prev) => {
      const supply = parseFloat(prev.supplyPrice) || 0;
      const retail = parseFloat(val) || 0;
      if (prev.markupMethod === "percentage") {
        return { ...prev, retailPrice: val, markupPercentage: val === "" ? prev.markupPercentage : String(markupPercentFromRetail(supply, retail)) };
      }
      return { ...prev, retailPrice: val, flatAmount: val === "" ? prev.flatAmount : String(flatAmountFromRetail(supply, retail)) };
    });
  };

  // Mouse-wheel adjustment for the pricing fields (Supply/Retail price step by ₹1, Markup % by 1%)

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
    setQtyAlertTouched(true);
    setUnitTouched(true);
    setHsnSacTouched(true);
    if (qtyAlertError || unitError || hsnSacError) return;

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
      retail_price: form.retailSalesEnabled && form.retailPrice ? parseFloat(form.retailPrice) : null,
      markup_percentage: form.retailSalesEnabled && form.retailPrice
        ? markupPercentFromRetail(parseFloat(form.supplyPrice) || 0, parseFloat(form.retailPrice))
        : null,
      product_type: form.productType,
      unit: form.unit || null,
      size: form.sizeValue.trim() && form.unit ? `${form.sizeValue.trim()} ${form.unit}` : null,
      tax_type: form.taxType,
      custom_tax_rate: form.taxType === "custom" && form.customTaxRate ? parseFloat(form.customTaxRate) : null,
      hsn_sac: form.hsnSac.trim() || null,
    };

    if (!id) return;
    const result = await dispatch(updateProductThunk({ id, data: payload }));
    if (updateProductThunk.fulfilled.match(result)) {
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
        <h5 className="cpp__topbar-title mb-0 fw-bold">Edit product</h5>
        <Button
          variant="dark"
          onClick={handleSubmit}
          disabled={!form.productName.trim() || loading}
          className="cpp__submit-btn"
        >
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </div>

      {/* Body */}
      <div className="cpp__body">
        <div className="container-narrow">

          {error && <Alert message={error} />}

          {/* 1. Basic info */}
          <Card title="Basic info" className="mb-4">
            <Input
              label="Product name"
              placeholder="e.g. Organic Shampoo"
              value={form.productName}
              onChange={(e) => setField("productName", e.target.value)}
              required
            />

            <Input
              label={<>Product barcode <span className="text-muted fw-normal">(Optional)</span></>}
              type="text"
              placeholder="UPC, EAN, GTIN"
              value={form.barcode}
              onChange={(e) => setField("barcode", e.target.value)}
              containerClass="mt-3"
            />

            <Select
              label="Product brand"
              containerClass="mt-3"
              value={form.brandId}
              onChange={(e) => setField("brandId", e.target.value)}
            >
              <option value="">Select a brand</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            {!showAddBrand ? (
              <button type="button" className="btn btn-link p-0 mt-1 text-decoration-none fw-medium"
                style={{ fontSize: "13px", color: "#6366f1" }}
                onClick={() => setShowAddBrand(true)}>
                + Add a brand
              </button>
            ) : (
              <div className="d-flex align-items-center gap-2 mt-2 p-3 rounded-3 border bg-white" style={{ fontSize: "13px" }}>
                <input autoFocus type="text"
                  className="form-control form-control-sm shadow-none border-secondary-subtle"
                  placeholder="Brand name" value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddBrand(); if (e.key === "Escape") setShowAddBrand(false); }} />
                <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 fw-medium flex-shrink-0"
                  onClick={handleAddBrand} disabled={!newBrand.trim() || savingBrand}>
                  {savingBrand ? "Saving..." : "Save"}
                </button>
                <button type="button" className="btn btn-light btn-sm rounded-pill px-3 fw-medium flex-shrink-0 border"
                  onClick={() => { setShowAddBrand(false); setNewBrand(""); }}>Cancel</button>
              </div>
            )}

            <Select
              label="Supplier"
              containerClass="mt-3"
              value={form.supplierId}
              onChange={(e) => setField("supplierId", e.target.value)}
            >
              <option value="">Select a supplier</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {!showAddSupplier ? (
              <button type="button" className="btn btn-link p-0 mt-1 text-decoration-none fw-medium"
                style={{ fontSize: "13px", color: "#6366f1" }}
                onClick={() => setShowAddSupplier(true)}>
                + Add a supplier
              </button>
            ) : (
              <div className="d-flex align-items-center gap-2 mt-2 p-3 rounded-3 border bg-white" style={{ fontSize: "13px" }}>
                <input autoFocus type="text"
                  className="form-control form-control-sm shadow-none border-secondary-subtle"
                  placeholder="Supplier name" value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSupplier(); if (e.key === "Escape") setShowAddSupplier(false); }} />
                <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 fw-medium flex-shrink-0"
                  onClick={handleAddSupplier} disabled={!newSupplier.trim() || savingSupplier}>
                  {savingSupplier ? "Saving..." : "Save"}
                </button>
                <button type="button" className="btn btn-light btn-sm rounded-pill px-3 fw-medium flex-shrink-0 border"
                  onClick={() => { setShowAddSupplier(false); setNewSupplier(""); }}>Cancel</button>
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
                      setUnitTouched(true);
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
                <Select
                  label={<>Unit of measure {isConsumable && <span style={{ color: "#dc2626" }}>*</span>}</>}
                  containerClass=""
                  value={form.unit}
                  onChange={(e) => { setField("unit", e.target.value as ProductUnit); setUnitTouched(true); }}
                >
                  <option value="">Select a unit</option>
                  {PRODUCT_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </div>
            </div>
            {form.sizeValue && form.unit && (
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>
                Will be saved as: {form.sizeValue} {form.unit}
              </div>
            )}
            {unitTouched && unitError && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{unitError}</div>
            )}

            <Input
              label="Product Quantity"
              type="number"
              min="0"
              step={isConsumable ? "0.01" : "1"}
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              containerClass="mt-3"
            />

            <Input
              label={<>Low stock alert <span style={{ color: "#dc2626" }}>*</span></>}
              type="number"
              min="0"
              step={isConsumable ? "0.01" : "1"}
              placeholder="e.g. 5"
              value={form.qtyAlert}
              onChange={(e) => { setField("qtyAlert", e.target.value); setQtyAlertTouched(true); }}
              onBlur={() => setQtyAlertTouched(true)}
              containerClass="mt-3"
            />
            {qtyAlertTouched && qtyAlertError ? (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{qtyAlertError}</div>
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

            <Select
              label="Product category"
              containerClass="mt-3"
              value={form.categoryId}
              onChange={(e) => setField("categoryId", e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            {!showAddCategory ? (
              <button type="button" className="btn btn-link p-0 mt-1 text-decoration-none fw-medium"
                style={{ fontSize: "13px", color: "#6366f1" }}
                onClick={() => setShowAddCategory(true)}>
                + Add a category
              </button>
            ) : (
              <div className="d-flex align-items-center gap-2 mt-2 p-3 rounded-3 border bg-white" style={{ fontSize: "13px" }}>
                <input autoFocus type="text"
                  className="form-control form-control-sm shadow-none border-secondary-subtle"
                  placeholder="Category name" value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); if (e.key === "Escape") setShowAddCategory(false); }} />
                <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 fw-medium flex-shrink-0"
                  onClick={handleAddCategory} disabled={!newCategory.trim() || savingCategory}>
                  {savingCategory ? "Saving..." : "Save"}
                </button>
                <button type="button" className="btn btn-light btn-sm rounded-pill px-3 fw-medium flex-shrink-0 border"
                  onClick={() => { setShowAddCategory(false); setNewCategory(""); }}>Cancel</button>
              </div>
            )}
          </Card>

          {/* 2. Pricing */}
          <Card title="Pricing" className="mb-4">
            <Input
              label="Supply price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={form.supplyPrice}
              onChange={(e) => handleSupplyPriceChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
              iconLeft={<span>{currencySymbol}</span>}
              containerClass="mt-1"
            />

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
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.retailPrice}
                    onChange={(e) => handleRetailPriceChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
                    iconLeft={<span>{currencySymbol}</span>}
                    containerClass=""
                  />
                </div>
                <div className="col-6">
                  <Input
                    label="Markup"
                    type="text"
                    inputMode="decimal"
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

          {/* 3. Tax & compliance */}
          <Card title="Tax & compliance" className="mb-4">
            <Select
              label="GST"
              containerClass=""
              value={form.taxType}
              onChange={(e) => setField("taxType", e.target.value as TaxType)}
            >
              {TAX_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>

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
              onChange={(e) => { setField("hsnSac", e.target.value.replace(/\D/g, "")); setHsnSacTouched(true); }}
              onBlur={() => setHsnSacTouched(true)}
              containerClass="mt-3"
            />
            {hsnSacTouched && hsnSacError && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>{hsnSacError}</div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
};

export default EditProductPage;
