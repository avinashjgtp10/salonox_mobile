// Small centered confirm popup — a plain inline-style overlay/panel (not the
// Bootstrap-chrome <Modal> in this same folder) for a lightweight "are you
// sure?" step in front of a destructive action, so a misclick can't fire it
// straight away. First built for AppointmentModal/ViewBillModal's Delete
// Appointment option; reusable anywhere else that needs the same shape.
export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions (the default) — false for a
   *  neutral confirmation. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = true, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1090, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "min(380px,100%)", padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,.18)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: "10px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: "10px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer", border: "none", background: danger ? "#ef4444" : "#0f172a", color: "#fff" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
