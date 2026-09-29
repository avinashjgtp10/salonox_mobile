import { useEffect, useMemo, useState } from "react";
import { BoxSeam } from "react-bootstrap-icons";
import { Modal } from "../../../components/ui";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchSupplierProductsThunk } from "../../../middleware/inventory/inventory.thunk";
import type { SupplierProduct } from "../../../types/inventory.types";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import ResolveSupplierProductRow from "./ResolveSupplierProductRow";
import "../styles/ImportSupplierCatalogModal.scss";

interface Props {
  show: boolean;
  onClose: () => void;
  supplierId: string;
  supplierName?: string;
  // Selected MATCHED rows only — NewOrderPage builds its own OrderLine[]
  // from these (product_id/linked_product_name/barcode/price), same
  // shape ProductSearchSelect's onSelect callback already populates.
  onAdd: (selected: SupplierProduct[]) => void;
}

// Suggested Products — matched catalog rows can be bulk-added to the order
// with one click; unmatched rows still need a human to resolve them first
// (see ResolveSupplierProductRow.tsx), shown here too so a suggestion that
// was skipped at import time doesn't just disappear.
export default function SuggestedProductsModal({ show, onClose, supplierId, supplierName, onAdd }: Props) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SupplierProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    dispatch(fetchSupplierProductsThunk({ supplierId }))
      .unwrap()
      .then((result) => { setRows(result); setSelected(new Set()); })
      .catch((err) => setError(typeof err === "string" ? err : "Couldn't load supplier catalog"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, supplierId]);

  const matched = useMemo(() => rows.filter((r) => r.match_status === "matched" && !r.ignored), [rows]);
  const needsAttention = useMemo(() => rows.filter((r) => r.match_status === "unmatched" && !r.ignored), [rows]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleAddSelected() {
    const chosen = matched.filter((r) => selected.has(r.id));
    if (!chosen.length) return;
    onAdd(chosen);
    onClose();
  }

  return (
    <Modal show={show} onClose={onClose} title={`Suggested Products${supplierName ? ` — ${supplierName}` : ""}`} size="lg">
      <div className="import-supplier-catalog-modal">
        {loading ? (
          <Skeleton width="100%" height={160} />
        ) : error ? (
          <p className="text-muted small mb-0">{error}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BoxSeam size={32} />}
            title="No catalog yet for this supplier"
            description="Import their product list first to get suggestions here."
          />
        ) : (
          <>
            {matched.length > 0 && (
              <div>
                <p className="iscm-needs-attention-title mb-2">Ready to add ({matched.length})</p>
                <div className="rspr-list">
                  {matched.map((row) => (
                    <label key={row.id} className="rspr-row" style={{ cursor: "pointer" }}>
                      <div className="rspr-info">
                        <span className="rspr-name">{row.linked_product_name || row.name}</span>
                        <span className="rspr-sub">
                          {[row.barcode, row.price != null ? `₹${row.price}` : null].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {needsAttention.length > 0 && (
              <div className="iscm-needs-attention">
                <p className="iscm-needs-attention-title">Needs attention ({needsAttention.length})</p>
                <p className="iscm-needs-attention-hint">
                  These items couldn't be matched to an existing product — link them to one, create a new product, or ignore them.
                </p>
                {needsAttention.map((row) => (
                  <ResolveSupplierProductRow
                    key={row.id}
                    supplierId={supplierId}
                    row={row}
                    onResolved={(updated) => setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
                    onError={setError}
                  />
                ))}
              </div>
            )}

            {matched.length === 0 && needsAttention.length === 0 && (
              <EmptyState
                icon={<BoxSeam size={32} />}
                title="Nothing left to suggest"
                description="Every catalog item has already been added, resolved, or ignored."
              />
            )}
          </>
        )}

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button variant="outline-dark" onClick={onClose}>Close</Button>
          <Button variant="dark" onClick={handleAddSelected} disabled={selected.size === 0}>
            Add Selected ({selected.size})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
