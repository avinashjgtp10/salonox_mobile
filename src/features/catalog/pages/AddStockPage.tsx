import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import type { AppDispatch, RootState } from "../../../store/store";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { fetchBranchesThunk } from "../../../middleware/salon/salon.thunk";
import { searchProductsThunk } from "../../../middleware/catalog/products.thunk";
import { fetchSuppliersThunk } from "../../../middleware/inventory/inventory.thunk";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import ProductSearchSelect, { type ProductSearchResult } from "../components/ProductSearchSelect";
import Dropdown from "../../../components/ui/Dropdown";
import "../styles/ConsumableFormPage.scss";

// One page serves both create and edit, same convention as ServiceFormPage/
// ProductFormPage — the :id route param decides which, and the fetched
// entry (when editing) autofills every field below.

const REASON_OPTIONS = ["Purchase Stock", "Client Return", "Branch Transfer", "Opening Stock"];

interface FormState {
  branchId: string;
  productId: string;
  qtyIn: string;
  unitCost: string;
  reference: string;
  reason: string;
  notes: string;
  supplierId: string;
}

const emptyForm = (branchId: string): FormState => ({
  branchId, productId: "", qtyIn: "", unitCost: "", reference: "", reason: "Purchase Stock", notes: "", supplierId: "",
});

const REASON_TO_TRANSACTION_TYPE: Record<string, string> = {
  "Purchase Stock": "purchase",
  "Client Return": "return",
  "Branch Transfer": "transfer_in",
  "Opening Stock": "opening_stock",
};

const TRANSACTION_TYPE_TO_REASON: Record<string, string> = {
  purchase: "Purchase Stock",
  return: "Client Return",
  transfer_in: "Branch Transfer",
  opening_stock: "Opening Stock",
};

export default function AddStockPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { showError } = useStatusOverlay();
  const listPath = "/dashboard/inventory/ledger";

  const { branches } = useSelector((s: RootState) => s.salon);
  const currentSalon = useSelector(selectCurrentSalon);
  const { items: reduxProducts } = useSelector((s: RootState) => s.products);
  const supplierList = useSelector((s: RootState) => s.inventory.suppliers) as { id: string; name: string }[];

  const products = useMemo(
    () => (Array.isArray(reduxProducts) ? reduxProducts : []).map((p: any) => ({
      id: String(p.id), name: p.name, unit: p.measure_unit ?? "", stock: Number(p.amount) || 0,
    })),
    [reduxProducts],
  );

  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);

  useEffect(() => {
    if (currentSalon?.id) dispatch(fetchBranchesThunk(currentSalon.id));
    dispatch(searchProductsThunk({ pageSize: 200 }));
    // page_limit:100 — Supplier dropdown here needs the full set, not the
    // paginated Suppliers list page's default 10-per-page slice.
    dispatch(fetchSuppliersThunk({ page_limit: 100 }));
  }, [dispatch, currentSalon?.id]);

  useEffect(() => {
    if (branches?.length && !form.branchId) {
      const mainBranchId = (branches.find((b: any) => b.is_main)?.id ?? branches[0].id) as string;
      setForm((prev) => ({ ...prev, branchId: mainBranchId }));
    }
  }, [branches, form.branchId]);

  // Autofill on edit — same "fetch the record, populate the form" flow as
  // useServiceForm's isEdit branch.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setFetchLoading(true);
    api.get(INVENTORY.STOCK_LEDGER_BY_ID(id))
      .then((res) => {
        if (cancelled) return;
        const d = res.data?.data;
        if (!d) return;
        setForm({
          branchId: d.branch_id ?? "",
          productId: d.product_id,
          qtyIn: String(Math.abs(d.quantity)),
          unitCost: d.unit_cost != null ? String(d.unit_cost) : "",
          reference: d.reference ?? "",
          reason: TRANSACTION_TYPE_TO_REASON[d.transaction_type] ?? d.reason ?? "Purchase Stock",
          notes: d.notes ?? "",
          supplierId: d.supplier_id ?? "",
        });
        setSelectedProduct({ id: d.product_id, name: d.product_name });
      })
      .catch((err: any) => {
        if (cancelled) return;
        showError(err?.response?.data?.message || "Couldn't load stock ledger entry");
      })
      .finally(() => { if (!cancelled) setFetchLoading(false); });
    return () => { cancelled = true; };
  }, [id, showError]);

  const patch = (p: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
    setErrors((prev) => {
      const keys = Object.keys(p).filter((k) => k in prev);
      if (keys.length === 0) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  };

  const product = products.find((p) => p.id === form.productId);
  const qtyInNum = parseFloat(form.qtyIn) || 0;
  const unitCostNum = parseFloat(form.unitCost) || 0;
  const totalCost = qtyInNum * unitCostNum;
  const newStock = (product?.stock ?? 0) + qtyInNum;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.productId) e.productId = "Select a product";
    if (!form.qtyIn || qtyInNum <= 0) e.qtyIn = "Quantity must be greater than 0";
    if (!form.reference.trim()) e.reference = "Reference is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && id) {
        await api.put(INVENTORY.STOCK_LEDGER_BY_ID(id), {
          reference: form.reference.trim(),
          reason: form.reason,
          notes: form.notes.trim() || undefined,
          supplier_id: form.reason === "Purchase Stock" ? form.supplierId : "",
        });
      } else {
        await api.post(INVENTORY.STOCK_LEDGER, {
          branch_id: form.branchId,
          product_id: form.productId,
          transaction_type: REASON_TO_TRANSACTION_TYPE[form.reason] ?? "purchase",
          quantity: qtyInNum,
          unit_cost: unitCostNum || undefined,
          reference: form.reference.trim(),
          reason: form.reason,
          notes: form.notes.trim() || undefined,
          supplier_id: form.reason === "Purchase Stock" && form.supplierId ? form.supplierId : undefined,
        });
      }
      navigate(listPath);
    } catch (err: any) {
      showError(err?.response?.data?.message || `Couldn't ${isEdit ? "update" : "add"} stock`);
      setSaving(false);
    }
  };

  if (fetchLoading) return <div className="cf-page cf-page--loading">Loading…</div>;

  return (
    <div className="cf-page">
      <div className="cf-topbar">
        <h1>{isEdit ? "Edit Stock Entry" : "Add Stock"}</h1>
        <div className="cf-topbar-actions">
          <button className="cf-close" onClick={() => navigate(listPath)}>Close</button>
          <button className="cf-save-btn" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Stock"}
          </button>
        </div>
      </div>

      <div className="cf-body">
        <section className="cf-card">
          <h3>Stock Details</h3>

          <div className="cf-field">
            <label>Product *</label>
            {selectedProduct ? (
              <div className="cf-selected-product">
                <span>{selectedProduct.name}</span>
                {!isEdit && (
                  <button
                    type="button"
                    className="cf-quick-add-link"
                    onClick={() => { setSelectedProduct(null); patch({ productId: "" }); }}
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <ProductSearchSelect
                placeholder="Search product by name or barcode…"
                showIcon={false}
                onSelect={(p) => { setSelectedProduct(p); patch({ productId: p.id }); }}
              />
            )}
            {errors.productId && <span className="cf-field__error">{errors.productId}</span>}
          </div>

          <div className="cf-row">
            <div className="cf-field">
              <label>Quantity (In) {product ? `— ${product.unit}` : ""} *</label>
              <input
                type="number" min={0} step={1}
                placeholder="e.g. 500"
                value={form.qtyIn}
                disabled={isEdit}
                onChange={(e) => patch({ qtyIn: e.target.value })}
              />
              {errors.qtyIn && <span className="cf-field__error">{errors.qtyIn}</span>}
              {isEdit && <span className="cf-hint cf-hint--inline">Quantity can't be changed after the entry is recorded.</span>}
            </div>
            <div className="cf-field">
              <label>Unit Cost</label>
              <input
                type="number" min={0} step={1}
                placeholder="120"
                value={form.unitCost}
                disabled={isEdit}
                onChange={(e) => patch({ unitCost: e.target.value })}
              />
            </div>
          </div>

          {product && qtyInNum > 0 && (
            <div className="cf-total-display">
              Stock In: <strong>+{qtyInNum.toLocaleString()} {product.unit}</strong>
              {" · "}New Stock: <strong>{newStock.toLocaleString()} {product.unit}</strong>
              {totalCost > 0 && <> · Total Cost: <strong>₹{totalCost.toLocaleString()}</strong></>}
            </div>
          )}
        </section>

        <section className="cf-card">
          <h3>Reference &amp; Reason</h3>

          <div className="cf-field">
            <label>Reference *</label>
            <input
              placeholder="Purchase / Invoice No."
              value={form.reference}
              onChange={(e) => patch({ reference: e.target.value })}
            />
            {errors.reference && <span className="cf-field__error">{errors.reference}</span>}
          </div>

          <div className="cf-field">
            <label>Reason</label>
            <select
              value={form.reason}
              onChange={(e) => patch({ reason: e.target.value, ...(e.target.value !== "Purchase Stock" ? { supplierId: "" } : {}) })}
            >
              {REASON_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {form.reason === "Purchase Stock" && (
            <div className="cf-field">
              <label>Supplier</label>
              <Dropdown
                searchable
                allowNone
                placeholder="Select supplier (optional)"
                value={form.supplierId}
                options={supplierList.map((s) => ({ id: s.id, name: s.name }))}
                onChange={(id) => patch({ supplierId: id })}
              />
              <span className="cf-hint cf-hint--inline">
                Only set this if the stock actually came from a supplier delivery — it won't appear in Purchase History or that supplier's balance, it's just a note on this ledger entry.
              </span>
            </div>
          )}

          <div className="cf-field">
            <label>Notes</label>
            <textarea
              rows={3}
              placeholder="Any additional detail about this stock entry."
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </div>
        </section>

        {product && (
          <div className="cf-preview-row">
            <span>Current Stock — {product.name}</span>
            <span>{product.stock.toLocaleString()} {product.unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}
