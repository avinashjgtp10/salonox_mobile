import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash, PlusLg, Upload, Images } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchBranchesThunk, createBranchThunk } from "../../../middleware/salon/salon.thunk";
import {
  fetchSuppliersThunk,
  createOrderThunk,
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
import ProductSearchSelect, { type ProductSearchResult } from "../components/ProductSearchSelect";
import "../styles/PurchaseHistoryListPage.scss";
import "../styles/AddSupplierPage.scss";
import "../styles/NewOrderPage.scss";

interface OrderLine {
  key: string;
  product: ProductSearchResult | null;
  productCode: string;
  qty: string;
  sellingPrice: string;
  discountPercent: string;
  costPrice: string;
}

function emptyLine(): OrderLine {
  return {
    key: Math.random().toString(36).slice(2),
    product: null,
    productCode: "",
    qty: "",
    sellingPrice: "",
    discountPercent: "",
    costPrice: "",
  };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function generateRefNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const TAX_TYPE_OPTIONS: { id: OrderTaxType; name: string }[] = [
  { id: "exclusive", name: "Exclusive" },
  { id: "inclusive", name: "Inclusive" },
];

// New Order — built as a single form following AddSupplierPage.tsx's exact
// pattern (topbar with Close/Save, form-sections separated by dividers,
// plain field-group/label/input markup) so this reads as the same kind of
// screen as Add Supplier rather than a one-off layout. The line-items table
// is its own section below the form fields since it doesn't fit a narrow
// single-column form. Order tab only — Purchase tab is a separate,
// out-of-scope flow (PurchaseModal.tsx already covers "record a delivery").
const NewOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const { currentSalon, branches } = useAppSelector((s) => s.salon);
  const { suppliers } = useAppSelector((s) => s.inventory);
  const { items: settingItems } = useAppSelector((s) => s.setting);

  const [activeTab, setActiveTab] = useState<"order" | "purchase">("order");

  const [billToBranchId, setBillToBranchId] = useState("");
  const [shipToBranchId, setShipToBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(todayISO());
  const [remark, setRemark] = useState("");
  const [refNumber, setRefNumber] = useState(generateRefNumber());
  const [paymentTermsDays, setPaymentTermsDays] = useState("10");
  const [shipmentDate, setShipmentDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [taxType, setTaxType] = useState<OrderTaxType>("exclusive");
  const [taxGroup, setTaxGroup] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  const [lines, setLines] = useState<OrderLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
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
    const sellingPrice = parseFloat(line.sellingPrice) || 0;
    const discountPercent = parseFloat(line.discountPercent) || 0;
    const costPrice = parseFloat(line.costPrice) || 0;
    // Cost price is entered tax-exclusive, so cost_wo_tax === cost_price.
    // Tax is computed on the cost side (what's owed to the supplier), not
    // the resale/selling side — confirmed convention for this form.
    const totalCostWoTax = costPrice * qty;
    const totalTax = totalCostWoTax * (selectedTaxRate / 100);
    const lineTotal = sellingPrice * qty * (1 - discountPercent / 100);
    return { qty, sellingPrice, discountPercent, costPrice, totalCostWoTax, totalTax, lineTotal };
  }

  const validLines = lines.filter((l) => {
    const m = lineMath(l);
    return l.product && m.qty > 0 && m.sellingPrice >= 0 && m.costPrice >= 0;
  });

  const hasIncompleteLine = lines.some((l) => {
    if (!l.product) return false;
    const m = lineMath(l);
    return !(m.qty > 0) || !(m.sellingPrice >= 0) || !(m.costPrice >= 0);
  });

  const totalQuantity = validLines.reduce((sum, l) => sum + lineMath(l).qty, 0);
  const totalPrice = validLines.reduce((sum, l) => sum + lineMath(l).lineTotal, 0);

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

  async function handleSave() {
    setTouched(true);
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const items: CreateOrderItemPayload[] = validLines.map((l) => {
        const m = lineMath(l);
        return {
          product_id: l.product!.id,
          product_code: l.productCode || undefined,
          qty: m.qty,
          selling_price: m.sellingPrice,
          discount_percent: m.discountPercent || undefined,
          cost_price: m.costPrice,
        };
      });

      const order = await dispatch(
        createOrderThunk({
          supplier_id: supplierId,
          bill_to_branch_id: billToBranchId || undefined,
          ship_to_branch_id: shipToBranchId || undefined,
          order_date: orderDate,
          remark: remark.trim() || undefined,
          ref_number: refNumber.trim() || undefined,
          payment_terms_days: paymentTermsDays ? Number(paymentTermsDays) : undefined,
          shipment_date: shipmentDate || undefined,
          delivery_date: deliveryDate || undefined,
          tax_type: taxType,
          tax_group: taxGroup || undefined,
          tax_rate: selectedTaxRate || undefined,
          terms_conditions: termsConditions.trim() || undefined,
          signature_url: signatureUrl.trim() || undefined,
          items,
        }),
      ).unwrap();

      showSuccess(`Order ${order.order_number} created successfully`);
      navigate("/dashboard/catalog/inventory/orders");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't create order");
    } finally {
      setSaving(false);
    }
  }

  const handleClose = () => navigate("/dashboard/catalog/inventory/orders");

  return (
    <div className="add-supplier-page new-order-page">
      {overlay}
      <div className="add-supplier-page__topbar">
        <h2>New Order</h2>
        <div className="topbar-actions">
          <button className="btn-close-top" onClick={handleClose}>Close</button>
          <button className="btn-save" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="new-order-page__tabs">
        <button className={activeTab === "order" ? "active" : ""} onClick={() => setActiveTab("order")}>
          Order
        </button>
        <button className="disabled" disabled title="Coming soon">
          Purchase
        </button>
      </div>

      {activeTab === "order" && (
        <div className="add-supplier-page__body new-order-page__body">
          <section className="form-section">
            <h3>Order details</h3>

            <div className="field-row-2">
              <div className="field-group">
                <label>Bill To (From)</label>
                <div className="new-order-field-with-add">
                  <Dropdown
                    placeholder="Select address"
                    value={billToBranchId}
                    options={branchOptions}
                    onChange={setBillToBranchId}
                    allowNone
                  />
                  <button type="button" className="new-order-add-btn" title="Add new location" onClick={() => setAddBranchTarget("billTo")}>
                    <PlusLg size={13} />
                  </button>
                </div>
              </div>
              <div className="field-group">
                <label>Ship To (Delivered To)</label>
                <div className="new-order-field-with-add">
                  <Dropdown
                    placeholder="Select address"
                    value={shipToBranchId}
                    options={branchOptions}
                    onChange={setShipToBranchId}
                    allowNone
                  />
                  <button type="button" className="new-order-add-btn" title="Add new location" onClick={() => setAddBranchTarget("shipTo")}>
                    <PlusLg size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div className={`field-group${touched && !supplierId ? " field-group--error" : ""}`}>
              <label>Supplier (To) <span style={{ color: "red" }}>*</span></label>
              <Dropdown
                placeholder="Select supplier"
                value={supplierId}
                options={supplierOptions}
                onChange={setSupplierId}
              />
              {touched && !supplierId && <span className="field-error">Select a supplier</span>}
            </div>

            <div className="field-row-2">
              <div className="field-group">
                <label>Order Date</label>
                <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>
              <div className="field-group">
                <label>Ref. Number</label>
                <input type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
              </div>
            </div>

            <div className="field-row-2">
              <div className="field-group">
                <label>Shipment Date</label>
                <input type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} />
              </div>
              <div className="field-group">
                <label>Delivery Date</label>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
            </div>

            <div className="field-group">
              <label>Payment Terms</label>
              <div className="new-order-suffix-input">
                <input
                  type="number"
                  min={0}
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                />
                <span>days</span>
              </div>
            </div>

            <div className="field-group">
              <label>Remark</label>
              <input type="text" placeholder="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
          </section>

          <div className="section-divider" />

          <section className="form-section">
            <h3>Tax</h3>

            <div className="field-row-2">
              <div className="field-group">
                <label>Tax Type</label>
                <Dropdown
                  searchable={false}
                  value={taxType}
                  options={TAX_TYPE_OPTIONS}
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
          </section>

          <div className="section-divider" />

          <section className="form-section">
            <h3>Signature</h3>

            <div className="field-group">
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

            <div className="field-group">
              <label>Terms and Conditions</label>
              <textarea
                rows={3}
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
              />
            </div>
          </section>

          <div className="section-divider" />

          <section className="form-section">
            <div className="new-order-page__items-head">
              <h3>Line Items</h3>
              <Button variant="outline-dark" size="sm" iconLeft={<PlusLg size={13} />} onClick={() => setLines((prev) => [...prev, emptyLine()])}>
                Add Item
              </Button>
            </div>

            <div className="new-order-table-wrap">
              <table className="phist-table new-order-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Product Code</th>
                    <th>Qty</th>
                    <th>Selling Price</th>
                    <th>Discount (%)</th>
                    <th>Cost Price (Per Qty)</th>
                    <th>Cost W/O Tax (Per Qty)</th>
                    <th>Total Cost W/O Tax</th>
                    <th>Total Tax</th>
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
                                productCode: p.barcode || p.sku || "",
                                sellingPrice: p.retail_price != null ? String(p.retail_price) : line.sellingPrice,
                                costPrice: p.supply_price != null ? String(p.supply_price) : line.costPrice,
                              })}
                            />
                          )}
                        </td>
                        <td>
                          <input
                            className="new-order-input--sm"
                            value={line.productCode}
                            onChange={(e) => patchLine(line.key, { productCode: e.target.value })}
                          />
                        </td>
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
                            value={line.sellingPrice}
                            onChange={(e) => patchLine(line.key, { sellingPrice: e.target.value })}
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
                            onChange={(e) => patchLine(line.key, { discountPercent: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="new-order-input--sm"
                            value={line.costPrice}
                            onChange={(e) => patchLine(line.key, { costPrice: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </td>
                        <td className="new-order-table__readonly">{formatAmount(m.costPrice)}</td>
                        <td className="new-order-table__readonly">{formatAmount(m.totalCostWoTax)}</td>
                        <td className="new-order-table__readonly">{formatAmount(m.totalTax)}</td>
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
            {touched && hasIncompleteLine && <span className="field-error">Every product needs a quantity, selling price, and cost price</span>}

            <div className="new-order-page__totals">
              <span>Total Quantity <strong>{totalQuantity}</strong></span>
              <span>Total Price <strong>{formatAmount(totalPrice)}</strong></span>
            </div>
          </section>
        </div>
      )}

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
