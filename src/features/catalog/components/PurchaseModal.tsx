import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trash, PlusLg } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { fetchSuppliersThunk, createSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import type { AppDispatch, RootState } from "../../../store/store";
import { useCurrency } from "../../../hooks/useCurrency";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Dropdown from "../../../components/ui/Dropdown";
import { DatePicker } from "../../../components/ui";
import QuickAdd from "./form/QuickAdd";
import ProductSearchSelect, { type ProductSearchResult } from "./ProductSearchSelect";
import "../styles/PurchaseModal.scss";

interface PurchaseLine {
  key: string;
  product: ProductSearchResult | null;
  quantity: string;
  purchasePrice: string;
  expiryDate: string;
}

function emptyLine(): PurchaseLine {
  return { key: Math.random().toString(36).slice(2), product: null, quantity: "", purchasePrice: "", expiryDate: "" };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  onClose: () => void;
  /** `updatedProducts` are the freshly recomputed Product Inventory rows for
   *  everything this purchase touched — the page patches its table state from
   *  this directly, no follow-up GET. */
  onSaved: (result: { purchaseNumber: string; updatedProducts: any[] }) => void;
  onError: (msg: string) => void;
}

// Product Inventory → Purchase → Select Supplier → Add Products → Save
// Purchase. Saving is exactly ONE POST (supplier + every line in one request
// body) — see PRODUCT_INVENTORY_PURCHASES; the backend does the whole
// multi-item transaction and returns the generated Supplier Number plus the
// updated rows in that same response.
export default function PurchaseModal({ onClose, onSaved, onError }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const suppliers = useSelector((s: RootState) => s.inventory.suppliers) as { id: string; name: string }[];
  const { currencySymbol, formatAmount } = useCurrency();

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [lines, setLines] = useState<PurchaseLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  // page_limit:100 — this is the Supplier dropdown, not the paginated
  // Suppliers list page, so it needs the full set.
  useEffect(() => { dispatch(fetchSuppliersThunk({ page_limit: 100 })); }, [dispatch]);

  async function handleAddSupplier(name: string) {
    const result = await dispatch(createSupplierThunk({ name })).unwrap();
    if (result?.id) setSupplierId(result.id);
  }

  function patchLine(key: string, patch: Partial<PurchaseLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const validLines = lines.filter((l) => {
    const qty = parseFloat(l.quantity);
    const price = parseFloat(l.purchasePrice);
    return l.product && Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price >= 0;
  });

  const totalAmount = validLines.reduce(
    (sum, l) => sum + parseFloat(l.quantity) * parseFloat(l.purchasePrice),
    0,
  );

  const hasIncompleteLine = lines.some((l) => {
    // A line the user has started (picked a product) but not finished
    // shouldn't silently be dropped from the save — flag it instead.
    if (!l.product) return false;
    const qty = parseFloat(l.quantity);
    const price = parseFloat(l.purchasePrice);
    return !(Number.isFinite(qty) && qty > 0) || !(Number.isFinite(price) && price >= 0);
  });

  const canSave = !!supplierId && validLines.length > 0 && !hasIncompleteLine;

  async function handleSave() {
    setTouched(true);
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const res = await api.post(INVENTORY.PRODUCT_INVENTORY_PURCHASES, {
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        items: validLines.map((l) => ({
          product_id: l.product!.id,
          quantity: parseFloat(l.quantity),
          purchase_price: parseFloat(l.purchasePrice),
          expiry_date: l.expiryDate || null,
        })),
      });
      const data = res.data?.data;
      onSaved({
        purchaseNumber: data?.purchase?.purchase_number,
        updatedProducts: data?.updatedProducts ?? [],
      });
    } catch (err: any) {
      onError(err?.response?.data?.message || "Couldn't record purchase");
      setSaving(false);
    }
  }

  return (
    <Modal
      show
      onClose={onClose}
      title="Record Purchase"
      size="lg"
      disableBackdropClose
      footer={
        <div className="d-flex justify-content-between align-items-center w-100">
          <span className="pm-total">
            Total Amount <strong>{formatAmount(totalAmount)}</strong>
          </span>
          <div className="d-flex gap-2">
            <Button variant="outline-dark" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="dark" onClick={handleSave} disabled={saving || !canSave} loading={saving}>
              Save Purchase
            </Button>
          </div>
        </div>
      }
    >
      <div className="pm-field">
        <label className="pm-label">Supplier <span className="pm-req">*</span></label>
        <Dropdown
          value={supplierId}
          options={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          placeholder="Search supplier…"
          onChange={setSupplierId}
        />
        <QuickAdd label="Add a supplier" onAdd={handleAddSupplier} />
        {touched && !supplierId && <span className="pm-err">Select a supplier</span>}
      </div>

      <div className="pm-field">
        <label className="pm-label">Purchase Date <span className="pm-req">*</span></label>
        <DatePicker value={purchaseDate} onChange={setPurchaseDate} separator="-" className="dp--block" />
      </div>

      <div className="pm-field">
        <label className="pm-label">Products <span className="pm-req">*</span></label>
        <div className="pm-lines">
          <div className="pm-lines__head">
            <span>Product</span>
            <span>Quantity</span>
            <span>Purchase Price ({currencySymbol})</span>
            <span>Expiry Date</span>
            <span>Total</span>
            <span />
          </div>
          {lines.map((line) => {
            const qty = parseFloat(line.quantity);
            const price = parseFloat(line.purchasePrice);
            const lineTotal = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
            return (
              <div className="pm-lines__row" key={line.key}>
                <div className="pm-lines__product">
                  {line.product ? (
                    <div className="pm-selected-product">
                      <span>{line.product.name}</span>
                      <button type="button" onClick={() => patchLine(line.key, { product: null })}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <ProductSearchSelect
                      onSelect={(p) => patchLine(line.key, {
                        product: p,
                        // Defaults to 1 on every product pick (including
                        // re-picking a different product into an existing
                        // row via "Change") — still a plain editable input
                        // afterward, this only seeds the initial value.
                        quantity: "1",
                        purchasePrice: p.supply_price != null ? String(p.supply_price) : line.purchasePrice,
                      })}
                    />
                  )}
                </div>
                <input
                  className="pm-input pm-input--sm"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) => patchLine(line.key, { quantity: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <input
                  className="pm-input pm-input--sm"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Price"
                  value={line.purchasePrice}
                  onChange={(e) => patchLine(line.key, { purchasePrice: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <DatePicker
                  className="dp--block"
                  value={line.expiryDate}
                  onChange={(v) => patchLine(line.key, { expiryDate: v })}
                  separator="-"
                />
                <span className="pm-line-total">{formatAmount(lineTotal)}</span>
                <button
                  type="button"
                  className="pm-remove-line"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  title="Remove product"
                >
                  <Trash size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" className="pm-add-line" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
          <PlusLg size={13} /> Add Product
        </button>
        {touched && validLines.length === 0 && <span className="pm-err">Add at least one product</span>}
        {touched && hasIncompleteLine && <span className="pm-err">Every product needs a quantity and purchase price</span>}
      </div>
    </Modal>
  );
}
