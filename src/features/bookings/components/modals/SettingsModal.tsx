import React, { useState } from "react";
// We'll adjust this import path if needed based on where AuthContext actually lives
import { useAuthContext } from "../../context/AuthContext";

interface Props { onClose: () => void; }

const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const { changePin } = useAuthContext();

  const [tab,       setTab]       = useState<"general" | "security">("general");
  const [oldPin,    setOldPin]    = useState("");
  const [newPin,    setNewPin]    = useState("");
  const [confirmPin,setConfirmPin]= useState("");
  const [pinMsg,    setPinMsg]    = useState<{ text: string; ok: boolean } | null>(null);
  const [shake,     setShake]     = useState(false);

  function handleChangePin() {
    setPinMsg(null);
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinMsg({ text: "PIN must be exactly 4 digits.", ok: false });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ text: "New PINs do not match.", ok: false });
      setShake(true); setTimeout(() => setShake(false), 500);
      return;
    }
    const success = changePin(oldPin, newPin);
    if (success) {
      setPinMsg({ text: "✅ PIN changed successfully!", ok: true });
      setOldPin(""); setNewPin(""); setConfirmPin("");
    } else {
      setPinMsg({ text: "❌ Current PIN is incorrect.", ok: false });
      setShake(true); setTimeout(() => setShake(false), 500);
      setOldPin("");
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "min(500px,95vw)", boxShadow: "0 8px 40px rgba(0,0,0,.2)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Settings</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#6b7280" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
          {(["general", "security"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "12px 16px", border: "none", background: "none",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              fontFamily: "inherit", textTransform: "capitalize",
              color: tab === t ? "#1f2937" : "#9ca3af",
              borderBottom: tab === t ? "2px solid #1f2937" : "2px solid transparent",
              marginBottom: -1,
            }}>
              {t === "general" ? "🏠 General" : "🔒 Security"}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>

          {/* General tab */}
          {tab === "general" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px", background: "#f9fafb", borderRadius: 10, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1f2937", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💇</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Salon Scheduler</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Admin Panel — v1.0.0</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.8 }}>
                <div>📅 Manage appointments, staff, and reports</div>
                <div>🔒 Download reports protected by Admin PIN</div>
                <div>🎨 Color-coded appointment status</div>
                <div>📱 Drag & resize appointments on calendar</div>
              </div>
            </div>
          )}

          {/* Security tab */}
          {tab === "security" && (
            <div style={{ animation: shake ? "shake .4s" : "none" }}>

              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#92400e" }}>
                ⚠️ Your download PIN protects sensitive business data. Keep it confidential.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                  Current PIN
                </label>
                <input
                  type="password" maxLength={4}
                  value={oldPin}
                  onChange={e => setOldPin(e.target.value.replace(/\D/g,"").slice(0,4))}
                  placeholder="Enter current PIN"
                  className="form-input"
                  style={{ letterSpacing: 6, fontSize: 18, textAlign: "center" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                  New PIN <span style={{ color: "#9ca3af", fontWeight: 400 }}>(4 digits)</span>
                </label>
                <input
                  type="password" maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))}
                  placeholder="Enter new PIN"
                  className="form-input"
                  style={{ letterSpacing: 6, fontSize: 18, textAlign: "center" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                  Confirm New PIN
                </label>
                <input
                  type="password" maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g,"").slice(0,4))}
                  placeholder="Repeat new PIN"
                  className="form-input"
                  style={{ letterSpacing: 6, fontSize: 18, textAlign: "center" }}
                  onKeyDown={e => e.key === "Enter" && handleChangePin()}
                />
              </div>

              {pinMsg && (
                <div style={{
                  fontSize: 13, fontWeight: 600, textAlign: "center",
                  color: pinMsg.ok ? "#22c55e" : "#ef4444",
                  background: pinMsg.ok ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${pinMsg.ok ? "#bbf7d0" : "#fecaca"}`,
                  borderRadius: 6, padding: "8px 12px", marginBottom: 16,
                }}>
                  {pinMsg.text}
                </div>
              )}

              <button
                onClick={handleChangePin}
                style={{ width: "100%", padding: "11px 0", background: "#1f2937", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                🔐 Update PIN
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;
