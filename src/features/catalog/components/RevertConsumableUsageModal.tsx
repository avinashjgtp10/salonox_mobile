// src/features/catalog/components/RevertConsumableUsageModal.tsx
//
// Confirmation for reverting a consumable deduction that never actually
// happened. This moves real stock, so it states the four figures the decision
// turns on before committing: which product, how much was deducted, what's on
// hand now, and what will be restored.
//
// "Stock after revert" is shown as an arrow rather than a bare number because
// the whole point of the dialog is the delta — a user who misreads which of
// two similar numbers is the new one has learned nothing from the dialog.
import React, { useEffect, useState } from "react";
import { ArrowRight, ExclamationTriangle } from "react-bootstrap-icons";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import type { UsageHistoryRow } from "../../../types/inventory.types";
import "../styles/RevertConsumableUsageModal.scss";

interface Props {
  row: UsageHistoryRow | null;
  onClose: () => void;
  /** Resolves when the revert succeeded; rejects with a message to display. */
  onConfirm: (row: UsageHistoryRow, reason: string) => Promise<void>;
}

const fmtQty = (n: number, unit?: string | null) =>
  `${Number(n).toLocaleString()}${unit ? ` ${unit}` : ""}`;

const RevertConsumableUsageModal: React.FC<Props> = ({ row, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) { setReason(""); setError(null); }
  }, [row]);

  if (!row) return null;

  const restored = Number(row.current_stock) + Number(row.qty);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(row, reason);
    } catch (err: any) {
      setError(err?.message || "Could not revert this deduction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      onClose={saving ? () => {} : onClose}
      title="Revert consumable deduction"
      size="md"
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={saving}>
            {saving ? "Reverting…" : "Revert deduction"}
          </Button>
        </>
      }
    >
      <div className="rcu">
        <p className="rcu__lead">
          This returns the deducted quantity to stock. The original usage record is
          kept for audit and a separate revert entry is added beside it.
        </p>

        <dl className="rcu__facts">
          <div className="rcu__fact">
            <dt>Consumable product</dt>
            <dd>{row.product_name}</dd>
          </div>
          {row.service_name && (
            <div className="rcu__fact">
              <dt>Service</dt>
              <dd>{row.service_name}</dd>
            </div>
          )}
          <div className="rcu__fact">
            <dt>Used quantity</dt>
            <dd>{fmtQty(row.qty, row.unit)}</dd>
          </div>
          <div className="rcu__fact">
            <dt>Current stock</dt>
            <dd>{fmtQty(row.current_stock, row.unit)}</dd>
          </div>
          <div className="rcu__fact rcu__fact--highlight">
            <dt>Quantity to be restored</dt>
            <dd>
              +{fmtQty(row.qty, row.unit)}
              <span className="rcu__delta">
                {fmtQty(row.current_stock, row.unit)} <ArrowRight size={12} /> <strong>{fmtQty(restored, row.unit)}</strong>
              </span>
            </dd>
          </div>
        </dl>

        <label className="rcu__reason">
          <span>Reason <em>(optional)</em></span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Product was not used for this service"
            maxLength={200}
            disabled={saving}
          />
        </label>

        <div className="rcu__note">
          <ExclamationTriangle size={13} />
          <span>A reverted deduction can’t be reverted again.</span>
        </div>

        {error && <div className="rcu__error">{error}</div>}
      </div>
    </Modal>
  );
};

export default RevertConsumableUsageModal;
