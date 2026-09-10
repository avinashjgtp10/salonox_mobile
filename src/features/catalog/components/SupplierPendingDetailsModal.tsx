import React, { useEffect, useState } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchSupplierByIdThunk } from "../../../middleware/inventory/inventory.thunk";
import type { SupplierPaymentStatus, SupplierWithBalance } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import Modal from "../../../components/ui/Modal";
import Skeleton from "../../../components/ui/Skeleton";
import Button from "../../../components/ui/Button";
import "../styles/SupplierPendingDetailsModal.scss";

const STATUS_LABEL: Record<SupplierPaymentStatus, string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
};

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

interface Props {
  show: boolean;
  onClose: () => void;
  supplierId?: string;
}

// Opened from the Pending/Due Amount cell in the Suppliers List. Fetches
// fresh balance data by id rather than reusing the row already on screen, so
// the figures stay accurate even if the list is showing a slightly stale
// page — mirrors SupplierDetailPage's own loadSupplier().
const SupplierPendingDetailsModal: React.FC<Props> = ({ show, onClose, supplierId }) => {
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const [supplier, setSupplier] = useState<SupplierWithBalance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !supplierId) {
      setSupplier(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    dispatch(fetchSupplierByIdThunk(supplierId))
      .unwrap()
      .then((s) => { if (!cancelled) setSupplier(s); })
      .catch(() => { if (!cancelled) setSupplier(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [show, supplierId, dispatch]);

  const status = supplier?.status ?? "paid";

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Pending Amount"
      size="md"
      footer={
        <Button variant="outline-dark" fullWidth onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading || !supplier ? (
        <div className="supplier-pending-modal__loading">
          <Skeleton width="50%" height={16} />
          <Skeleton width="100%" height={90} borderRadius={12} />
        </div>
      ) : (
        <div className="supplier-pending-modal">
          <div className="supplier-pending-modal__head">
            <span className="name">{supplier.name}</span>
            {(supplier.first_name || supplier.last_name) && (
              <span className="contact">
                {[supplier.first_name, supplier.last_name].filter(Boolean).join(" ")}
              </span>
            )}
          </div>

          <div className="supplier-pending-modal__due">
            <span className="label">Pending / Due Amount</span>
            <span className="value">{formatAmount(supplier.due_amount ?? 0)}</span>
          </div>

          <div className="supplier-pending-modal__grid">
            <div className="cell">
              <span className="label">Total Amount</span>
              <span className="value">{formatAmount(supplier.total_purchase_amount ?? 0)}</span>
            </div>
            <div className="cell">
              <span className="label">Pending Orders</span>
              <span className="value">{supplier.pending_order_count ?? 0}</span>
            </div>
            <div className="cell">
              <span className="label">Due Date</span>
              <span className="value">{fmtDate(supplier.due_date)}</span>
            </div>
            <div className="cell">
              <span className="label">Status</span>
              <span className={`supplier-status-badge supplier-status-badge--${status}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default SupplierPendingDetailsModal;
