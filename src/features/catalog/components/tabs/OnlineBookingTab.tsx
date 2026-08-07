import React from "react";
import { InfoCircle } from "react-bootstrap-icons";
import ClientSelect from "../../../clients/components/ClientSelect";
import type { OnlineBookingData } from "../../types/catalog.types.ts";

interface Props {
  data: OnlineBookingData;
  onChange: (data: OnlineBookingData) => void;
}

const MAX_ADVANCE_OPTIONS = [
  { value: "30", label: "1 month" },
  { value: "60", label: "2 months" },
  { value: "90", label: "3 months" },
  { value: "180", label: "6 months" },
];

const MIN_NOTICE_OPTIONS = [
  { value: "0", label: "No notice required" },
  { value: "1", label: "1 hour" },
  { value: "4", label: "4 hours" },
  { value: "24", label: "24 hours" },
];

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
              <ClientSelect
                value={String(data.maxAdvanceDays)}
                onChange={(val: string) => update("maxAdvanceDays", Number(val))}
                options={MAX_ADVANCE_OPTIONS}
                placeholder="Select maximum advance booking"
                searchPlaceholder="Search booking advance..."
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">Minimum notice</label>
              <ClientSelect
                value={String(data.minNoticeHours)}
                onChange={(val: string) => update("minNoticeHours", Number(val))}
                options={MIN_NOTICE_OPTIONS}
                placeholder="Select minimum notice"
                searchPlaceholder="Search minimum notice..."
              />
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
