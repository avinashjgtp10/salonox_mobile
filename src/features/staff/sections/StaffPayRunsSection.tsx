import React, { useState, useEffect } from "react";
import { InfoCircle } from "react-bootstrap-icons";
import "../styles/StaffPayRunsSection.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import Dropdown from "../../../components/ui/Dropdown";

interface PayRunSettings {
  pay_runs_enabled: boolean;
  payment_method: "pay_manually" | "bank_transfer";
  calculation_type: "automatic" | "manual";
  deduct_payment_processing_fees: boolean;
  deduct_new_client_fees: boolean;
  record_cash_advances: boolean;
}

interface StaffPayRunsSectionProps {
  staffId?: string;
  salonId?: string;
  payRuns?: any;
  setPayRuns?: (val: any) => void;
}

const StaffPayRunsSection: React.FC<StaffPayRunsSectionProps> = ({ staffId, salonId, payRuns, setPayRuns }) => {
  const [localSettings, setLocalSettings] = useState<PayRunSettings>({
    pay_runs_enabled: true,
    payment_method: "pay_manually",
    calculation_type: "automatic",
    deduct_payment_processing_fees: false,
    deduct_new_client_fees: false,
    record_cash_advances: false,
  });

  const settings = payRuns || localSettings;
  const setSettings = setPayRuns || setLocalSettings;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => {
    if (staffId && !payRuns && staffId !== "undefined") {
      const fetchPayRuns = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(STAFF.PAY_RUNS(staffId));
          if (response.data.data) {
            setSettings(response.data.data);
          }
        } catch (error) {
          console.error("Error fetching pay runs:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPayRuns();
    }
  }, [staffId, salonId, payRuns]);

  const handleSave = async () => {
    if (!staffId || staffId === "undefined") {
      showError("Please save the staff member profile first");
      return;
    }
    try {
      setIsSaving(true);
      await api.put(STAFF.PAY_RUNS(staffId), settings);
      showSuccess("Pay run settings saved successfully");
    } catch (error: any) {
      console.error("Error saving pay runs:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save pay run settings";
      showError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center">Loading pay run settings...</div>;

  return (
    <div className="section payruns-section mt-1">
      {overlay}
      {/* Main Toggle Header */}
      <div className="custom-switch-container">
        <div className="switch-info">
          <div className="switch-title">
            Pay runs
            {settings.pay_runs_enabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Choose how you will pay this staff member through pay runs.{" "}
            <LearnMoreLink topic="staff-payruns-settings">Learn more</LearnMoreLink>
          </div>
        </div>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={settings.pay_runs_enabled}
            onChange={(e) => setSettings({ ...settings, pay_runs_enabled: e.target.checked })}
          />
        </div>
      </div>

      {settings.pay_runs_enabled && (
        <div className="fade-in">
          {/* Preferred Payment Method */}
          <h6 className="section__block-title">Preferred payment method</h6>
          <p className="section__block-subtitle">
            Choose how you would prefer to pay your staff member when completing
            a pay run. A processing fee may apply for transfers to bank
            accounts. <LearnMoreLink topic="staff-payruns-settings">Learn more</LearnMoreLink>
          </p>

          <div className="payment-card mb-4">
            <div className="payment-card-left">
              <div className="payment-card-icon">
                <i className={`bi ${settings.payment_method === "pay_manually" ? "bi-credit-card-2-front" : "bi-bank"}`} />
              </div>
              <div className="payment-card-info">
                <div className="payment-card-title">
                  {settings.payment_method === "pay_manually"
                    ? "Pay manually"
                    : "Bank transfer"}
                </div>
                <div className="payment-card-subtitle">
                  {settings.payment_method === "pay_manually"
                    ? "Mark as paid outside of salonox"
                    : "Transfer to bank account"}
                </div>
              </div>
            </div>
            <a
              className="payment-card-action"
              onClick={() => setShowPaymentModal(true)}
            >
              Change
            </a>
          </div>

          {/* Change Payment Method Modal */}
          {showPaymentModal && (
            <div
              className="payment-modal-overlay"
              onClick={() => setShowPaymentModal(false)}
            >
              <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close X */}
                <button
                  className="payment-modal-close"
                  onClick={() => setShowPaymentModal(false)}
                >
                  &times;
                </button>

                <h5 className="payment-modal-title">Preferred payment method</h5>
                <p className="payment-modal-desc">
                  Choose how you would prefer to pay this staff member. A
                  processing fee may apply for bank transfers.
                </p>

                {/* Option: Pay manually */}
                <div
                  className={`payment-option ${settings.payment_method === "pay_manually" ? "payment-option--selected" : ""}`}
                  onClick={() => setSettings({ ...settings, payment_method: "pay_manually" })}
                >
                  <div className="payment-option-icon">
                    <i className="bi bi-credit-card-2-front" />
                  </div>
                  <div className="payment-option-info">
                    <div className="payment-option-title">Pay manually</div>
                    <div className="payment-option-subtitle">
                      Mark as paid outside of salonox
                    </div>
                  </div>
                  <div className="payment-option-radio-wrap">
                    <div
                      className={`payment-option-radio ${settings.payment_method === "pay_manually" ? "payment-option-radio--selected" : ""}`}
                    >
                      {settings.payment_method === "pay_manually" && (
                        <div className="payment-option-radio-dot" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Option: Bank transfer */}
                <div
                  className={`payment-option payment-option--last ${settings.payment_method === "bank_transfer" ? "payment-option--selected" : ""}`}
                  onClick={() => setSettings({ ...settings, payment_method: "bank_transfer" })}
                >
                  <div className="payment-option-icon">
                    <i className="bi bi-bank" />
                  </div>
                  <div className="payment-option-info">
                    <div className="payment-option-title">Bank transfer</div>
                    <div className="payment-option-subtitle">
                      Transfer to bank account. Processing fees may apply.
                    </div>
                  </div>
                  <div className="payment-option-radio-wrap">
                    <div
                      className={`payment-option-radio ${settings.payment_method === "bank_transfer" ? "payment-option-radio--selected" : ""}`}
                    >
                      {settings.payment_method === "bank_transfer" && (
                        <div className="payment-option-radio-dot" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="payment-modal-actions">
                  <button
                    className="btn payment-modal-btn payment-modal-btn--cancel"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn payment-modal-btn payment-modal-btn--save"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Calculation of Pay Runs */}
          <h6 className="section__block-title">Calculation of pay runs</h6>
          <p className="section__block-subtitle">
            Choose if the amount to pay is calculated automatically or manually
            entered at each pay period
          </p>

          <Dropdown
            className="form-select mb-2"
            searchable={false}
            value={settings.calculation_type}
            options={[
              { id: "automatic", name: "Automatic calculation" },
              { id: "manual", name: "Manual entry" },
            ]}
            onChange={(id) => setSettings({ ...settings, calculation_type: id as any })}
          />

          {settings.calculation_type === "automatic" && (
            <div className="calc-info-box mb-4">
              <InfoCircle className="calc-info-icon" />
              <div className="calc-info-content">
                <div className="calc-info-title">Automatic calculation</div>
                <div className="calc-info-desc">
                  Calculates the amount to pay based on activity from
                  timesheets, earned wages, commissions and tips as configured
                  on this staff members settings.
                </div>
              </div>
            </div>
          )}

          <div className="divider"></div>

          {/* Pay Run Deductions */}
          <h6 className="section__block-title">Pay run deductions</h6>
          <p className="section__block-subtitle">
            Choose which fees to automatically deduct from this staff member's
            earnings. <LearnMoreLink topic="staff-payruns-settings">Learn more</LearnMoreLink>
          </p>

          <div className="deduction-row">
            <input
              type="checkbox"
              id="deduct-processing"
              checked={settings.deduct_payment_processing_fees}
              onChange={(e) => setSettings({ ...settings, deduct_payment_processing_fees: e.target.checked })}
            />
            <div className="deduction-content">
              <label htmlFor="deduct-processing" className="deduction-title">
                Deduct salonox payment processing fees
              </label>
              <div className="deduction-desc">
                Deduct payment processing fees for items sold by this staff
                member.
              </div>
            </div>
          </div>

          <div className="deduction-row">
            <input
              type="checkbox"
              id="deduct-new-client"
              checked={settings.deduct_new_client_fees}
              onChange={(e) => setSettings({ ...settings, deduct_new_client_fees: e.target.checked })}
            />
            <div className="deduction-content">
              <label htmlFor="deduct-new-client" className="deduction-title">
                Deduct salonox new client fees
              </label>
              <div className="deduction-desc">
                Deduct the new client fee for any new client bookings with this
                staff member.
              </div>
            </div>
          </div>

          <div className="divider"></div>

          {/* Cash Advances */}
          <h6 className="section__block-title">Cash advances</h6>
          <p className="section__block-subtitle">
            Choose how you want to manage cash payments
          </p>

          <div className="deduction-row">
            <input
              type="checkbox"
              id="cash-advance"
              checked={settings.record_cash_advances}
              onChange={(e) => setSettings({ ...settings, record_cash_advances: e.target.checked })}
            />
            <div className="deduction-content">
              <label htmlFor="cash-advance" className="deduction-title">
                Record cash payments for sales as 'paid' in pay runs
              </label>
              <div className="deduction-desc">
                When a sale is paid in cash, record that this staff member has
                taken the full cash amount as an advance within the pay period.
              </div>
            </div>
          </div>

          <div className="divider mt-4"></div>
          
          <div className="d-flex justify-content-end mt-4">
            <button
              className="btn btn-primary px-4 py-2 save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPayRunsSection;
