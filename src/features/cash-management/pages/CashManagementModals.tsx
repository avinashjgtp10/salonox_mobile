import { useEffect, useState } from "react";
import { Button, Input, Modal } from "../../../components/ui";
import { useCurrency } from "../../../hooks/useCurrency";
import type {
  CashDashboardSummary,
  CashExpenseRecord,
  CloseCounterPayload,
  OpenCounterPayload,
} from "../cashManagement.types";
import type { CashManagementNotificationTone } from "./CashManagementNotificationBanner";

type Notify = (tone: CashManagementNotificationTone, message: string) => void;
type FieldErrors = Record<string, string>;

interface OpenCounterModalProps {
  show: boolean;
  loading: boolean;
  onClose: () => void;
  onNotify: Notify;
  onSubmit: (payload: OpenCounterPayload) => Promise<void>;
}

interface ExpenseModalProps {
  show: boolean;
  loading: boolean;
  counterId: string;
  initialValue?: CashExpenseRecord | null;
  onClose: () => void;
  onNotify: Notify;
  onCreate: (payload: {
    cash_management_id: string;
    expense_type: string;
    description: string;
    amount: number;
    expense_date: string;
  }) => Promise<void>;
  onUpdate: (payload: {
    id: string;
    cash_management_id: string;
    expense_type: string;
    description: string;
    amount: number;
    expense_date: string;
  }) => Promise<void>;
}

interface DeleteExpenseModalProps {
  show: boolean;
  expense: CashExpenseRecord | null;
  loading: boolean;
  onClose: () => void;
  onNotify: Notify;
  onConfirm: (id: string) => Promise<void>;
}

interface CloseCounterModalProps {
  show: boolean;
  dashboard: CashDashboardSummary;
  loading: boolean;
  onClose: () => void;
  onNotify: Notify;
  onSubmit: (payload: CloseCounterPayload) => Promise<void>;
}

const trimText = (value: string) => value.trim();

const getApiErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? fallback;

export function OpenCounterModal({
  show,
  loading,
  onClose,
  onNotify,
  onSubmit,
}: OpenCounterModalProps) {
  const [form, setForm] = useState({ opening_balance: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  useEffect(() => {
    setForm({ opening_balance: "" });
    setErrors({});
    setSubmitError("");
  }, [show]);

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!trimText(form.opening_balance)) {
      nextErrors.opening_balance = "Opening Balance is required.";
    } else if (Number(form.opening_balance) <= 0) {
      nextErrors.opening_balance = "Opening Balance must be greater than 0.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateOpeningBalance = (value: string) => {
    setForm({ opening_balance: value });
    setErrors((current) => {
      if (!current.opening_balance) return current;
      const next = { ...current };
      delete next.opening_balance;
      return next;
    });
    setSubmitError("");
  };

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title="Open Counter"
      footer={
        <div className="cash-mgmt__modal-footer">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="dark"
            loading={loading}
            disabled={loading}
            onClick={async () => {
              setSubmitError("");
              if (!validateForm()) return;

              try {
                await onSubmit({
                  opening_balance: Number(form.opening_balance || 0),
                });
              } catch (err: any) {
                const message = getApiErrorMessage(err, "Failed to open counter.");
                setSubmitError(message);
                onNotify("error", message);
              }
            }}
          >
            Open Counter
          </Button>
        </div>
      }
    >
      {submitError ? (
        <div className="cash-mgmt__modal-message cash-mgmt__modal-message--error">
          {submitError}
        </div>
      ) : null}
      <div className="cash-mgmt__modal-form">
        <Input
          label="Opening Balance"
          type="number"
          value={form.opening_balance}
          error={errors.opening_balance}
          onChange={(event) => updateOpeningBalance(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export function ExpenseModal({
  show,
  loading,
  counterId,
  initialValue,
  onClose,
  onNotify,
  onCreate,
  onUpdate,
}: ExpenseModalProps) {
  const [form, setForm] = useState({
    expense_type: "",
    description: "",
    amount: "",
    expense_date: new Date().toLocaleDateString("en-CA"),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  useEffect(() => {
    if (initialValue) {
      setForm({
        expense_type: initialValue.expenseType,
        description: initialValue.description,
        amount: String(initialValue.amount),
        expense_date: initialValue.expenseDate
          ? initialValue.expenseDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      });
    } else {
      setForm({
        expense_type: "",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().slice(0, 10),
      });
    }

    setErrors({});
    setSubmitError("");
  }, [initialValue, show]);

  const title = initialValue ? "Edit Expense" : "Add Expense";

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!counterId) {
      nextErrors.counter = "Counter ID is required before submitting.";
    }
    if (!trimText(form.expense_type)) {
      nextErrors.expense_type = "Expense Type is required.";
    }
    if (!trimText(form.description)) {
      nextErrors.description = "Description is required.";
    }
    if (!trimText(form.amount)) {
      nextErrors.amount = "Amount is required.";
    } else if (Number(form.amount) <= 0) {
      nextErrors.amount = "Amount must be greater than 0.";
    }
    if (!trimText(form.expense_date)) {
      nextErrors.expense_date = "Expense Date is required.";
    }

    setErrors(nextErrors);
    if (nextErrors.counter) {
      setSubmitError(nextErrors.counter);
    }
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field] && !(field === "expense_type" || field === "description" || field === "amount" || field === "expense_date")) {
        return current;
      }

      const next = { ...current };
      if (field in next) {
        delete next[field];
      }
      return next;
    });
    setSubmitError("");
  };

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title={title}
      footer={
        <div className="cash-mgmt__modal-footer">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="dark"
            loading={loading}
            disabled={loading}
            onClick={async () => {
              setSubmitError("");
              if (!validateForm()) return;

              const payload = {
                cash_management_id: counterId,
                expense_type: trimText(form.expense_type),
                description: trimText(form.description),
                amount: Number(form.amount || 0),
                expense_date: trimText(form.expense_date),
              };

              try {
                if (initialValue) {
                  await onUpdate({ id: initialValue.id, ...payload });
                } else {
                  await onCreate(payload);
                }
              } catch (err: any) {
                const message = getApiErrorMessage(err, "Failed to save expense.");
                setSubmitError(message);
                onNotify("error", message);
              }
            }}
          >
            {initialValue ? "Update Expense" : "Save Expense"}
          </Button>
        </div>
      }
    >
      {submitError ? (
        <div className="cash-mgmt__modal-message cash-mgmt__modal-message--error">
          {submitError}
        </div>
      ) : null}
      <div className="cash-mgmt__modal-form">
        <Input
          label="Expense Type"
          value={form.expense_type}
          error={errors.expense_type}
          onChange={(event) => updateField("expense_type", event.target.value)}
        />
        <Input
          label="Description"
          multiline
          rows={4}
          value={form.description}
          error={errors.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
        <Input
          label="Amount"
          type="number"
          value={form.amount}
          error={errors.amount}
          onChange={(event) => updateField("amount", event.target.value)}
        />
        <Input
          label="Expense Date"
          type="date"
          value={form.expense_date}
          error={errors.expense_date}
          onChange={(event) => updateField("expense_date", event.target.value)}
        />
      </div>
    </Modal>
  );
}

export function DeleteExpenseModal({
  show,
  expense,
  loading,
  onClose,
  onNotify,
  onConfirm,
}: DeleteExpenseModalProps) {
  const [submitError, setSubmitError] = useState("");

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  useEffect(() => {
    if (!show) return;
    setSubmitError("");
  }, [show, expense?.id]);

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title="Delete Expense"
      footer={
        <div className="cash-mgmt__modal-footer">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={loading}
            onClick={async () => {
              setSubmitError("");
              if (!expense?.id) {
                const message = "A valid Expense ID is required.";
                setSubmitError(message);
                onNotify("error", message);
                return;
              }

              try {
                await onConfirm(expense.id);
              } catch (err: any) {
                const message = getApiErrorMessage(err, "Failed to delete expense.");
                setSubmitError(message);
                onNotify("error", message);
              }
            }}
          >
            Delete
          </Button>
        </div>
      }
    >
      {submitError ? (
        <div className="cash-mgmt__modal-message cash-mgmt__modal-message--error">
          {submitError}
        </div>
      ) : null}
      <p className="cash-mgmt__confirm-copy">
        Delete <strong>{expense?.expenseType ?? "this expense"}</strong>? This action cannot be undone.
      </p>
    </Modal>
  );
}

export function CloseCounterModal({
  show,
  dashboard,
  loading,
  onClose,
  onNotify,
  onSubmit,
}: CloseCounterModalProps) {
  const { formatAmount } = useCurrency();
  const [inStoreCash, setInStoreCash] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  useEffect(() => {
    if (!show) return;
    setInStoreCash(String(dashboard.inStoreCash || dashboard.closingBalance || 0));
    setRemarks(dashboard.remarks ?? "");
    setErrors({});
    setSubmitError("");
  }, [dashboard, show]);

  const difference = Number(inStoreCash || 0) - dashboard.closingBalance;

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!dashboard.cashManagementId) {
      nextErrors.cash_management_id = "Cash Management ID is required.";
    }
    if (!trimText(inStoreCash)) {
      nextErrors.in_store_cash = "In Store Cash is required.";
    } else if (Number(inStoreCash) < 0) {
      nextErrors.in_store_cash = "In Store Cash cannot be negative.";
    }

    setErrors(nextErrors);
    if (nextErrors.cash_management_id) {
      setSubmitError(nextErrors.cash_management_id);
    }
    return Object.keys(nextErrors).length === 0;
  };

  const updateInStoreCash = (value: string) => {
    setInStoreCash(value);
    setErrors((current) => {
      if (!current.in_store_cash) return current;
      const next = { ...current };
      delete next.in_store_cash;
      return next;
    });
    setSubmitError("");
  };

  const updateRemarks = (value: string) => {
    setRemarks(value);
    setSubmitError("");
  };

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title="Close Counter"
      size="lg"
      centered={false}
      footer={
        <div className="cash-mgmt__modal-footer">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="dark"
            loading={loading}
            disabled={loading}
            onClick={async () => {
              setSubmitError("");
              if (!validateForm()) return;

              try {
                await onSubmit({
                  cash_management_id: dashboard.cashManagementId,
                  in_store_cash: Number(inStoreCash || 0),
                  remarks: trimText(remarks),
                });
              } catch (err: any) {
                const message = getApiErrorMessage(err, "Failed to close counter.");
                setSubmitError(message);
                onNotify("error", message);
              }
            }}
          >
            Close Counter
          </Button>
        </div>
      }
    >
      {submitError ? (
        <div className="cash-mgmt__modal-message cash-mgmt__modal-message--error">
          {submitError}
        </div>
      ) : null}
      <div className="cash-mgmt__modal-form">
        <div className="cash-mgmt__close-grid">
          <div className="cash-mgmt__close-card">
            <span>Opening Balance</span>
            <strong>{formatAmount(dashboard.openingBalance)}</strong>
          </div>
          <div className="cash-mgmt__close-card">
            <span>Cash Revenue</span>
            <strong>{formatAmount(dashboard.cashRevenue)}</strong>
          </div>
          <div className="cash-mgmt__close-card">
            <span>Cash Expense</span>
            <strong>{formatAmount(dashboard.cashExpense)}</strong>
          </div>
          <div className="cash-mgmt__close-card">
            <span>Expected Closing Balance</span>
            <strong>{formatAmount(dashboard.closingBalance)}</strong>
          </div>
          <div className="cash-mgmt__close-card">
            <span>In Store Cash</span>
            <strong>{formatAmount(Number(inStoreCash || 0))}</strong>
          </div>
          <div className="cash-mgmt__close-card">
            <span>Difference</span>
            <strong className={difference >= 0 ? "cash-mgmt__amount-positive" : "cash-mgmt__amount-negative"}>
              {formatAmount(difference)}
            </strong>
          </div>
        </div>
        <Input
          label="In Store Cash"
          type="number"
          value={inStoreCash}
          error={errors.in_store_cash}
          onChange={(event) => updateInStoreCash(event.target.value)}
        />
        <Input
          label="Remarks"
          multiline
          rows={3}
          value={remarks}
          onChange={(event) => updateRemarks(event.target.value)}
        />
      </div>
    </Modal>
  );
}
