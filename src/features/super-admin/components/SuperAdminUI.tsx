import { useState } from "react";

export function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:   { bg: "#f0fdf4", text: "#16a34a" },
    inactive: { bg: "#fef2f2", text: "#dc2626" },
  };
  const c = map[status] ?? { bg: "#f8fafc", text: "#64748b" };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{status}</span>;
}

export function ActionBtn({ label, color, bg, onClick, disabled }: { label: string; color: string; bg: string; onClick: () => void; disabled: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: `1.5px solid ${color}`, cursor: disabled ? "not-allowed" : "pointer", background: hov && !disabled ? bg : "#fff", color, transition: "all 0.15s", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}

export function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`, color: ok ? "#15803d" : "#dc2626", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
      {ok ? "✓ " : "✗ "}{msg}
    </div>
  );
}
