import React from "react";
import { InfoCircle } from "react-bootstrap-icons";
import ClientSelect from "../../../clients/components/ClientSelect";
import type { SettingsData } from "../../types/catalog.types.ts";
import { useCurrency } from "../../../../hooks/useCurrency";

interface Props {
  data: SettingsData;
  onChange: (data: SettingsData) => void;
}

const COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6", "#34495e",
];

const CANCELLATION_NOTICE_OPTIONS = [
  { value: "0", label: "No notice required" },
  { value: "1", label: "1 hour" },
  { value: "4", label: "4 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
];

const SettingsTab: React.FC<Props> = ({ data, onChange }) => {
  const { currencySymbol } = useCurrency();
  const update = (key: keyof SettingsData, value: any) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Settings</h5>

      {/* ── Cancellation Policy ── */}
      <div className="st-card">
        <div className="st-card__label">Cancellation Policy</div>

        <div className="st-field">
          <label className="st-field__label">Cancellation notice</label>
          <ClientSelect
            value={String(data.cancellationNoticeHours)}
            onChange={(val: string) => update("cancellationNoticeHours", Number(val))}
            options={CANCELLATION_NOTICE_OPTIONS}
            placeholder="Select cancellation notice"
            searchPlaceholder="Search cancellation notice..."
          />
        </div>

        <label className="st-toggle">
          <div className="st-toggle__track">
            <input
              type="checkbox"
              checked={data.chargeCancellationFee}
              onChange={(e) => update("chargeCancellationFee", e.target.checked)}
            />
            <span className="st-toggle__slider" />
          </div>
          <span className="st-toggle__label">Charge cancellation fee</span>
        </label>

        {data.chargeCancellationFee && (
          <div className="st-field st-field--indent">
            <label className="st-field__label">Fee amount</label>
            <div className="st-input-prefix-wrap">
              <span className="st-prefix">{currencySymbol}</span>
              <input
                type="number"
                className="st-input"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={data.cancellationFeeAmount || ""}
                onChange={(e) => update("cancellationFeeAmount", parseFloat(e.target.value) || 0)}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Visibility & Tax ── */}
      <div className="st-card">
        <div className="st-card__label">Visibility &amp; Tax</div>

        <label className="st-toggle">
          <div className="st-toggle__track">
            <input
              type="checkbox"
              checked={data.visibleToClients}
              onChange={(e) => update("visibleToClients", e.target.checked)}
            />
            <span className="st-toggle__slider" />
          </div>
          <span className="st-toggle__label">Visible to clients</span>
        </label>

        <label className="st-toggle">
          <div className="st-toggle__track">
            <input
              type="checkbox"
              checked={data.taxable}
              onChange={(e) => update("taxable", e.target.checked)}
            />
            <span className="st-toggle__slider" />
          </div>
          <span className="st-toggle__label">Taxable</span>
        </label>
      </div>

      {/* ── Service Color ── */}
      <div className="st-card">
        <div className="st-card__label">Service Color</div>
        <p className="st-card__desc">Select a colour to identify this service on the calendar</p>
        <div className="st-colors">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`st-color-swatch${data.colorLabel === color ? " st-color-swatch--active" : ""}`}
              style={{
                backgroundColor: color,
                boxShadow: data.colorLabel === color
                  ? `0 0 0 2px #fff, 0 0 0 4px ${color}`
                  : "none",
              }}
              onClick={() => update("colorLabel", color)}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* ── Info note ── */}
      <div className="st-info">
        <InfoCircle size={15} className="st-info__icon" />
        <p>
          Cancellation fees can be automatically charged when clients cancel
          appointments late or don't show up.{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>Manage payment settings</a>
        </p>
      </div>
    </div>
  );
};

export default SettingsTab;
