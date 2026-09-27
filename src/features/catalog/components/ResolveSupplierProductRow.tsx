import { useState } from "react";
import { Link45deg, PlusCircle, EyeSlash } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { resolveSupplierProductThunk } from "../../../middleware/inventory/inventory.thunk";
import type { SupplierProduct } from "../../../types/inventory.types";
import ProductSearchSelect, { type ProductSearchResult } from "./ProductSearchSelect";
import Button from "../../../components/ui/Button";
import "../styles/ImportSupplierCatalogModal.scss";

interface Props {
  supplierId: string;
  row: SupplierProduct;
  onResolved: (updated: SupplierProduct) => void;
  onError: (msg: string) => void;
}

// One unmatched catalog row with its three resolve actions — reused both
// right after an import (still-unmatched rows from that batch) and inside
// the Suggested Products panel's "Needs attention" list.
export default function ResolveSupplierProductRow({ supplierId, row, onResolved, onError }: Props) {
  const dispatch = useAppDispatch();
  const [linking, setLinking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [retailPrice, setRetailPrice] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve(payload: { action: "link" | "create_product" | "ignore"; product_id?: string; retail_price?: number }) {
    setBusy(true);
    try {
      const updated = await dispatch(
        resolveSupplierProductThunk({ supplierId, catalogId: row.id, payload }),
      ).unwrap();
      onResolved(updated);
    } catch (err: any) {
      onError(typeof err === "string" ? err : "Failed to resolve catalog row");
    } finally {
      setBusy(false);
      setLinking(false);
      setCreating(false);
    }
  }

  function submitCreate() {
    const price = Number(retailPrice);
    if (!retailPrice || !Number.isFinite(price) || price <= 0) {
      onError("Enter a valid retail price to create this product");
      return;
    }
    resolve({ action: "create_product", retail_price: price });
  }

  return (
    <div className="rspr-row">
      <div className="rspr-info">
        <span className="rspr-name">{row.name}</span>
        <span className="rspr-sub">
          {[row.barcode, row.price != null ? `₹${row.price}` : null].filter(Boolean).join(" · ") || "—"}
        </span>
      </div>

      {linking ? (
        <div className="rspr-link-search">
          <ProductSearchSelect
            onSelect={(p: ProductSearchResult) => resolve({ action: "link", product_id: p.id })}
          />
          <Button variant="outline-dark" size="sm" onClick={() => setLinking(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      ) : creating ? (
        <div className="rspr-create-price">
          <input
            type="number"
            min="0"
            step="0.01"
            className="rspr-price-input"
            placeholder="Retail price"
            value={retailPrice}
            onChange={(e) => setRetailPrice(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <Button variant="outline-dark" size="sm" onClick={submitCreate} disabled={busy}>
            Create
          </Button>
          <Button variant="outline-dark" size="sm" onClick={() => { setCreating(false); setRetailPrice(""); }} disabled={busy}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="rspr-actions">
          <Button variant="outline-dark" size="sm" iconLeft={<Link45deg size={13} />} onClick={() => setLinking(true)} disabled={busy}>
            Link
          </Button>
          <Button variant="outline-dark" size="sm" iconLeft={<PlusCircle size={13} />} onClick={() => setCreating(true)} disabled={busy}>
            Create Product
          </Button>
          <Button variant="outline-dark" size="sm" iconLeft={<EyeSlash size={13} />} onClick={() => resolve({ action: "ignore" })} disabled={busy}>
            Ignore
          </Button>
        </div>
      )}
    </div>
  );
}
