import React, { useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/ui/Button";
import { useStatusOverlay } from "../../../../hooks/useStatusOverlay";
import { useCurrency } from "../../../../hooks/useCurrency";

interface PayRunSettings {
  payPeriod: "weekly" | "biweekly" | "monthly";
  weekStartDay: "0" | "1" | "2" | "3" | "4" | "5" | "6";
  defaultPaymentMethod: "Bank Transfer" | "Cash" | "Check";
  autoCalculate: boolean;
}

interface PayRunSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SETTINGS: PayRunSettings = {
  payPeriod: "weekly",
  weekStartDay: "1",
  defaultPaymentMethod: "Bank Transfer",
  autoCalculate: true,
};

const PayRunSettingsModal: React.FC<PayRunSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<PayRunSettings>(DEFAULT_SETTINGS);
  const { showSuccess, overlay } = useStatusOverlay();
  const { currencyCode, currencySymbol } = useCurrency();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = () => {
    showSuccess("Pay run settings saved");
    onClose();
  };

  return (
    <Modal show={isOpen} onClose={onClose} title="Pay Run Settings">
      {overlay}
      <div className="p-1">
        <div className="row g-4">
          {/* Pay Period */}
          <div className="col-12">
            <label className="form-label fw-bold text-dark mb-2">Pay Period</label>
            <select
              name="payPeriod"
              className="pay-run-settings-modal__select form-select border rounded-3 py-2 px-3 shadow-sm"
              value={settings.payPeriod}
              onChange={handleChange}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <div className="form-text text-muted mt-1">
              How often pay runs are calculated for your staff.
            </div>
          </div>

          {/* Week Start Day */}
          <div className="col-12">
            <label className="form-label fw-bold text-dark mb-2">Week Starts On</label>
            <select
              name="weekStartDay"
              className="pay-run-settings-modal__select form-select border rounded-3 py-2 px-3 shadow-sm"
              value={settings.weekStartDay}
              onChange={handleChange}
            >
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>

          {/* Default Payment Method */}
          <div className="col-12">
            <label className="form-label fw-bold text-dark mb-2">Default Payment Method</label>
            <select
              name="defaultPaymentMethod"
              className="pay-run-settings-modal__select form-select border rounded-3 py-2 px-3 shadow-sm"
              value={settings.defaultPaymentMethod}
              onChange={handleChange}
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
            </select>
          </div>

          {/* Currency — controlled globally, not per pay run */}
          <div className="col-12">
            <label className="form-label fw-bold text-dark mb-2">Currency</label>
            <div className="pay-run-settings-modal__select form-select border rounded-3 py-2 px-3 shadow-sm bg-light text-muted">
              {currencyCode} ({currencySymbol})
            </div>
            <div className="form-text text-muted mt-1">
              Set once for the whole app in Settings → Configuration → Currency.
            </div>
          </div>

          {/* Auto Calculate */}
          <div className="col-12">
            <div
              className="pay-run-settings-modal__toggle-row d-flex align-items-center justify-content-between p-3 rounded-3 border"
            >
              <div>
                <div className="pay-run-settings-modal__toggle-label fw-bold text-dark">
                  Auto-calculate totals
                </div>
                <div className="pay-run-settings-modal__toggle-desc text-muted">
                  Automatically compute earnings, deductions, and net pay.
                </div>
              </div>
              <div className="form-check form-switch mb-0">
                <input
                  className="pay-run-settings-modal__switch-input form-check-input"
                  type="checkbox"
                  name="autoCalculate"
                  role="switch"
                  checked={settings.autoCalculate}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-5">
          <Button variant="outline" type="button" className="px-4 rounded-pill border" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="dark" type="button" className="px-5 rounded-pill fw-bold shadow" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PayRunSettingsModal;
