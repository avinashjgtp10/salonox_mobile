import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash, PlusLg, Upload, Images, Lock, ClipboardData } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchBranchesThunk, createBranchThunk } from "../../../middleware/salon/salon.thunk";
import {
  fetchSuppliersThunk,
  createOrderThunk,
  updateOrderThunk,
  fetchOrderByIdThunk,
  uploadOrderSignatureThunk,
  fetchOrderSignaturesThunk,
} from "../../../middleware/inventory/inventory.thunk";
import { fetchSettingsThunk } from "../../../middleware/setting/setting.thunk";
import type { CreateOrderItemPayload, OrderTaxType } from "../../../types/inventory.types";
import { getActiveTaxes } from "../../../features/settings/utils/taxSettings";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import UIInput from "../../../components/ui/Input";
import { Dropdown } from "../../../components/ui/Dropdown";
import { DatePicker } from "../../../components/ui";
import ProductSearchSelect, { type ProductSearchResult } from "../components/ProductSearchSelect";
import "../styles/PurchaseHistoryTable.scss";
import "../styles/AddSupplierPage.scss";
import "../styles/NewOrderPage.scss";

interface OrderLine {
  key: string;
  product: ProductSearchResult | null;
  sku: string;
  qty: string;
  unitCost: string;
  discountPercent: string;
}

const PAYMENT_TERMS_OPTIONS = [
  { id: "0", name: "Due on receipt" },
  { id: "7", name: "Net 7" },
  { id: "15", name: "Net 15" },
  { id: "30", name: "Net 30" },
  { id: "45", name: "Net 45" },
  { id: "60", name: "Net 60" },
];

function emptyLine(): OrderLine {
  return {
    key: Math.random().toString(36).slice(2),
    product: null,
    sku: "",
    qty: "",
    unitCost: "",
    discountPercent: "",
  };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function generateRefNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// New Purchase Order — redesigned into 7 numbered sections (Supplier, Order
// Details, Delivery Details, Order Items, Order Summary, Additional
// Information, Actions), built entirely from the app's existing shared
// components (Dropdown, DatePicker, Button, Input, Modal, ProductSearchSelect)
// rather than one-off inputs, and following AddSupplierPage's topbar/
// form-section/field-group visual pattern.
//
const NewOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: editOrderId } = useParams<{ id?: string }>();
  const isEditMode = !!editOrderId;
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const [loadingOrder, setLoadingOrder] = useState(isEditMode);
  const [orderNumber, setOrderNumber] = useState("");

  const { currentSalon, branches } = useAppSelector((s) => s.salon);
  const { suppliers } = useAppSelector((s) => s.inventory);
  const { items: settingItems } = useAppSelector((s) => s.setting);

  // ── 1. Supplier ──────────────────────────────────────────────────────────
  const [supplierId, setSupplierId] = useState("");
  const selectedSupplier = useMemo(() => suppliers.find((s) => s.id === supplierId), [suppliers, supplierId]);

  // ── 2. Order details ─────────────────────────────────────────────────────
  // PO number is a client-side placeholder until save — the real
  // order_number (ORD-00001 etc) is generated server-side and only known
  // once createOrderThunk resolves (see ordersRepository.create).
  const [poNumberPreview] = useState(() => `PO-${Math.floor(100000 + Math.random() * 900000)}`);
  const [orderDate, setOrderDate] = useState(todayISO());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("");
  const [refNumber, setRefNumber] = useState(() => generateRefNumber());

  // ── 3. Delivery details ──────────────────────────────────────────────────
  const [billToBranchId, setBillToBranchId] = useState("");
  const [shipToBranchId, setShipToBranchId] = useState("");
  const [sameAsBillTo, setSameAsBillTo] = useState(false);

  useEffect(() => {
    if (sameAsBillTo) setShipToBranchId(billToBranchId);
  }, [sameAsBillTo, billToBranchId]);

  // ── 4. Order items ───────────────────────────────────────────────────────
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()]);

  // Tax — kept as one flat order-level rate (not per-line), sourced from the
  // salon's existing tax settings, per product decision.
  const [taxType, setTaxType] = useState<OrderTaxType>("exclusive");
  const [taxGroup, setTaxGroup] = useState("");

  // ── 5. Order summary ─────────────────────────────────────────────────────
  const [shippingCost, setShippingCost] = useState("0");

  // ── 6. Additional information ────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState("");

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState("");
  const [signatures, setSignatures] = useState<{ id: string; url: string }[]>([]);

  // Quick-add-branch modal — Bill To/Ship To's "+" button. A lightweight
  // form (not the full multi-step location picker AddStocktakePage.tsx
  // uses), since here it's just a shortcut to avoid leaving the order form.
  const [addBranchTarget, setAddBranchTarget] = useState<"billTo" | "shipTo" | null>(null);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchCity, setNewBranchCity] = useState("");
  const [newBranchState, setNewBranchState] = useState("");
  const [newBranchPincode, setNewBranchPincode] = useState("");
  const [savingBranch, setSavingBranch] = useState(false);

  useEffect(() => {
    dispatch(fetchSuppliersThunk());
    dispatch(fetchSettingsThunk());
    if (currentSalon?.id) dispatch(fetchBranchesThunk(currentSalon.id));
  }, [dispatch, currentSalon?.id]);

  // Edit mode: load the existing order and prefill every field with it.
  useEffect(() => {
    if (!editOrderId) return;
    let cancelled = false;
    setLoadingOrder(true);
    dispatch(fetchOrderByIdThunk(editOrderId))
      .unwrap()
      .then((order) => {
        if (cancelled) return;
        setOrderNumber(order.order_number);
        setSupplierId(order.supplier_id);
        setOrderDate(order.order_date ? order.order_date.slice(0, 10) : todayISO());
        setDeliveryDate(order.delivery_date ? order.delivery_date.slice(0, 10) : "");
        setPaymentTermsDays(order.payment_terms_days != null ? String(order.payment_terms_days) : "");
        setRefNumber(order.ref_number || "");
        setBillToBranchId(order.bill_to_branch_id || "");
        setShipToBranchId(order.ship_to_branch_id || "");
        setSameAsBillTo(!!order.bill_to_branch_id && order.bill_to_branch_id === order.ship_to_branch_id);
        setTaxType(order.tax_type);
        setTaxGroup(order.tax_group || "");
        setShippingCost(String(order.shipping_cost ?? 0));
        setNotes(order.remark || "");
        setTermsConditions(order.terms_conditions || "");
        setSignatureUrl(order.signature_url || "");
        setLines(
          (order.items ?? []).map((item) => ({
            key: item.id,
            product: { id: item.product_id, name: item.product_name || "Product" },
            sku: item.product_code || "",
            qty: String(item.qty),
            unitCost: String(item.selling_price),
            discountPercent: item.discount_percent ? String(item.discount_percent) : "",
          })),
        );
      })
      .catch((err: any) => {
        if (cancelled) return;
        showError(typeof err === "string" ? err : "Couldn't load order");
      })
      .finally(() => { if (!cancelled) setLoadingOrder(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOrderId]);

  const taxRows = useMemo(() => getActiveTaxes(settingItems), [settingItems]);
  const taxGroupOptions = useMemo(
    () => taxRows.map((t) => ({ id: t.tax_name, name: `${t.tax_name} (${t.tax_value}%)` })),
    [taxRows],
  );
  const selectedTaxRate = useMemo(
    () => taxRows.find((t) => t.tax_name === taxGroup)?.tax_value ?? 0,
    [taxRows, taxGroup],
  );

  const branchOptions = useMemo(() => branches.map((b) => ({ id: b.id, name: b.name })), [branches]);
  const supplierOptions = useMemo(() => suppliers.map((s) => ({ id: s.id, name: s.name })), [suppliers]);

  function patchLine(key: string, patch: Partial<OrderLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function lineMath(line: OrderLine) {
    const qty = parseFloat(line.qty) || 0;
    const unitCost = parseFloat(line.unitCost) || 0;
    const discountPercent = parseFloat(line.discountPercent) || 0;
    const subtotal = qty * unitCost;
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    // Tax is charged on the pre-discount cost, matching the backend
    // (orders.repository.ts: total_tax = total_cost_wo_tax * tax_rate) — the
    // discount reduces what's owed, not what GST is computed against, so the
    // preview shown here must agree with what actually gets persisted.
    const taxAmount = subtotal * (selectedTaxRate / 100);
    const lineTotal = afterDiscount + taxAmount;
    return { qty, unitCost, discountPercent, subtotal, discountAmount, taxAmount, lineTotal };
  }

  // A blank Unit Cost field must not silently pass as "0" — line.unitCost
  // trimmed empty is the only reliable signal, since parseFloat('') || 0
  // already coerces to a valid-looking 0 in lineMath above.
  const isLineComplete = (l: OrderLine) => {
    const m = lineMath(l);
    return m.qty > 0 && l.unitCost.trim() !== "" && m.unitCost >= 0;
  };

  const validLines = lines.filter((l) => l.product && isLineComplete(l));

  const hasIncompleteLine = lines.some((l) => l.product && !isLineComplete(l));

  const subtotal = validLines.reduce((sum, l) => sum + lineMath(l).subtotal, 0);
  const totalDiscount = validLines.reduce((sum, l) => sum + lineMath(l).discountAmount, 0);
  const totalTax = validLines.reduce((sum, l) => sum + lineMath(l).taxAmount, 0);
  const shippingCostNumber = parseFloat(shippingCost) || 0;
  const grandTotal = subtotal - totalDiscount + totalTax + shippingCostNumber;

  const canSave = !!supplierId && validLines.length > 0 && !hasIncompleteLine;

  async function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const result = await dispatch(uploadOrderSignatureThunk(file)).unwrap();
      setSignatureUrl(result.url);
      showSuccess("Signature uploaded");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to upload signature");
    } finally {
      setUploading(false);
    }
  }

  function closeAddBranch() {
    setAddBranchTarget(null);
    setNewBranchName("");
    setNewBranchAddress("");
    setNewBranchCity("");
    setNewBranchState("");
    setNewBranchPincode("");
  }

  async function handleSaveBranch() {
    if (!currentSalon?.id) return;
    if (!newBranchName.trim() || !newBranchAddress.trim() || !newBranchCity.trim() || !newBranchState.trim()) {
      showError("Name, address, city, and state are required");
      return;
    }
    setSavingBranch(true);
    try {
      const branch = await dispatch(
        createBranchThunk({
          salon_id: currentSalon.id,
          name: newBranchName.trim(),
          address_line1: newBranchAddress.trim(),
          city: newBranchCity.trim(),
          state: newBranchState.trim(),
          pincode: newBranchPincode.trim(),
          is_main: branches.length === 0,
        }),
      ).unwrap();

      if (addBranchTarget === "billTo") setBillToBranchId(branch.id);
      if (addBranchTarget === "shipTo") setShipToBranchId(branch.id);
      showSuccess("Location added successfully");
      closeAddBranch();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to add location");
    } finally {
      setSavingBranch(false);
    }
  }

  async function openGallery() {
    setGalleryOpen(true);
    try {
      const result = await dispatch(fetchOrderSignaturesThunk()).unwrap();
      setSignatures(result);
    } catch {
      setSignatures([]);
    }
  }

  async function handleSave(status: "draft" | "sent") {
    setTouched(true);
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const items: CreateOrderItemPayload[] = validLines.map((l) => {
        const m = lineMath(l);
        return {
          product_id: l.product!.id,
          product_code: l.sku || undefined,
          qty: m.qty,
          // The form only collects what we're paying the supplier (Unit
          // Cost) — selling_price is the product's own catalog retail price
          // when known, not a duplicate of the cost, so margin reporting
          // built on these two columns isn't comparing a number to itself.
          selling_price: l.product!.retail_price ?? m.unitCost,
          discount_percent: m.discountPercent || undefined,
          cost_price: m.unitCost,
        };
      });

      const payload = {
        status,
        supplier_id: supplierId,
        bill_to_branch_id: billToBranchId || undefined,
        ship_to_branch_id: shipToBranchId || undefined,
        order_date: orderDate,
        ref_number: refNumber.trim() || undefined,
        payment_terms_days: paymentTermsDays ? Number(paymentTermsDays) : undefined,
        delivery_date: deliveryDate || undefined,
        tax_type: taxType,
        tax_group: taxGroup || undefined,
        tax_rate: selectedTaxRate || undefined,
        shipping_cost: shippingCostNumber || undefined,
        remark: notes.trim() || undefined,
        terms_conditions: termsConditions.trim() || undefined,
        signature_url: signatureUrl.trim() || undefined,
        items,
      };

      const order = isEditMode && editOrderId
        ? await dispatch(updateOrderThunk({ id: editOrderId, payload })).unwrap()
        : await dispatch(createOrderThunk(payload)).unwrap();

      showSuccess(
        isEditMode
          ? `Order ${order.order_number} updated successfully`
          : status === "draft"
            ? `Order ${order.order_number} saved as draft`
            : `Order ${order.order_number} created successfully`
      );
      navigate("/dashboard/catalog/inventory/orders");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't create order");
    } finally {
      setSaving(false);
    }
  }

  const handleClose = () => navigate("/dashboard/catalog/inventory/orders");

  if (loadingOrder) {
    return (
      <div className="add-supplier-page new-order-page">
        <div className="add-supplier-page__topbar">
          <h2>Edit Purchase Order</h2>
          <div className="topbar-actions">
            <button className="btn-close-top" onClick={handleClose}>Close</button>
          </div>
        </div>
        <div className="new-order-page__loading">Loading order…</div>
      </div>
    );
  }

  return (
    <div className="add-supplier-page new-order-page">
      {overlay}
      <div className="add-supplier-page__topbar">
        <h2>{isEditMode ? `Edit Purchase Order ${orderNumber}` : "New Purchase Order"}</h2>
        <div className="topbar-actions">
          <button className="btn-close-top" onClick={handleClose}>Close</button>
          {!isEditMode && (
            <Button variant="outline-dark" onClick={() => handleSave("draft")} disabled={saving || !canSave} loading={saving}>
              Save Draft
            </Button>
          )}
          <Button variant="dark" onClick={() => handleSave("sent")} disabled={saving || !canSave} loading={saving}>
            {isEditMode ? "Save Changes" : "Create Order"}
          </Button>
        </div>
      </div>

      <div className="add-supplier-page__body new-order-page__body">
      <div className="new-order-page__main">
        {/* ============== 1. SUPPLIER ============== */}
        <section className="form-section">
          <h3>Supplier</h3>

          <div className={`field-group${touched && !supplierId ? " field-group--error" : ""}`}>
            <label>Supplier <span style={{ color: "red" }}>*</span></label>
            <Dropdown
              placeholder="Search / Select Supplier"
              value={supplierId}
              options={supplierOptions}
              onChange={setSupplierId}
            />
            {touched && !supplierId && <span className="field-error">Select a supplier</span>}
          </div>

          {selectedSupplier && (
            <div className="new-order-supplier-details">
              <h4>Supplier Details</h4>
              <div className="new-order-supplier-details__grid">
                <div>
                  <span className="label">Name</span>
                  <span className="value">{selectedSupplier.name}</span>
                </div>
                <div>
                  <span className="label">Phone</span>
                  <span className="value">{selectedSupplier.mobile_number || selectedSupplier.telephone_number || "—"}</span>
                </div>
                <div>
                  <span className="label">Email</span>
                  <span className="value">{selectedSupplier.email || "—"}</span>
                </div>
                <div>
                  <span className="label">Address</span>
                  <span className="value">
                    {[selectedSupplier.street, selectedSupplier.city, selectedSupplier.state]
                      .filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
                <div>
                  {/* No GST/Tax ID field exists on Supplier yet (backend or
                      frontend) — shown as unavailable rather than fabricated. */}
                  <span className="label">GST / Tax ID</span>
                  <span className="value">—</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="section-divider" />

        {/* ============== 2. ORDER DETAILS ============== */}
        <section className="form-section">
          <h3>Order Details</h3>

          <div className="field-row-2">
            <div className="field-group">
              <label>PO Number</label>
              <div className="new-order-locked-field">
                <input type="text" value={isEditMode ? orderNumber : poNumberPreview} readOnly />
                <span className="new-order-locked-badge"><Lock size={11} /> Auto Generated</span>
              </div>
            </div>
            <div className="field-group">
              <label>Order Date <span style={{ color: "red" }}>*</span></label>
              <DatePicker value={orderDate} onChange={setOrderDate} />
              <span className="new-order-date-label">{fmtDateLabel(orderDate)}</span>
            </div>
          </div>

          <div className="field-row-2">
            <div className="field-group">
              <label>Expected Delivery Date</label>
              <DatePicker value={deliveryDate} onChange={setDeliveryDate} min={orderDate || undefined} />
            </div>
            <div className="field-group">
              <label>Payment Terms</label>
              <Dropdown
                placeholder="Select"
                searchable={false}
                value={paymentTermsDays}
                options={PAYMENT_TERMS_OPTIONS}
                onChange={setPaymentTermsDays}
                allowNone
              />
            </div>
          </div>

          <div className="field-group">
            <label>Reference Number</label>
            <input type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
          </div>
        </section>

        <div className="section-divider" />

        {/* ============== 3. DELIVERY DETAILS ============== */}
        <section className="form-section">
          <h3>Delivery Details</h3>

          <div className="field-group">
            <label>Bill To</label>
            <div className="new-order-field-with-add">
              <Dropdown
                placeholder="Select Location"
                value={billToBranchId}
                options={branchOptions}
                onChange={setBillToBranchId}
                allowNone
              />
              <Button
                variant="outline-dark"
                className="new-order-add-btn"
                title="Add new location"
                onClick={() => setAddBranchTarget("billTo")}
                iconLeft={<PlusLg size={13} />}
              />
            </div>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={sameAsBillTo}
              onChange={(e) => setSameAsBillTo(e.target.checked)}
            />
            Same as Bill To
          </label>

          {!sameAsBillTo && (
            <div className="field-group" style={{ marginTop: 16 }}>
              <label>Ship To</label>
              <div className="new-order-field-with-add">
                <Dropdown
                  placeholder="Select Location"
                  value={shipToBranchId}
                  options={branchOptions}
                  onChange={setShipToBranchId}
                  allowNone
                />
                <Button
                  variant="outline-dark"
                  className="new-order-add-btn"
                  title="Add new location"
                  onClick={() => setAddBranchTarget("shipTo")}
                  iconLeft={<PlusLg size={13} />}
                />
              </div>
            </div>
          )}
        </section>

        <div className="section-divider" />

        {/* ============== 4. ORDER ITEMS ============== */}
        <section className="form-section">
          <h3>Order Items</h3>

          <div className="field-row-2">
            <div className="field-group">
              <label>Tax Type</label>
              <Dropdown
                searchable={false}
                value={taxType}
                options={[
                  { id: "exclusive", name: "Exclusive" },
                  { id: "inclusive", name: "Inclusive" },
                ]}
                onChange={(id) => setTaxType(id as OrderTaxType)}
              />
            </div>
            <div className="field-group">
              <label>Tax Group</label>
              <Dropdown
                placeholder="Select tax group"
                value={taxGroup}
                options={taxGroupOptions}
                onChange={setTaxGroup}
                allowNone
              />
            </div>
          </div>

          <div className="new-order-table-wrap">
            <table className="phist-table new-order-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Unit Cost</th>
                  <th>Discount</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const m = lineMath(line);
                  return (
                    <tr key={line.key}>
                      <td className="new-order-table__product">
                        {line.product ? (
                          <div className="new-order-selected-product">
                            <span>{line.product.name}</span>
                            <button type="button" onClick={() => patchLine(line.key, { product: null })}>Change</button>
                          </div>
                        ) : (
                          <ProductSearchSelect
                            onSelect={(p) => patchLine(line.key, {
                              product: p,
                              sku: p.barcode || p.sku || "",
                              unitCost: p.supply_price != null ? String(p.supply_price) : line.unitCost,
                            })}
                          />
                        )}
                      </td>
                      <td>{line.sku || "—"}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="new-order-input--sm"
                          value={line.qty}
                          onChange={(e) => patchLine(line.key, { qty: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="new-order-input--sm"
                          value={line.unitCost}
                          onChange={(e) => patchLine(line.key, { unitCost: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          className="new-order-input--sm"
                          value={line.discountPercent}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const n = parseFloat(raw);
                            const clamped = raw === "" || Number.isNaN(n) ? raw : String(Math.min(100, Math.max(0, n)));
                            patchLine(line.key, { discountPercent: clamped });
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        <span className="new-order-input-suffix">%</span>
                      </td>
                      <td className="new-order-table__readonly">{selectedTaxRate}%</td>
                      <td className="new-order-table__readonly">{formatAmount(m.lineTotal)}</td>
                      <td>
                        <button
                          type="button"
                          className="new-order-remove-line"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length === 1}
                          title="Remove product"
                        >
                          <Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {touched && validLines.length === 0 && <span className="field-error">Add at least one product</span>}
          {touched && hasIncompleteLine && <span className="field-error">Every product needs a quantity and unit cost</span>}

          <Button
            variant="outline-dark"
            size="sm"
            iconLeft={<PlusLg size={13} />}
            className="new-order-add-product-btn"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            Add Product
          </Button>
        </section>

        <div className="section-divider" />

        {/* ============== 5. ORDER SUMMARY ============== */}
        <section className="form-section">
          <h3>Order Summary</h3>

          <div className="field-group" style={{ maxWidth: 260 }}>
            <label>Shipping</label>
            <input
              type="number"
              min="0"
              step="any"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="new-order-summary">
            <div className="new-order-summary__row">
              <span>Subtotal</span>
              <span>{formatAmount(subtotal)}</span>
            </div>
            <div className="new-order-summary__row">
              <span>Discount</span>
              <span>{formatAmount(totalDiscount)}</span>
            </div>
            <div className="new-order-summary__row">
              <span>Tax</span>
              <span>{formatAmount(totalTax)}</span>
            </div>
            <div className="new-order-summary__row">
              <span>Shipping</span>
              <span>{formatAmount(shippingCostNumber)}</span>
            </div>
            <div className="new-order-summary__row new-order-summary__row--total">
              <span>TOTAL</span>
              <span>{formatAmount(grandTotal)}</span>
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ============== 6. ADDITIONAL INFORMATION ============== */}
        <section className="form-section">
          <h3>Additional Information</h3>

          <div className="field-group">
            <label>Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="field-group">
            <label>Terms &amp; Conditions</label>
            <textarea
              rows={3}
              placeholder="Optional"
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>Signature</label>
            <div className="new-order-signature">
              <input
                type="text"
                placeholder="ex. https://img.dingg.app/invoice.jpg or uploaded image name"
                value={signatureUrl}
                onChange={(e) => setSignatureUrl(e.target.value)}
              />
              <Button variant="dark" size="sm" iconLeft={<Upload size={13} />} onClick={handleUploadClick} loading={uploading}>
                Upload
              </Button>
              <Button variant="outline-dark" size="sm" iconLeft={<Images size={13} />} onClick={openGallery}>
                Gallery
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileSelected}
              />
            </div>
          </div>
        </section>

      </div>

      <aside className="new-order-sidebar">
        <h3>Order Summary</h3>

        <div className="new-order-sidebar-card new-order-sidebar-card--empty">
          <div className="new-order-sidebar-illustration">
            <ClipboardData size={26} />
          </div>
          {validLines.length === 0 ? (
            <>
              <p>No items added yet</p>
              <span>Add products to see order summary</span>
            </>
          ) : (
            <>
              <p>{formatAmount(grandTotal)}</p>
              <span>{validLines.length} product{validLines.length === 1 ? "" : "s"} added</span>
            </>
          )}
        </div>

        <div className="new-order-quickinfo">
          <h4>Quick Info</h4>
          <div className="new-order-quickinfo__row">
            <span>Total Items</span>
            <span>{validLines.length}</span>
          </div>
          <div className="new-order-quickinfo__row">
            <span>Total Quantity</span>
            <span>{validLines.reduce((sum, l) => sum + lineMath(l).qty, 0)}</span>
          </div>
          <div className="new-order-quickinfo__row">
            <span>Estimated Delivery</span>
            <span>{deliveryDate ? fmtDateLabel(deliveryDate) : "—"}</span>
          </div>
          <div className="new-order-quickinfo__row">
            <span>Warehouse</span>
            <span>{branchOptions.find((b) => b.id === (sameAsBillTo ? billToBranchId : shipToBranchId))?.name || "—"}</span>
          </div>
        </div>
      </aside>
      </div>

      <Modal
        show={!!addBranchTarget}
        onClose={closeAddBranch}
        title="Add new location"
        footer={
          <div className="d-flex gap-2 w-100">
            <Button variant="outline-dark" fullWidth onClick={closeAddBranch}>Cancel</Button>
            <Button variant="dark" fullWidth loading={savingBranch} onClick={handleSaveBranch}>Save</Button>
          </div>
        }
      >
        <UIInput label="Name" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
        <UIInput label="Address" value={newBranchAddress} onChange={(e) => setNewBranchAddress(e.target.value)} />
        <UIInput label="City" value={newBranchCity} onChange={(e) => setNewBranchCity(e.target.value)} />
        <UIInput label="State" value={newBranchState} onChange={(e) => setNewBranchState(e.target.value)} />
        <UIInput label="Pincode" value={newBranchPincode} onChange={(e) => setNewBranchPincode(e.target.value)} />
      </Modal>

      <Modal show={galleryOpen} onClose={() => setGalleryOpen(false)} title="Signature Gallery" size="md">
        {signatures.length === 0 ? (
          <p className="text-muted small mb-0">No previously uploaded signatures yet.</p>
        ) : (
          <div className="new-order-gallery-grid">
            {signatures.map((s) => (
              <button
                key={s.id}
                type="button"
                className="new-order-gallery-item"
                onClick={() => { setSignatureUrl(s.url); setGalleryOpen(false); }}
              >
                <img src={s.url} alt="Signature" />
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NewOrderPage;
