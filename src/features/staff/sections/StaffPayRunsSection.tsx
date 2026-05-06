import React, { useState, useEffect } from "react";
import { InfoCircle } from "react-bootstrap-icons";
import "../styles/StaffPayRunsSection.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { toast } from "react-hot-toast";

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

  useEffect(() => {
    if (staffId && salonId && !payRuns && staffId !== "undefined") {
      const fetchPayRuns = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(STAFF.PAY_RUNS(staffId), {
            headers: { "x-salon-id": salonId },
          });
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
    if (!staffId || !salonId || staffId === "undefined") {
      toast("Please save the team member profile first");
      return;
    }
    try {
      setIsSaving(true);
      await api.put(STAFF.PAY_RUNS(staffId), settings, {
        headers: { "x-salon-id": salonId },
      });
      toast.success("Pay run settings saved successfully");
    } catch (error) {
      console.error("Error saving pay runs:", error);
      toast.error("Failed to save pay run settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center">Loading pay run settings...</div>;

  return (
    <div className="section payruns-section mt-1">
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
            Choose how you will pay this team member through pay runs.{" "}
            <a href="#">Learn more</a>
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
            Choose how you would prefer to pay your team member when completing
            a pay run. A processing fee may apply for transfers to bank
            accounts. <a href="#">Learn more</a>
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
              style={{ cursor: "pointer" }}
            >
              Change
            </a>
          </div>

          {/* Change Payment Method Modal */}
          {showPaymentModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
              }}
              onClick={() => setShowPaymentModal(false)}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "28px",
                  width: "420px",
                  position: "relative",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close X */}
                <button
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    color: "#6b7280",
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  &times;
                </button>

                <h5
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  Preferred payment method
                </h5>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    marginBottom: "20px",
                    lineHeight: 1.5,
                  }}
                >
                  Choose how you would prefer to pay this team member. A
                  processing fee may apply for bank transfers.
                </p>

                {/* Option: Pay manually */}
                <div
                  onClick={() => setSettings({ ...settings, payment_method: "pay_manually" })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    border: `2px solid ${settings.payment_method === "pay_manually" ? "#6c3ce1" : "#e5e7eb"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    marginBottom: "12px",
                    background: settings.payment_method === "pay_manually" ? "#f5f3ff" : "#fff",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bi bi-credit-card-2-front"
                      style={{ fontSize: 18, color: "#6b7280" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#111827",
                      }}
                    >
                      Pay manually
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Mark as paid outside of salonox
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: `2px solid ${settings.payment_method === "pay_manually" ? "#6c3ce1" : "#d1d5db"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          settings.payment_method === "pay_manually"
                            ? "#6c3ce1"
                            : "transparent",
                      }}
                    >
                      {settings.payment_method === "pay_manually" && (
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#fff",
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Option: Bank transfer */}
                <div
                  onClick={() => setSettings({ ...settings, payment_method: "bank_transfer" })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    border: `2px solid ${settings.payment_method === "bank_transfer" ? "#6c3ce1" : "#e5e7eb"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    marginBottom: "24px",
                    background: settings.payment_method === "bank_transfer" ? "#f5f3ff" : "#fff",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bi bi-bank"
                      style={{ fontSize: 18, color: "#6b7280" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#111827",
                      }}
                    >
                      Bank transfer
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Transfer to bank account. Processing fees may apply.
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: `2px solid ${settings.payment_method === "bank_transfer" ? "#6c3ce1" : "#d1d5db"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          settings.payment_method === "bank_transfer" ? "#6c3ce1" : "transparent",
                      }}
                    >
                      {settings.payment_method === "bank_transfer" && (
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#fff",
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn"
                    style={{
                      borderRadius: "20px",
                      border: "1px solid #e5e7eb",
                      padding: "8px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    style={{
                      borderRadius: "20px",
                      background: "#111827",
                      color: "#fff",
                      padding: "8px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      border: "none",
                    }}
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

          <select
            className="form-select mb-2"
            value={settings.calculation_type}
            onChange={(e) => setSettings({ ...settings, calculation_type: e.target.value as any })}
          >
            <option value="automatic">Automatic calculation</option>
            <option value="manual">Manual entry</option>
          </select>

          {settings.calculation_type === "automatic" && (
            <div className="calc-info-box mb-4">
              <InfoCircle
                style={{
                  color: "#6c3ce1",
                  fontSize: 16,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <div className="calc-info-content">
                <div className="calc-info-title">Automatic calculation</div>
                <div className="calc-info-desc">
                  Calculates the amount to pay based on activity from
                  timesheets, earned wages, commissions and tips as configured
                  on this team members settings.
                </div>
              </div>
            </div>
          )}

          <div className="divider"></div>

          {/* Pay Run Deductions */}
          <h6 className="section__block-title">Pay run deductions</h6>
          <p className="section__block-subtitle">
            Choose which fees to automatically deduct from this team member's
            earnings. <a href="#">Learn more</a>
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
                Deduct payment processing fees for items sold by this team
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
                team member.
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
                When a sale is paid in cash, record that this team member has
                taken the full cash amount as an advance within the pay period.
              </div>
            </div>
          </div>

          <div className="divider mt-4"></div>
          
          <div className="d-flex justify-content-end mt-4">
            <button 
              className="btn btn-primary px-4 py-2" 
              onClick={handleSave}
              disabled={isSaving}
              style={{
                backgroundColor: "#6c3ce1",
                borderColor: "#6c3ce1",
                borderRadius: "8px",
                fontWeight: 500
              }}
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
