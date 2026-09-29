import { useEffect, useMemo, useState } from "react";
import { X, PlusLg, PencilSquare, Trash, Star, StarFill } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  fetchProductDetailThunk,
  fetchProductStockLedgerTimelineThunk,
  fetchProductPurchaseHistoryThunk,
  fetchUsageHistoryThunk,
  addProductSupplierMappingThunk,
  updateProductSupplierMappingThunk,
  removeProductSupplierMappingThunk,
  fetchSuppliersThunk,
} from "../../../middleware/inventory/inventory.thunk";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppSelector } from "../../../hooks/useAppRedux";
import type {
  ProductDetailAggregate, ProductSupplierMapping, StockLedgerTimelineEntry,
  ProductPurchaseHistoryRow, UsageHistoryRow,
} from "../../../types/inventory.types";
import Tabs from "../../../components/ui/Tabs";
import type { TabItem } from "../../../components/ui/Tabs";
import { Dropdown } from "../../../components/ui/Dropdown";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import { formatDateDDMMYYYY as fmtDate } from "../../../utils/dateFormat";
import "../styles/ProductDetailDrawer.scss";

interface Props {
  productId: string;
  onClose: () => void;
}

// Manual/reconciliation-type movements — the "Adjustments" tab filters the
// same Stock History timeline down to just these, so a user auditing damage/
// loss/manual corrections doesn't have to scan past every purchase and sale.
const ADJUSTMENT_TYPES = new Set([
  "adjustment_in", "adjustment_out", "damage", "expired", "transfer_in",
  "transfer_out", "sample", "lost", "internal_use", "audit_adjustment_in", "audit_adjustment_out",
]);

interface SupplierFormState {
  supplierId: string;
  sku: string;
  price: string;
  preferred: boolean;
}

const emptySupplierForm = (): SupplierFormState => ({ supplierId: "", sku: "", price: "", preferred: false });

const ProductDetailDrawer: React.FC<Props> = ({ productId, onClose }) => {
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const suppliers = useAppSelector((s) => s.inventory.suppliers);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetailAggregate | null>(null);
  const [activeTab, setActiveTab] = useState<"stock" | "purchases" | "usage" | "adjustments">("stock");

  const [ledger, setLedger] = useState<StockLedgerTimelineEntry[] | null>(null);
  const [purchases, setPurchases] = useState<ProductPurchaseHistoryRow[] | null>(null);
  const [usage, setUsage] = useState<UsageHistoryRow[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const [addingSupplier, setAddingSupplier] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(emptySupplierForm());
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    if (!suppliers.length) dispatch(fetchSuppliersThunk({ page_limit: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    dispatch(fetchProductDetailThunk(productId))
      .unwrap()
      .then(setDetail)
      .catch((err) => {
        const msg = typeof err === "string" ? err : "Couldn't load product detail";
        setLoadError(msg);
        showError(msg);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (activeTab === "stock" || activeTab === "adjustments") {
      if (ledger) return;
      setTabLoading(true);
      dispatch(fetchProductStockLedgerTimelineThunk(productId)).unwrap()
        .then(setLedger).catch(() => setLedger([])).finally(() => setTabLoading(false));
    } else if (activeTab === "purchases") {
      if (purchases) return;
      setTabLoading(true);
      dispatch(fetchProductPurchaseHistoryThunk(productId)).unwrap()
        .then((r) => setPurchases(r.data)).catch(() => setPurchases([])).finally(() => setTabLoading(false));
    } else if (activeTab === "usage") {
      if (usage) return;
      setTabLoading(true);
      dispatch(fetchUsageHistoryThunk({ product_id: productId, limit: 100 })).unwrap()
        .then((r) => setUsage(r.data)).catch(() => setUsage([])).finally(() => setTabLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, productId]);

  const supplierOptions = useMemo(() => suppliers.map((s) => ({ id: s.id, name: s.name })), [suppliers]);
  const adjustmentRows = useMemo(() => (ledger ?? []).filter((r) => ADJUSTMENT_TYPES.has(r.transaction_type)), [ledger]);

  function startAdd() {
    setSupplierForm(emptySupplierForm());
    setEditingMappingId(null);
    setAddingSupplier(true);
  }

  function startEdit(m: ProductSupplierMapping) {
    setSupplierForm({ supplierId: m.supplier_id, sku: m.supplier_sku || "", price: m.price != null ? String(m.price) : "", preferred: m.is_preferred });
    setEditingMappingId(m.id);
    setAddingSupplier(false);
  }

  function cancelSupplierForm() {
    setAddingSupplier(false);
    setEditingMappingId(null);
  }

  async function saveSupplierForm() {
    if (addingSupplier && !supplierForm.supplierId) { showError("Select a supplier"); return; }
    setSavingSupplier(true);
    try {
      const payload = {
        supplier_sku: supplierForm.sku.trim() || undefined,
        price: supplierForm.price.trim() ? Number(supplierForm.price) : undefined,
        is_preferred: supplierForm.preferred,
      };
      if (addingSupplier) {
        await dispatch(addProductSupplierMappingThunk({
          productId, payload: { supplier_id: supplierForm.supplierId, ...payload },
        })).unwrap();
      } else if (editingMappingId) {
        await dispatch(updateProductSupplierMappingThunk({ productId, mappingId: editingMappingId, payload })).unwrap();
      }
      const updated = await dispatch(fetchProductDetailThunk(productId)).unwrap();
      setDetail(updated);
      showSuccess("Supplier saved");
      cancelSupplierForm();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to save supplier");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function removeSupplier(mappingId: string) {
    try {
      await dispatch(removeProductSupplierMappingThunk({ productId, mappingId })).unwrap();
      const updated = await dispatch(fetchProductDetailThunk(productId)).unwrap();
      setDetail(updated);
      showSuccess("Supplier removed");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to remove supplier");
    }
  }

  const tabs: TabItem[] = [
    { key: "stock", label: "Stock History" },
    { key: "purchases", label: "Purchase History" },
    { key: "usage", label: "Sales & Usage" },
    { key: "adjustments", label: "Adjustments" },
  ];

  return (
    <div className="pdd-overlay" onClick={onClose}>
      <div className="pdd-panel" onClick={(e) => e.stopPropagation()}>
        {overlay}
        <div className="pdd-header">
          <h3>{detail?.row.name || (loadError ? "Couldn't load product" : "Loading…")}</h3>
          <button className="pdd-close" onClick={onClose}><X size={20} /></button>
        </div>

        {loading ? (
          <div className="pdd-loading"><Skeleton width="100%" height={200} /></div>
        ) : loadError || !detail ? (
          <div className="pdd-loading">
            <p className="pdd-empty-hint">{loadError || "Couldn't load product detail."}</p>
          </div>
        ) : (
          <div className="pdd-body">
            <div className="pdd-stats">
              <div className="pdd-stat">
                <span className="pdd-stat-label">Current Stock</span>
                <span className="pdd-stat-value">{Number(detail.row.stock) || 0}</span>
              </div>
              <div className="pdd-stat">
                <span className="pdd-stat-label">On Order</span>
                <span className="pdd-stat-value">{Number(detail.on_order) || 0}</span>
              </div>
              <div className="pdd-stat">
                <span className="pdd-stat-label">Last Purchase Price</span>
                <span className="pdd-stat-value">{detail.last_purchase_price != null ? formatAmount(detail.last_purchase_price) : "—"}</span>
              </div>
            </div>

            <div className="pdd-suppliers">
              <div className="pdd-suppliers__head">
                <h4>Suppliers</h4>
                {!addingSupplier && !editingMappingId && (
                  <Button variant="outline-dark" size="sm" iconLeft={<PlusLg size={12} />} onClick={startAdd}>
                    Add
                  </Button>
                )}
              </div>

              {detail.suppliers.map((m) => (
                editingMappingId === m.id ? (
                  <div key={m.id} className="pdd-supplier-form">
                    <Dropdown value={supplierForm.supplierId} options={supplierOptions} placeholder="Supplier" onChange={() => {}} disabled />
                    <input placeholder="SKU" value={supplierForm.sku} onChange={(e) => setSupplierForm((f) => ({ ...f, sku: e.target.value }))} />
                    <input placeholder="Price" type="number" min="0" value={supplierForm.price} onChange={(e) => setSupplierForm((f) => ({ ...f, price: e.target.value }))} />
                    <label className="pdd-preferred-check">
                      <input type="checkbox" checked={supplierForm.preferred} onChange={(e) => setSupplierForm((f) => ({ ...f, preferred: e.target.checked }))} />
                      Preferred
                    </label>
                    <div className="pdd-supplier-form__actions">
                      <Button variant="outline-dark" size="sm" onClick={cancelSupplierForm} disabled={savingSupplier}>Cancel</Button>
                      <Button variant="dark" size="sm" onClick={saveSupplierForm} disabled={savingSupplier}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="pdd-supplier-row">
                    <button
                      type="button"
                      className="pdd-preferred-star"
                      title={m.is_preferred ? "Preferred supplier" : "Not preferred"}
                      onClick={() => { setSupplierForm({ supplierId: m.supplier_id, sku: m.supplier_sku || "", price: m.price != null ? String(m.price) : "", preferred: true }); setEditingMappingId(m.id); }}
                    >
                      {m.is_preferred ? <StarFill size={14} color="#d97706" /> : <Star size={14} color="#9ca3af" />}
                    </button>
                    <div className="pdd-supplier-info">
                      <span className="pdd-supplier-name">{m.supplier_name}</span>
                      <span className="pdd-supplier-sub">
                        {[m.supplier_sku, m.price != null ? formatAmount(m.price) : null].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </div>
                    <button className="pdd-icon-btn" onClick={() => startEdit(m)} title="Edit"><PencilSquare size={13} /></button>
                    <button className="pdd-icon-btn pdd-icon-btn--danger" onClick={() => removeSupplier(m.id)} title="Remove"><Trash size={13} /></button>
                  </div>
                )
              ))}

              {addingSupplier && (
                <div className="pdd-supplier-form">
                  <Dropdown value={supplierForm.supplierId} options={supplierOptions} placeholder="Select supplier" onChange={(id) => setSupplierForm((f) => ({ ...f, supplierId: id }))} />
                  <input placeholder="SKU" value={supplierForm.sku} onChange={(e) => setSupplierForm((f) => ({ ...f, sku: e.target.value }))} />
                  <input placeholder="Price" type="number" min="0" value={supplierForm.price} onChange={(e) => setSupplierForm((f) => ({ ...f, price: e.target.value }))} />
                  <label className="pdd-preferred-check">
                    <input type="checkbox" checked={supplierForm.preferred} onChange={(e) => setSupplierForm((f) => ({ ...f, preferred: e.target.checked }))} />
                    Preferred
                  </label>
                  <div className="pdd-supplier-form__actions">
                    <Button variant="outline-dark" size="sm" onClick={cancelSupplierForm} disabled={savingSupplier}>Cancel</Button>
                    <Button variant="dark" size="sm" onClick={saveSupplierForm} disabled={savingSupplier}>Save</Button>
                  </div>
                </div>
              )}

              {detail.suppliers.length === 0 && !addingSupplier && (
                <p className="pdd-empty-hint">No suppliers mapped to this product yet.</p>
              )}
            </div>

            <Tabs tabs={tabs} activeKey={activeTab} onChange={(k) => setActiveTab(k as typeof activeTab)} variant="underline" className="pdd-tabs" />

            <div className="pdd-tab-content">
              {tabLoading ? (
                <Skeleton width="100%" height={140} />
              ) : activeTab === "stock" ? (
                <table className="pdd-table">
                  <thead><tr><th>Date</th><th>Type</th><th className="pdd-num">Qty</th><th className="pdd-num">Balance</th><th>Reference</th></tr></thead>
                  <tbody>
                    {(ledger ?? []).map((r) => (
                      <tr key={r.id}>
                        <td>{fmtDate(r.created_at)}</td>
                        <td>{r.transaction_type.replace(/_/g, " ")}</td>
                        <td className="pdd-num">{Number(r.quantity) || 0}</td>
                        <td className="pdd-num">{Number(r.balance_after) || 0}</td>
                        <td>{r.reference || "—"}</td>
                      </tr>
                    ))}
                    {ledger && ledger.length === 0 && <tr><td colSpan={5} className="pdd-empty-hint">No stock movements yet.</td></tr>}
                  </tbody>
                </table>
              ) : activeTab === "purchases" ? (
                <table className="pdd-table">
                  <thead><tr><th>Purchase #</th><th>Date</th><th>Supplier</th><th className="pdd-num">Total</th></tr></thead>
                  <tbody>
                    {(purchases ?? []).map((p) => (
                      <tr key={p.id}>
                        <td>{p.purchase_number}</td>
                        <td>{fmtDate(p.purchase_date)}</td>
                        <td>{p.supplier_name || "—"}</td>
                        <td className="pdd-num">{formatAmount(p.total_amount)}</td>
                      </tr>
                    ))}
                    {purchases && purchases.length === 0 && <tr><td colSpan={4} className="pdd-empty-hint">No purchases recorded yet.</td></tr>}
                  </tbody>
                </table>
              ) : activeTab === "usage" ? (
                <table className="pdd-table">
                  <thead><tr><th>Date</th><th>Service</th><th>Staff</th><th className="pdd-num">Qty</th><th>Direction</th></tr></thead>
                  <tbody>
                    {(usage ?? []).map((u) => (
                      <tr key={u.id}>
                        <td>{fmtDate(u.date)}</td>
                        <td>{u.service_name || "—"}</td>
                        <td>{u.staff_name || "—"}</td>
                        <td className="pdd-num">{Number(u.qty) || 0}</td>
                        <td>{u.direction === "return" ? "Returned" : "Used"}</td>
                      </tr>
                    ))}
                    {usage && usage.length === 0 && <tr><td colSpan={5} className="pdd-empty-hint">No sales/usage recorded yet.</td></tr>}
                  </tbody>
                </table>
              ) : (
                <table className="pdd-table">
                  <thead><tr><th>Date</th><th>Type</th><th className="pdd-num">Qty</th><th>Reason</th></tr></thead>
                  <tbody>
                    {adjustmentRows.map((r) => (
                      <tr key={r.id}>
                        <td>{fmtDate(r.created_at)}</td>
                        <td>{r.transaction_type.replace(/_/g, " ")}</td>
                        <td className="pdd-num">{Number(r.quantity) || 0}</td>
                        <td>{r.reason || "—"}</td>
                      </tr>
                    ))}
                    {ledger && adjustmentRows.length === 0 && <tr><td colSpan={4} className="pdd-empty-hint">No adjustments recorded yet.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailDrawer;
