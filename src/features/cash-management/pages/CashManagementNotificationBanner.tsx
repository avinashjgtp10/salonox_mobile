import {
  CheckCircleFill,
  ExclamationTriangleFill,
  XCircleFill,
} from "react-bootstrap-icons";

export type CashManagementNotificationTone = "success" | "error" | "warning";

interface Props {
  tone: CashManagementNotificationTone;
  message: string;
}

const icons = {
  success: <CheckCircleFill size={16} />,
  error: <XCircleFill size={16} />,
  warning: <ExclamationTriangleFill size={16} />,
};

export default function CashManagementNotificationBanner({ tone, message }: Props) {
  return (
    <div
      className={`cash-mgmt__notification cash-mgmt__notification--${tone}`}
      role="status"
      aria-live="polite"
    >
      <span className="cash-mgmt__notification-icon">{icons[tone]}</span>
      <span>{message}</span>
    </div>
  );
}
