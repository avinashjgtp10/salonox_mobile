import React, { useState, useEffect } from "react";
import { Clipboard, Tag } from "react-bootstrap-icons";
import "../styles/StaffCommissionsSection.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";

interface CommissionSetting {
  category: "services" | "products" | "memberships" | "gift_cards" | "cancellation";
  is_enabled: boolean;
  commission_kind: "fixed_rate" | "percentage";
  default_rate: number;
  use_default_calculation: boolean;
  pass_cancellation_fee_late: boolean;
  pass_cancellation_fee_noshow: boolean;
}

interface StaffCommissionsSectionProps {
  staffId?: string;
  salonId?: string;
  commissions?: any;
  setCommissions?: (val: any) => void;
}

const StaffCommissionsSection: React.FC<StaffCommissionsSectionProps> = ({ staffId, salonId, commissions, setCommissions }) => {
  const [localSettings, setLocalSettings] = useState<Record<string, CommissionSetting>>({
    services: { category: "services", is_enabled: true, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
    products: { category: "products", is_enabled: false, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
    memberships: { category: "memberships", is_enabled: false, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
    gift_cards: { category: "gift_cards", is_enabled: true, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
    cancellation: { category: "cancellation", is_enabled: true, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
  });

  const settings = commissions || localSettings;
  const setSettings = setCommissions || setLocalSettings;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => {
    if (staffId && salonId && !commissions && staffId !== "undefined") {
      const fetchCommissions = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(STAFF.COMMISSIONS(staffId));
          const fetchedSettings: CommissionSetting[] = response.data.data;
          
          if (fetchedSettings && fetchedSettings.length > 0) {
            const newSettings = { ...settings };
            fetchedSettings.forEach((s) => {
              newSettings[s.category] = s;
            });
            setSettings(newSettings);
          }
        } catch (error) {
          console.error("Error fetching commissions:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCommissions();
    }
  }, [staffId, salonId, commissions]);

  const updateCategory = (category: string, patch: Partial<CommissionSetting>) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: { ...prev[category], ...patch },
    }));
  };

  const handleSave = async () => {
    if (!staffId || !salonId || staffId === "undefined") {
      showError("Please save the staff member profile first");
      return;
    }
    try {
      setIsSaving(true);
      const promises = Object.values(settings).map((s: any) =>
        api.put(STAFF.COMMISSIONS(staffId), s)
      );
      await Promise.all(promises);
      showSuccess("Commission settings saved successfully");
    } catch (error) {
      console.error("Error saving commissions:", error);
      showError("Failed to save commission settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center">Loading commission settings...</div>;

  return (
    <div className="section commissions-section mt-1">
      {overlay}
      {/* Services Commission */}
      <div className="custom-switch-container">
        <div className="switch-info">
          <div className="switch-title">
            Services commission
            {settings.services.is_enabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on services provided. <LearnMoreLink topic="staff-commissions">Learn more</LearnMoreLink>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={settings.services.is_enabled}
            onChange={(e) => updateCategory("services", { is_enabled: e.target.checked })}
          />
        </div>
      </div>

      {settings.services.is_enabled && (
        <div className="fade-in mb-4 pb-2">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="control-label">Default commission type</label>
              <select 
                className="form-select"
                value={settings.services.commission_kind}
                onChange={(e) => updateCategory("services", { commission_kind: e.target.value as any })}
              >
                <option value="fixed_rate">Fixed rate</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="control-label">Default rate</label>
              <div className="input-group">
                <span className="input-group-text px-3 bg-white border-end-0">
                  {settings.services.commission_kind === "percentage" ? "%" : "₹"}
                </span>
                <input
                  type="number"
                  className="form-control border-start-0 ps-0"
                  placeholder="0"
                  value={settings.services.default_rate}
                  onChange={(e) => updateCategory("services", { default_rate: Number(e.target.value) })}
                />
                <span className="input-group-text bg-white">
                  <Tag size={14} color="#6b7280" />
                </span>
              </div>
            </div>
          </div>

          <h6 className="sub-header mt-4 pt-1">
            Customize commissions by service
          </h6>
          <div className="customize-box">
            <div className="customize-info">
              <Clipboard />
              <span>2 services on default rate</span>
            </div>
            <a className="customize-btn">Edit</a>
          </div>

          <h6 className="sub-header mt-4 pt-1">Calculations</h6>
          <p className="calc-desc">
            Customize deductions for this staff member.{" "}
            <LearnMoreLink topic="staff-commissions">Learn more</LearnMoreLink>
          </p>

          <div className="custom-radio" onClick={() => updateCategory("services", { use_default_calculation: true })}>
            <div
              className={`radio-circle ${settings.services.use_default_calculation ? "active" : ""}`}
            ></div>
            <div className="radio-content">
              <div className="radio-title">Default settings</div>
              <div className="radio-subtitle">
                Use your workspace commission settings
              </div>
            </div>
          </div>

          <div className="custom-radio" onClick={() => updateCategory("services", { use_default_calculation: false })}>
            <div
              className={`radio-circle ${!settings.services.use_default_calculation ? "active" : ""}`}
            ></div>
            <div className="radio-content">
              <div className="radio-title radio-title--regular">
                Custom settings
              </div>
              <div className="radio-subtitle">
                Choose custom settings for this staff member
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="divider"></div>

      {/* Products Commission */}
      <div className="custom-switch-container mb-0">
        <div className="switch-info">
          <div className="switch-title">
            Products commission
            {settings.products.is_enabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on products sold. <LearnMoreLink topic="staff-commissions">Learn more</LearnMoreLink>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={settings.products.is_enabled}
            onChange={(e) => updateCategory("products", { is_enabled: e.target.checked })}
          />
        </div>
      </div>

      <div className="divider"></div>

      {/* Memberships Commission */}
      <div className="custom-switch-container mb-0">
        <div className="switch-info">
          <div className="switch-title">
            Memberships commission
            {settings.memberships.is_enabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on memberships sold. <LearnMoreLink topic="staff-commissions">Learn more</LearnMoreLink>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={settings.memberships.is_enabled}
            onChange={(e) => updateCategory("memberships", { is_enabled: e.target.checked })}
          />
        </div>
      </div>

      <div className="divider"></div>

      {/* Gift Cards Commission */}
      <div className="custom-switch-container mb-0">
        <div className="switch-info">
          <div className="switch-title">
            Gift cards commission
            {settings.gift_cards.is_enabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on gift cards sold. <LearnMoreLink topic="staff-commissions">Learn more</LearnMoreLink>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={settings.gift_cards.is_enabled}
            onChange={(e) => updateCategory("gift_cards", { is_enabled: e.target.checked })}
          />
        </div>
      </div>

      {settings.gift_cards.is_enabled && (
        <div className="fade-in mb-4 pb-2 mt-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="control-label">Default commission type</label>
              <select 
                className="form-select"
                value={settings.gift_cards.commission_kind}
                onChange={(e) => updateCategory("gift_cards", { commission_kind: e.target.value as any })}
              >
                <option value="fixed_rate">Fixed rate</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="control-label">Default rate</label>
              <div className="input-group">
                <span className="input-group-text px-3 bg-white border-end-0">
                  {settings.gift_cards.commission_kind === "percentage" ? "%" : "₹"}
                </span>
                <input
                  type="number"
                  className="form-control border-start-0 ps-0"
                  placeholder="0"
                  value={settings.gift_cards.default_rate}
                  onChange={(e) => updateCategory("gift_cards", { default_rate: Number(e.target.value) })}
                />
                <span className="input-group-text bg-white">
                  <Tag size={14} color="#6b7280" />
                </span>
              </div>
            </div>
          </div>

          <h6 className="sub-header mt-4 pt-1">Calculations</h6>
          <p className="calc-desc">
            Customize deductions for this staff member.{" "}
            <LearnMoreLink topic="staff-commissions">Learn more</LearnMoreLink>
          </p>

          <div
            className="custom-radio"
            onClick={() => updateCategory("gift_cards", { use_default_calculation: true })}
          >
            <div
              className={`radio-circle ${settings.gift_cards.use_default_calculation ? "active" : ""}`}
            ></div>
            <div className="radio-content">
              <div className="radio-title">Default settings</div>
              <div className="radio-subtitle">
                Use your workspace commission settings
              </div>
            </div>
          </div>

          <div
            className="custom-radio"
            onClick={() => updateCategory("gift_cards", { use_default_calculation: false })}
          >
            <div
              className={`radio-circle ${!settings.gift_cards.use_default_calculation ? "active" : ""}`}
            ></div>
            <div className="radio-content">
              <div className="radio-title radio-title--regular">
                Custom settings
              </div>
              <div className="radio-subtitle">
                Choose custom settings for this staff member
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="divider"></div>

      {/* Cancellation Commission */}
      <div className="custom-switch-container mb-0">
        <div className="switch-info">
          <div className="switch-title">
            Cancellation commission
            {settings.cancellation.is_enabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on fees for no-shows and late cancellations.{" "}
            <LearnMoreLink topic="staff-commissions">Learn more</LearnMoreLink>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={settings.cancellation.is_enabled}
            onChange={(e) => updateCategory("cancellation", { is_enabled: e.target.checked })}
          />
        </div>
      </div>

      {settings.cancellation.is_enabled && (
        <div className="fade-in mb-4 pb-2 mt-3">
          {/* Late Cancellations */}
          <div className="d-flex align-items-flex-start gap-3 mb-3">
            <input
              type="checkbox"
              id="late-cancel"
              className="cancellation-checkbox"
              checked={settings.cancellation.pass_cancellation_fee_late}
              onChange={(e) => updateCategory("cancellation", { pass_cancellation_fee_late: e.target.checked })}
            />
            <div>
              <label htmlFor="late-cancel" className="cancellation-label">
                Pass on the cancellation fee for late cancellations
              </label>
              <span className="cancellation-hint">
                When the client cancels late, the staff member earns a portion of
                the cancellation fee
              </span>
            </div>
          </div>

          {/* No Shows */}
          <div className="d-flex align-items-flex-start gap-3">
            <input
              type="checkbox"
              id="no-show"
              className="cancellation-checkbox"
              checked={settings.cancellation.pass_cancellation_fee_noshow}
              onChange={(e) => updateCategory("cancellation", { pass_cancellation_fee_noshow: e.target.checked })}
            />
            <div>
              <label htmlFor="no-show" className="cancellation-label">
                Pass on the cancellation fee for no-shows
              </label>
              <span className="cancellation-hint">
                When the client is a no-show, the staff member earns a portion of
                the fee
              </span>
            </div>
          </div>
        </div>
      )}

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
  );
};

export default StaffCommissionsSection;
