import React from "react";
import { FileEarmarkPlus, FileEarmark, Truck, ClipboardCheck, CheckCircle, SlashCircle } from "react-bootstrap-icons";
import type { OrderStatus } from "../../../types/inventory.types";
import "../styles/OrderStatusStepper.scss";

export type OrderStepKey = "create" | OrderStatus;

// "Verify Order" is a display-only rename of the "partially_received"
// backend status — the Receiving tab (where qty/damaged gets checked and
// Confirm Receipt is clicked) is exactly this step; the underlying status
// key is unchanged, so no backend/migration work was needed for this.
const STEPS: { key: OrderStepKey; label: string; icon: React.ElementType }[] = [
  { key: "create", label: "Create Order", icon: FileEarmarkPlus },
  { key: "draft", label: "Draft", icon: FileEarmark },
  { key: "sent", label: "Ordered", icon: Truck },
  { key: "partially_received", label: "Verify Order", icon: ClipboardCheck },
  { key: "received", label: "Received", icon: CheckCircle },
  { key: "cancelled", label: "Cancelled", icon: SlashCircle },
];

// Left-to-right normal flow used only to derive "done" pills when
// showProgress is on — Cancelled is a branch off Draft/Ordered, never a step
// after Received, so it's excluded from this and handled as its own case.
const NORMAL_FLOW: OrderStepKey[] = ["create", "draft", "sent", "partially_received", "received"];

interface OrderStatusStepperProps {
  /** The step to highlight as current. */
  current: OrderStepKey;
  /** Omit to render a static (non-interactive) header, e.g. on Order Detail. */
  onStepClick?: (key: OrderStepKey) => void;
  /** Mark every step before `current` (in NORMAL_FLOW) as done/checked —
   *  used on Order Detail, where `current` reflects a real order's progress
   *  rather than just "which page am I on". */
  showProgress?: boolean;
  className?: string;
}

// Single source of truth for the Create Order → Draft → Ordered →
// Verify Order → Received (→ Cancelled) pipeline header, reused by
// NewOrderPage, OrdersListPage and OrderDetailPage instead of each hand-
// rolling their own copy of the same markup. Cancelled sits after a dashed
// connector, marking it as a branch off the normal flow rather than the
// step that follows Received.
const OrderStatusStepper: React.FC<OrderStatusStepperProps> = ({
  current,
  onStepClick,
  showProgress = false,
  className = "",
}) => {
  const currentIndex = NORMAL_FLOW.indexOf(current);
  const isCancelled = current === "cancelled";

  return (
    <ol className={`order-status-stepper ${className}`.trim()}>
      {STEPS.map(({ key, label, icon: Icon }) => {
        const isCancelStep = key === "cancelled";
        const isCurrent = current === key;
        const stepIndex = NORMAL_FLOW.indexOf(key);
        const isDone = showProgress && !isCancelStep && !isCancelled
          && stepIndex !== -1 && currentIndex !== -1 && stepIndex < currentIndex;

        const state = isCancelStep
          ? (isCurrent ? "cancelled" : "upcoming")
          : isCurrent
            ? "current"
            : isDone
              ? "done"
              : "upcoming";

        return (
          <li
            key={key}
            className={`order-status-stepper__step${isCancelStep ? " order-status-stepper__step--branch" : ""}`}
          >
            {onStepClick ? (
              <button
                type="button"
                className={`order-status-stepper__chip order-status-stepper__chip--${state}`}
                onClick={() => onStepClick(key)}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ) : (
              <span className={`order-status-stepper__chip order-status-stepper__chip--${state}`}>
                <Icon size={14} />
                <span>{label}</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default OrderStatusStepper;
