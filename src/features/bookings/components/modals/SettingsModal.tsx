import React from "react";
import Modal from "../../../../components/ui/Modal";
import "../../styles/SettingsModal.scss";

interface Props {
  onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ onClose }) => {
  return (
    <Modal show onClose={onClose} title="⚙️ Settings" size="md">
      <div className="settings-modal__brand-card">
        <div className="settings-modal__brand-icon">💇</div>
        <div>
          <div className="settings-modal__brand-name">Salon Scheduler</div>
          <div className="settings-modal__brand-version">Admin Panel — v1.0.0</div>
        </div>
      </div>
      <div className="settings-modal__features">
        <div>📅 Manage appointments, staff, and reports</div>
        <div>🎨 Color-coded appointment status</div>
        <div>📱 Drag &amp; resize appointments on calendar</div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
