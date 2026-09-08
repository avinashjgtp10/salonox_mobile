// Small centered popup with a single OK button — same visual shape as
// ConfirmDialog in this folder, but for messages that just need
// acknowledging (no confirm/cancel choice).
export interface AlertDialogProps {
  title: string;
  message: string;
  okLabel?: string;
  onOk: () => void;
}

export default function AlertDialog({
  title, message, okLabel = "OK", onOk,
}: AlertDialogProps) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1090, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onOk(); }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "min(380px,100%)", padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,.18)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <button
          onClick={onOk}
          style={{ width: "100%", padding: "10px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer", border: "none", background: "#0f172a", color: "#fff" }}
        >
          {okLabel}
        </button>
      </div>
    </div>
  );
}
