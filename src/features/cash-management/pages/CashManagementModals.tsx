import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "react-bootstrap-icons";
import { Button, Input, Modal } from "../../../components/ui";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  DEFAULT_EXPENSE_TYPES,
  getCustomExpenseTypes,
  saveCustomExpenseType,
} from "../cashManagement.expenseTypes";
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
  /** True when there is no open counter for today and the counter must be
   *  started before the rest of the app can be used — hides Cancel/close and
   *  blocks dismissal so the user can't skip straight past it. */
  mandatory?: boolean;
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
  /** True when the open counter was carried over from a previous day and
   *  must be closed before a new one can be started — hides Cancel/close and
   *  blocks dismissal so the user can't skip straight past it. */
  mandatory?: boolean;
  onClose: () => void;
  onNotify: Notify;
  onSubmit: (payload: CloseCounterPayload) => Promise<void>;
}

const trimText = (value: string) => value.trim();

const getApiErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? fallback;

interface ExpenseTypeDropdownProps {
  label: string;
  value: string;
  options: string[];
  error?: string;
  onSelect: (value: string) => void;
  onAddNew: () => void;
}

function ExpenseTypeDropdown({
  label,
  value,
  options,
  error,
  onSelect,
  onAddNew,
}: ExpenseTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="cash-mgmt__type-select" ref={rootRef}>
      {label ? <label className="form-label fw-semibold ui-input__label">{label}</label> : null}
      <button
        type="button"
        className={`cash-mgmt__type-trigger ${error ? "is-invalid" : ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? "" : "cash-mgmt__type-placeholder"}>
          {value || "Select expense type"}
        </span>
        <ChevronDown size={12} />
      </button>

      {open ? (
        <div className="cash-mgmt__type-menu">
          <ul className="cash-mgmt__type-list" role="listbox">
            {options.map((option) => (
              <li
                key={option}
                role="option"
                aria-selected={option === value}
                className={`cash-mgmt__type-option ${option === value ? "is-selected" : ""}`}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
              >
                {option}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="cash-mgmt__type-add"
            onClick={() => {
              onAddNew();
              setOpen(false);
            }}
          >
            + Add Expense Type
          </button>
        </div>
      ) : null}

      {error ? <div className="text-danger mt-1 ui-input__error">{error}</div> : null}
    </div>
  );
}

export function OpenCounterModal({
  show,
  loading,
  mandatory = false,
  onClose,
  onNotify,
  onSubmit,
}: OpenCounterModalProps) {
  const [form, setForm] = useState({ opening_balance: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");

  const handleClose = () => {
    if (loading || mandatory) return;
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
      hideCloseButton={mandatory}
      footer={
        <div className="cash-mgmt__modal-footer">
          {!mandatory && (
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
          )}
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
            Start Counter
          </Button>
        </div>
      }
    >
      {mandatory ? (
        <div className="cash-mgmt__modal-message cash-mgmt__modal-message--warning">
          No cash counter is open for today. Enter the opening balance to start one before
          continuing.
        </div>
      ) : null}
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
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [addingType, setAddingType] = useState(false);
  const [newTypeValue, setNewTypeValue] = useState("");
  const [newTypeError, setNewTypeError] = useState("");

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
    setCustomTypes(getCustomExpenseTypes());
    setAddingType(false);
    setNewTypeValue("");
    setNewTypeError("");
  }, [initialValue, show]);

  const expenseTypeOptions = useMemo(() => {
    const options = [...DEFAULT_EXPENSE_TYPES, ...customTypes];
    if (initialValue?.expenseType && !options.some(
      (value) => value.toLowerCase() === initialValue.expenseType.toLowerCase(),
    )) {
      options.push(initialValue.expenseType);
    }
    return options;
  }, [customTypes, initialValue]);

  const handleExpenseTypeSelect = (value: string) => {
    updateField("expense_type", value);
  };

  const handleAddNewType = () => {
    setAddingType(true);
    setNewTypeValue("");
    setNewTypeError("");
  };

  const handleSaveNewType = () => {
    const trimmed = trimText(newTypeValue);
    if (!trimmed) {
      setNewTypeError("Enter a name for the new expense type.");
      return;
    }

    const nextTypes = saveCustomExpenseType(trimmed);
    setCustomTypes(nextTypes);
    updateField("expense_type", trimmed);
    setAddingType(false);
    setNewTypeValue("");
    setNewTypeError("");
  };

  const handleCancelNewType = () => {
    setAddingType(false);
    setNewTypeValue("");
    setNewTypeError("");
  };

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
        <div>
          <ExpenseTypeDropdown
            label="Expense Type"
            value={form.expense_type}
            options={expenseTypeOptions}
            error={errors.expense_type}
            onSelect={handleExpenseTypeSelect}
            onAddNew={handleAddNewType}
          />

          {addingType ? (
            <div className="cash-mgmt__quick-add-row">
              <input
                autoFocus
                className="cash-mgmt__field"
                placeholder="New expense type name"
                value={newTypeValue}
                onChange={(event) => setNewTypeValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSaveNewType();
                  }
                  if (event.key === "Escape") {
                    handleCancelNewType();
                  }
                }}
              />
              <Button variant="dark" size="sm" onClick={handleSaveNewType}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelNewType}>
                Cancel
              </Button>
            </div>
          ) : null}
          {newTypeError ? (
            <div className="text-danger mt-1 ui-input__error">{newTypeError}</div>
          ) : null}
        </div>
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
  mandatory = false,
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
    if (loading || mandatory) return;
    onClose();
  };

  useEffect(() => {
    if (!show) return;
    // Cash expenses can exceed cash revenue, which makes `closingBalance`
    // negative — pre-filling that straight into "In Store Cash" suggested a
    // negative amount for a field that's never allowed to be negative (see
    // validateForm below). Clamp the suggestion itself so the field never
    // opens already showing a value the form would reject.
    const suggested = dashboard.inStoreCash || dashboard.closingBalance || 0;
    setInStoreCash(String(Math.max(0, suggested)));
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
      title="Close Cash Counter"
      size="lg"
      centered={false}
      hideCloseButton={mandatory}
      footer={
        <div className="cash-mgmt__modal-footer">
          {!mandatory && (
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
          )}
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
            Yes, Close Counter
          </Button>
        </div>
      }
    >
      {mandatory ? (
        <div className="cash-mgmt__modal-message cash-mgmt__modal-message--warning">
          Previous day's cash counter is still open. Please close it first before opening today's
          counter.
        </div>
      ) : (
        <div className="cash-mgmt__modal-message cash-mgmt__modal-message--warning">
          Are you sure you want to close today's cash counter? You cannot reopen it again today.
        </div>
      )}
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
          min={0}
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
