import React, { useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";

interface Props { onClose: () => void; }

const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const { changePin } = useAuthContext();

  const [tab,        setTab]        = useState<"general" | "security">("general");
  const [oldPin,     setOldPin]     = useState("");
  const [newPin,     setNewPin]     = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg,     setPinMsg]     = useState<{ text: string; ok: boolean } | null>(null);
  const [shake,      setShake]      = useState(false);

  function handleChangePin() {
    setPinMsg(null);
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinMsg({ text: "PIN must be exactly 4 digits.", ok: false }); return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ text: "New PINs do not match.", ok: false });
      setShake(true); setTimeout(() => setShake(false), 500); return;
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
    <Modal show onClose={onClose} title="⚙️ Settings" size="md">
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", margin: "-12px -24px 20px" }}>
        {(["general", "security"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "12px 20px", border: "none", background: "none",
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            fontFamily: "inherit", textTransform: "capitalize",
            color: tab === t ? "#1f2937" : "#9ca3af",
            borderBottom: tab === t ? "2px solid #1f2937" : "2px solid transparent",
          }}>
            {t === "general" ? "🏠 General" : "🔒 Security"}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: "#f9fafb", borderRadius: 10, marginBottom: 16 }}>
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

      {tab === "security" && (
        <div style={{ animation: shake ? "shake .4s" : "none" }}>
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#92400e" }}>
            ⚠️ Your download PIN protects sensitive business data. Keep it confidential.
          </div>

          <Input
            label="Current PIN"
            type="password"
            maxLength={4}
            value={oldPin}
            onChange={e => setOldPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Enter current PIN"
            className="form-control text-center"
            style={{ letterSpacing: 6, fontSize: 18 }}
            containerClass="mb-3"
          />

          <Input
            label="New PIN (4 digits)"
            type="password"
            maxLength={4}
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Enter new PIN"
            className="form-control text-center"
            style={{ letterSpacing: 6, fontSize: 18 }}
            containerClass="mb-3"
          />

          <Input
            label="Confirm New PIN"
            type="password"
            maxLength={4}
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Repeat new PIN"
            className="form-control text-center"
            style={{ letterSpacing: 6, fontSize: 18 }}
            containerClass="mb-4"
            onKeyDown={e => e.key === "Enter" && handleChangePin()}
          />

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

          <Button variant="dark" fullWidth onClick={handleChangePin}>
            🔐 Update PIN
          </Button>
        </div>
      )}
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </Modal>
  );
};

export default SettingsModal;