import { useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import Select from "../../../../components/ui/Select";

export type CommissionSettlementPaymentMethod = "Cash" | "UPI";

interface Props {
  staffName: string;
  totalUnpaid: number;
  formatAmount: (n: number) => string;
  onConfirm: (amount: number, paymentMethod: CommissionSettlementPaymentMethod) => Promise<void> | void;
  onClose: () => void;
}

const PAYMENT_METHODS: CommissionSettlementPaymentMethod[] = ["Cash", "UPI"];

export default function SettleCommissionModal({
  staffName, totalUnpaid, formatAmount, onConfirm, onClose,
}: Props) {
  const [amountInput, setAmountInput] = useState(String(totalUnpaid));
  const [paymentMethod, setPaymentMethod] = useState<CommissionSettlementPaymentMethod>("Cash");
  const [submitting, setSubmitting] = useState(false);

  const amount = Number(amountInput);
  const isValidNumber = amountInput.trim() !== "" && Number.isFinite(amount);
  const error =
    !isValidNumber ? "Enter a valid amount"
    : amount <= 0 ? "Amount must be greater than 0"
    : amount > totalUnpaid ? "Settlement amount cannot exceed the unpaid commission"
    : undefined;

  const remaining = isValidNumber ? Math.max(0, totalUnpaid - amount) : totalUnpaid;

  const handleConfirm = async () => {
    if (error) return;
    setSubmitting(true);
    try {
      await onConfirm(amount, paymentMethod);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onClose={onClose} title="Settle Commission" size="md">
      <div className="d-flex flex-column gap-3">
        <div>
          <div className="text-muted small">Staff Name</div>
          <div className="fw-bold">{staffName}</div>
        </div>

        <div>
          <div className="text-muted small">Total Unpaid Commission</div>
          <div className="fw-bold">{formatAmount(totalUnpaid)}</div>
        </div>

        <Input
          label="Settlement Amount"
          type="number"
          min={0}
          max={totalUnpaid}
          step="0.01"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          error={error}
          containerClass="mb-0"
          autoFocus
        />

        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as CommissionSettlementPaymentMethod)}
          disabled={submitting}
          containerClass="mb-0"
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>{method}</option>
          ))}
        </Select>

        <div>
          <div className="text-muted small">Remaining Balance</div>
          <div className="fw-bold">{formatAmount(remaining)}</div>
        </div>
      </div>

      <div className="d-flex flex-column gap-2 w-100 mt-4">
        <Button
          variant="dark"
          fullWidth
          disabled={!!error || submitting}
          loading={submitting}
          onClick={handleConfirm}
        >
          Confirm Settlement
        </Button>
        <Button variant="outline-dark" fullWidth onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
