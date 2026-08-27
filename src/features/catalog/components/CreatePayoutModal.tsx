import React, { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { createSupplierPaymentThunk, fetchSuppliersThunk } from "../../../middleware/inventory/inventory.thunk";
import type { PayoutMethod } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { Dropdown } from "../../../components/ui/Dropdown";

const PAYOUT_METHODS: { id: PayoutMethod; name: string }[] = [
  { id: "cash", name: "Cash" },
  { id: "upi", name: "UPI" },
  { id: "bank_transfer", name: "Bank Transfer" },
  { id: "cheque", name: "Cheque" },
  { id: "card", name: "Card" },
  { id: "other", name: "Other" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

interface CreatePayoutModalProps {
  show: boolean;
  onClose: () => void;
  /** Pre-scoped to one supplier (row menu / detail page). Omit to show the
   *  supplier picker step first (top-level "Create Payout" entry point). */
  supplierId?: string;
  onSuccess?: () => void;
}

// Payout is always a general balance payment (reduces the supplier's overall
// due_amount) — there's no per-order targeting, matching how the Payroll
// module's "record a payment" flow works on a running balance rather than a
// specific line item.
const CreatePayoutModal: React.FC<CreatePayoutModalProps> = ({
  show,
  onClose,
  supplierId,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { suppliers } = useAppSelector((state) => state.inventory);

  const [pickedSupplierId, setPickedSupplierId] = useState<string>(supplierId ?? "");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PayoutMethod>("cash");
  const [note, setNote] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const needsPicker = !supplierId;

  useEffect(() => {
    if (show) {
      setPickedSupplierId(supplierId ?? "");
      setAmount("");
      setPaymentDate(todayISO());
      setPaymentMethod("cash");
      setNote("");
      setAmountTouched(false);
      if (needsPicker && suppliers.length === 0) {
        dispatch(fetchSuppliersThunk());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, supplierId]);

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ id: s.id, name: s.name })),
    [suppliers],
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === pickedSupplierId),
    [suppliers, pickedSupplierId],
  );

  const amountNumber = Number(amount);
  const amountError = !amount.trim()
    ? "Amount is required"
    : isNaN(amountNumber) || amountNumber <= 0
      ? "Enter a valid amount"
      : "";

  const canSubmit = !!pickedSupplierId && !amountError && !!paymentDate;

  const handleSave = async () => {
    setAmountTouched(true);
    if (!pickedSupplierId || amountError) return;

    try {
      setSaving(true);
      await dispatch(
        createSupplierPaymentThunk({
          supplierId: pickedSupplierId,
          data: {
            amount: amountNumber,
            payment_date: paymentDate,
            payment_method: paymentMethod,
            note: note.trim() || undefined,
          },
        }),
      ).unwrap();
      showSuccess("Payment recorded successfully");
      onSuccess?.();
      onClose();
    } catch (err) {
      showError(typeof err === "string" ? err : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {overlay}
      <Modal
        show={show}
        onClose={onClose}
        title="Create Payout"
        footer={
          <div className="d-flex gap-2 w-100">
            <Button variant="outline-dark" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="dark"
              fullWidth
              loading={saving}
              disabled={!canSubmit || saving}
              onClick={handleSave}
            >
              Confirm Payment
            </Button>
          </div>
        }
      >
        {needsPicker && (
          <div className="mb-3">
            <label className="form-label fw-semibold mb-1">
              Supplier <span style={{ color: "red" }}>*</span>
            </label>
            <Dropdown
              placeholder="Search supplier..."
              value={pickedSupplierId}
              options={supplierOptions}
              onChange={setPickedSupplierId}
            />
            {selectedSupplier && (
              <div className="text-muted small mt-1">
                Outstanding balance: {formatAmount(selectedSupplier.due_amount ?? 0)}
              </div>
            )}
          </div>
        )}

        {!needsPicker && selectedSupplier && (
          <div className="mb-3">
            <div className="fw-semibold">{selectedSupplier.name}</div>
            <div className="text-muted small">
              Outstanding balance: {formatAmount(selectedSupplier.due_amount ?? 0)}
            </div>
          </div>
        )}

        <Input
          label="Amount"
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => setAmountTouched(true)}
          error={amountTouched ? amountError : undefined}
        />

        <div className="mb-3">
          <label className="form-label fw-semibold mb-1">Payment method</label>
          <Dropdown
            searchable={false}
            value={paymentMethod}
            options={PAYOUT_METHODS}
            onChange={(id) => setPaymentMethod(id as PayoutMethod)}
          />
        </div>

        <Input
          label="Payment date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />

        <Input
          label="Note"
          multiline
          rows={3}
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default CreatePayoutModal;
