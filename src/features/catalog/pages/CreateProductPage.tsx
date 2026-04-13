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

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const brands     = useSelector((state: RootState) => state.products.brands);
  const categories = useSelector((state: RootState) => state.products.categories);
  const loading    = useSelector((state: RootState) => state.products.loading.create);
  const error      = useSelector((state: RootState) => state.products.error);

  // Basic info
  const [productName, setProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [brandId, setBrandId] = useState("");
  const [measureUnit, setMeasureUnit] = useState("ml");
  const [amount, setAmount] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Pricing
  const [supplyPrice, setSupplyPrice] = useState("");
  const [retailSalesEnabled, setRetailSalesEnabled] = useState(true);
  const [retailPrice, setRetailPrice] = useState("");
  const [markupPercentage, setMarkupPercentage] = useState("");
  const [taxType, setTaxType] = useState("no_tax");
  const [customTaxRate, setCustomTaxRate] = useState("");

  // Commission
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");

  useEffect(() => {
    dispatch(fetchBrandsThunk());
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  // Auto-calculate markup when supply + retail price change
  useEffect(() => {
    const supply = parseFloat(supplyPrice);
    const retail = parseFloat(retailPrice);
    if (supply > 0 && retail > 0) {
      const markup = (((retail - supply) / supply) * 100).toFixed(2);
      setMarkupPercentage(markup);
    }
  }, [supplyPrice, retailPrice]);

  // Auto-calculate retail price when markup changes
  const handleMarkupChange = (val: string) => {
    setMarkupPercentage(val);
    const supply = parseFloat(supplyPrice);
    const markup = parseFloat(val);
    if (supply > 0 && markup >= 0) {
      const retail = (supply * (1 + markup / 100)).toFixed(2);
      setRetailPrice(retail);
    }
  };

  const handleSubmit = async () => {
    const payload: any = {
      name: productName.trim(),
      measure_unit: measureUnit,
      retail_sales_enabled: retailSalesEnabled,
      tax_type: taxType,
      team_commission_enabled: commissionEnabled,
    };

    if (barcode) payload.barcode = barcode;
    if (brandId) payload.brand_id = brandId;
    if (amount) payload.amount = parseFloat(amount);
    if (shortDescription) payload.short_description = shortDescription;
    if (description) payload.description = description;
    if (categoryId) payload.category_id = categoryId;
    if (supplyPrice) payload.supply_price = parseFloat(supplyPrice);
    if (retailSalesEnabled && retailPrice)
      payload.retail_price = parseFloat(retailPrice);
    if (retailSalesEnabled && markupPercentage)
      payload.markup_percentage = parseFloat(markupPercentage);
    if (taxType === "custom" && customTaxRate)
      payload.custom_tax_rate = parseFloat(customTaxRate);
    if (commissionEnabled && commissionRate)
      payload.team_commission_rate = parseFloat(commissionRate);

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
          disabled={!productName.trim() || loading}
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
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
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
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>

            <div className="mt-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Product brand
              </label>
              <select
                className="form-select"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
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
                  value={measureUnit}
                  onChange={(e) => setMeasureUnit(e.target.value)}
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
                    {measureUnit}
                  </span>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    style={{ paddingLeft: "2.8rem" }}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
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
                  {shortDescription.length}/100
                </span>
              </div>
              <input
                type="text"
                className="form-control"
                maxLength={100}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </div>

            <div className="mt-3">
              <div className="d-flex justify-content-between">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Product description
                </label>
                <span className="text-muted" style={{ fontSize: "12px" }}>
                  {description.length}/1000
                </span>
              </div>
              <textarea
                className="form-control"
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Product category
              </label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
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
                  value={supplyPrice}
                  onChange={(e) => setSupplyPrice(e.target.value)}
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
                  checked={retailSalesEnabled}
                  onChange={() => setRetailSalesEnabled(!retailSalesEnabled)}
                  style={{ cursor: "pointer", width: "2.5rem", height: "1.25rem" }}
                />
              </div>
              <span style={{ fontSize: "14px" }}>Enable retail sales</span>
            </div>

            {retailSalesEnabled && (
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
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
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
                      value={markupPercentage}
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
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
              >
                {TAX_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {taxType === "custom" && (
              <div className="mt-3 col-6">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Custom tax rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0.00"
                  value={customTaxRate}
                  onChange={(e) => setCustomTaxRate(e.target.value)}
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
                  checked={commissionEnabled}
                  onChange={() => setCommissionEnabled(!commissionEnabled)}
                  style={{ cursor: "pointer", width: "2.5rem", height: "1.25rem" }}
                />
              </div>
              <span style={{ fontSize: "14px" }}>Enable team member commission</span>
            </div>
            {commissionEnabled && (
              <div className="col-6">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Commission rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0.00"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
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
