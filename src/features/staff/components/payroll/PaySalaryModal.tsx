import { useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

interface Props {
  employeeName: string;
  totalSalary: number;
  paidAmount: number;
  pendingAmount: number;
  formatAmount: (n: number) => string;
  onConfirm: (amount: number, method: string, date: string) => Promise<void> | void;
  onClose: () => void;
}

export default function PaySalaryModal({
  employeeName, totalSalary, paidAmount, pendingAmount, formatAmount, onConfirm, onClose,
}: Props) {
  const [amountInput, setAmountInput] = useState(String(pendingAmount));
  const [method, setMethod] = useState(PAYMENT_METHODS[0].value);
  const [date, setDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const amount = Number(amountInput);
  const isValidNumber = amountInput.trim() !== "" && Number.isFinite(amount);
  const error =
    !isValidNumber ? "Please enter a valid amount"
    : amount <= 0 ? "Amount must be greater than zero"
    : amount > pendingAmount ? "Amount cannot be greater than pending salary"
    : undefined;

  const handleConfirm = async () => {
    if (error || !date) return;
    setSubmitting(true);
    try {
      await onConfirm(amount, method, date);
      setSucceeded(true);
    } catch {
      // The page-level handler already surfaced an error toast — swallow
      // here so the modal just stays open for another attempt.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onClose={onClose} title="Process Salary Payment" size="md">
      {succeeded ? (
        <div className="d-flex flex-column align-items-center gap-2 py-4">
          <div className="fw-bold text-success">Payment successful</div>
        </div>
      ) : (
        <>
          <div className="d-flex flex-column gap-3">
            <div>
              <div className="text-muted small">Employee Name</div>
              <div className="fw-bold">{employeeName}</div>
            </div>

            <div>
              <div className="text-muted small">Total Salary</div>
              <div className="fw-bold">{formatAmount(totalSalary)}</div>
            </div>

            <div>
              <div className="text-muted small">Paid Amount</div>
              <div className="fw-bold">{formatAmount(paidAmount)}</div>
            </div>

            <div>
              <div className="text-muted small">Pending Amount</div>
              <div className="fw-bold">{formatAmount(pendingAmount)}</div>
            </div>

            <Input
              label="Payment Amount"
              type="number"
              min={0}
              max={pendingAmount}
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              error={error}
              containerClass="mb-0"
              autoFocus
            />

            <div>
              <label className="form-label fw-semibold mb-1">Payment Method</label>
              <select
                className="form-select"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <Input
              label="Payment Date"
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              containerClass="mb-0"
            />
          </div>

          <div className="d-flex flex-column gap-2 w-100 mt-4">
            <Button
              variant="dark"
              fullWidth
              disabled={!!error || !date || submitting}
              loading={submitting}
              onClick={handleConfirm}
            >
              Confirm Payment
            </Button>
            <Button variant="outline-dark" fullWidth onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
