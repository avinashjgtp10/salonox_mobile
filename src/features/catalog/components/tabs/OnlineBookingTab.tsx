import React from "react";
import { ChevronDown, InfoCircle } from "react-bootstrap-icons";
import type { OnlineBookingData } from "../../types/catalog.types.ts";

interface Props {
  data: OnlineBookingData;
  onChange: (data: OnlineBookingData) => void;
}

const OnlineBookingTab: React.FC<Props> = ({ data, onChange }) => {
  const update = (key: keyof OnlineBookingData, value: any) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Online booking</h5>

      <div className="mb-4">
        <div className="form-check form-switch d-flex align-items-center gap-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="onlineBookingEnabled"
            checked={data.enabled}
            onChange={(e) => update("enabled", e.target.checked)}
          />
          <label
            className="form-check-label fw-bold"
            htmlFor="onlineBookingEnabled"
          >
            Enable online booking
          </label>
        </div>
      </div>

      {data.enabled && (
        <div className="form-section mt-4">
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label fw-bold mb-0">
                Online description{" "}
                <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <span className="text-muted small">0/1000</span>
            </div>
            <textarea
              className="form-control premium-input"
              rows={3}
              value={data.onlineDescription}
              placeholder="Add a short description"
              onChange={(e) => update("onlineDescription", e.target.value)}
            />
          </div>

          <div className="row g-4">
            <div className="col-md-6">
              <label className="form-label fw-bold">
                Maximum advance booking
              </label>
              <div className="custom-select-wrapper">
                <select
                  className="form-select"
                  value={data.maxAdvanceDays}
                  onChange={(e) =>
                    update("maxAdvanceDays", Number(e.target.value))
                  }
                >
                  <option value={30}>1 month</option>
                  <option value={60}>2 months</option>
                  <option value={90}>3 months</option>
                  <option value={180}>6 months</option>
                </select>
                <ChevronDown className="select-icon" />
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">Minimum notice</label>
              <div className="custom-select-wrapper">
                <select
                  className="form-select"
                  value={data.minNoticeHours}
                  onChange={(e) =>
                    update("minNoticeHours", Number(e.target.value))
                  }
                >
                  <option value={0}>No notice required</option>
                  <option value={1}>1 hour</option>
                  <option value={4}>4 hours</option>
                  <option value={24}>24 hours</option>
                </select>
                <ChevronDown className="select-icon" />
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-4 bg-light d-flex gap-3">
            <InfoCircle className="text-primary mt-1" size={18} />
            <div>
              <p className="small mb-0 text-dark fw-medium">
                Advance booking and notice periods
              </p>
              <p className="small text-muted mb-0">
                Control when clients can start and end booking appointments
                online.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineBookingTab;
