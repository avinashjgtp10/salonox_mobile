interface Props {
  visible: boolean;
  message?: string;
  className?: string;
}

/**
 * Shows a small spinner + label while the auto-navigation delay is running.
 * Renders nothing when `visible` is false.
 */
export default function AutoNavigateIndicator({
  visible,
  message = "Continuing...",
  className = "",
}: Props) {
  if (!visible) return null;
  return (
    <div
      className={`d-flex align-items-center mt-4 text-muted ${className}`}
      style={{ fontSize: "13px" }}
    >
      <span
        className="spinner-border spinner-border-sm me-2"
        style={{ width: "14px", height: "14px" }}
      />
      {message}
    </div>
  );
}
