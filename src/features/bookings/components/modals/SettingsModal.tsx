import React from "react";
import Modal from "../../../../components/ui/Modal";

interface Props { onClose: () => void; }

const SettingsModal: React.FC<Props> = ({ onClose }) => {
  return (
    <Modal show onClose={onClose} title="⚙️ Settings" size="md">
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: "#f9fafb", borderRadius: 10, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1f2937", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💇</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Salon Scheduler</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Admin Panel — v1.0.0</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.8 }}>
        <div>📅 Manage appointments, staff, and reports</div>
        <div>🎨 Color-coded appointment status</div>
        <div>📱 Drag &amp; resize appointments on calendar</div>
      </div>
    </Modal>
  );
};

export default SettingsModal;