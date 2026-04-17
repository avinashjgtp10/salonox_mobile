import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { XLg } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { createProductThunk, fetchBrandsThunk, fetchCategoriesThunk } from "../../../middleware/catalog/products.thunk";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import "../styles/CreateProductPage.scss";

const MEASURE_UNITS = [
  { value: "ml", label: "Milliliters (ml)" },
  { value: "l", label: "Liters (l)" },
  { value: "g", label: "Grams (g)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "oz", label: "Ounces (oz)" },
  { value: "lb", label: "Pounds (lb)" },
];

const TAX_OPTIONS = [
  { value: "no_tax", label: "Default: No tax" },
  { value: "gst_5", label: "GST 5%" },
  { value: "gst_12", label: "GST 12%" },
  { value: "gst_18", label: "GST 18%" },
  { value: "gst_28", label: "GST 28%" },
  { value: "custom", label: "Custom" },
];

interface FormState {
  productName: string;
  barcode: string;
  brandId: string;
  measureUnit: string;
  amount: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  supplyPrice: string;
  retailSalesEnabled: boolean;
  retailPrice: string;
  markupPercentage: string;
  taxType: string;
  customTaxRate: string;
  commissionEnabled: boolean;
  commissionRate: string;
}

const initialForm: FormState = {
  productName: "",
  barcode: "",
  brandId: "",
  measureUnit: "ml",
  amount: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  supplyPrice: "",
  retailSalesEnabled: true,
  retailPrice: "",
  markupPercentage: "",
  taxType: "no_tax",
  customTaxRate: "",
  commissionEnabled: false,
  commissionRate: "",
};

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { brands, categories, loading: { create: loading }, error } = useSelector(
    (state: RootState) => state.products
  );

  const [form, setForm] = useState<FormState>(initialForm);

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

  const handleSubmit = async () => {
    const payload = {
      name: form.productName.trim(),
      measure_unit: form.measureUnit,
      retail_sales_enabled: form.retailSalesEnabled,
      tax_type: form.taxType,
      team_commission_enabled: form.commissionEnabled,
      ...(form.barcode            && { barcode:              form.barcode }),
      ...(form.brandId            && { brand_id:             form.brandId }),
      ...(form.amount             && { amount:               parseFloat(form.amount) }),
      ...(form.shortDescription   && { short_description:    form.shortDescription }),
      ...(form.description        && { description:          form.description }),
      ...(form.categoryId         && { category_id:          form.categoryId }),
      ...(form.supplyPrice        && { supply_price:         parseFloat(form.supplyPrice) }),
      ...(form.retailSalesEnabled && form.retailPrice      && { retail_price:        parseFloat(form.retailPrice) }),
      ...(form.retailSalesEnabled && form.markupPercentage && { markup_percentage:   parseFloat(form.markupPercentage) }),
      ...(form.taxType === "custom" && form.customTaxRate  && { custom_tax_rate:     parseFloat(form.customTaxRate) }),
      ...(form.commissionEnabled  && form.commissionRate   && { team_commission_rate: parseFloat(form.commissionRate) }),
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
          disabled={!form.productName.trim() || loading}
          className="cpp__submit-btn"
        >
          {loading ? "Saving..." : "Create product"}
        </Button>
      </div>

      {/* Body */}
      <div className="cpp__body">
        <div className="container-narrow">

          {error && (
            <div className="alert alert-danger rounded-3 mb-4">{error}</div>
          )}

          {/* 1. Basic info */}
          <Card title="Basic info" className="mb-4">
            <Input
              label="Product name"
              placeholder="e.g. Organic Shampoo"
              value={form.productName}
              onChange={(e) => setField("productName", e.target.value)}
              required
            />

            <div className="mt-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Product barcode <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="UPC, EAN, GTIN"
                value={form.barcode}
                onChange={(e) => setField("barcode", e.target.value)}
              />
            </div>

            <div className="mt-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Product brand
              </label>
              <select
                className="form-select"
                value={form.brandId}
                onChange={(e) => setField("brandId", e.target.value)}
              >
                <option value="">Select a brand</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-6">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Measure
                </label>
                <select
                  className="form-select"
                  value={form.measureUnit}
                  onChange={(e) => setField("measureUnit", e.target.value)}
                >
                  {MEASURE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Amount
                </label>
                <div className="cpp__price-wrap position-relative">
                  <span className="cpp__currency" style={{ fontSize: "12px", color: "#888" }}>
                    {form.measureUnit}
                  </span>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    style={{ paddingLeft: "2.8rem" }}
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="d-flex justify-content-between">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Short description
                </label>
                <span className="text-muted" style={{ fontSize: "12px" }}>
                  {form.shortDescription.length}/100
                </span>
              </div>
              <input
                type="text"
                className="form-control"
                maxLength={100}
                value={form.shortDescription}
                onChange={(e) => setField("shortDescription", e.target.value)}
              />
            </div>

            <div className="mt-3">
              <div className="d-flex justify-content-between">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Product description
                </label>
                <span className="text-muted" style={{ fontSize: "12px" }}>
                  {form.description.length}/1000
                </span>
              </div>
              <textarea
                className="form-control"
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>

            <div className="mt-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Product category
              </label>
              <select
                className="form-select"
                value={form.categoryId}
                onChange={(e) => setField("categoryId", e.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* 2. Pricing */}
          <Card title="Pricing" className="mb-4">
            <div className="mt-1">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Supply price
              </label>
              <div className="cpp__price-wrap position-relative">
                <span className="cpp__currency">INR</span>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  style={{ paddingLeft: "3.2rem" }}
                  placeholder="0.00"
                  value={form.supplyPrice}
                  onChange={(e) => setField("supplyPrice", e.target.value)}
                />
              </div>
            </div>

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
                  <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                    Retail price
                  </label>
                  <div className="cpp__price-wrap position-relative">
                    <span className="cpp__currency">INR</span>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      style={{ paddingLeft: "3.2rem" }}
                      placeholder="0.00"
                      value={form.retailPrice}
                      onChange={(e) => setField("retailPrice", e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                    Markup
                  </label>
                  <div className="cpp__price-wrap position-relative">
                    <span className="cpp__currency">%</span>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      style={{ paddingLeft: "2.2rem" }}
                      placeholder="0.00"
                      value={form.markupPercentage}
                      onChange={(e) => handleMarkupChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Tax</label>
              <select
                className="form-select"
                value={form.taxType}
                onChange={(e) => setField("taxType", e.target.value)}
              >
                {TAX_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {form.taxType === "custom" && (
              <div className="mt-3 col-6">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Custom tax rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0.00"
                  value={form.customTaxRate}
                  onChange={(e) => setField("customTaxRate", e.target.value)}
                />
              </div>
            )}
          </Card>

          {/* 3. Team member commission */}
          <Card title="Team member commission" className="mb-4">
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
              Calculate team member commission when the product is sold.
            </div>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={form.commissionEnabled}
                  onChange={() => setField("commissionEnabled", !form.commissionEnabled)}
                  style={{ cursor: "pointer", width: "2.5rem", height: "1.25rem" }}
                />
              </div>
              <span style={{ fontSize: "14px" }}>Enable team member commission</span>
            </div>
            {form.commissionEnabled && (
              <div className="col-6">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Commission rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0.00"
                  value={form.commissionRate}
                  onChange={(e) => setField("commissionRate", e.target.value)}
                />
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
};

export default CreateProductPage;
