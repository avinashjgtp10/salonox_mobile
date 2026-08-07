import React, { useState } from "react";
import { InfoCircle } from "react-bootstrap-icons";
import ClientSelect from "../../../clients/components/ClientSelect";
import type {
  CommissionData,
  MemberCommission,
} from "../../types/catalog.types.ts";

interface Props {
  data: CommissionData;
  onChange: (data: CommissionData) => void;
}

const COMMISSION_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "flat", label: "Flat" },
];

const MEMBER_COMMISSION_TYPE_OPTIONS = [
  { value: "percentage", label: "%" },
  { value: "flat", label: "$" },
];

const CommissionTab: React.FC<Props> = ({ data, onChange }) => {
  const [filterStaff] = useState("all");

  const updateMemberCommission = (
    memberId: string,
    type: "percentage" | "flat",
    value: number,
  ) => {
    onChange({
      ...data,
      memberCommissions: data.memberCommissions.map((mc: MemberCommission) =>
        mc.memberId === memberId
          ? { ...mc, commissionType: type, commissionValue: value }
          : mc,
      ),
    });
  };

  const filtered = data.memberCommissions.filter((mc: MemberCommission) =>
    filterStaff === "all" ? true : mc.memberId === filterStaff,
  );

  return (
    <div className="tab-content-panel">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="tab-content-panel__title mb-0">Commission rates</h5>
        <button
          className="btn btn-link text-primary text-decoration-none fw-bold p-0 small"
          onClick={() =>
            onChange({
              ...data,
              memberCommissions: data.memberCommissions.map(
                (mc: MemberCommission) => ({
                  ...mc,
                  commissionType: data.defaultType,
                  commissionValue: data.defaultValue,
                }),
              ),
            })
          }
        >
          Apply default for all
        </button>
      </div>

      <div className="bg-light p-4 rounded-4 mb-5">
        <h6 className="fw-bold mb-3 small text-muted text-uppercase">
          Service default
        </h6>
        <div className="row g-3 align-items-end">
          <div className="col-sm-6">
            <label className="form-label small fw-medium mb-1">
              Commission type
            </label>
            <ClientSelect
              value={data.defaultType}
              onChange={(val: string) =>
                onChange({
                  ...data,
                  defaultType: val as "percentage" | "flat",
                })
              }
              options={COMMISSION_TYPE_OPTIONS}
              placeholder="Select type"
              searchPlaceholder="Search commission type..."
            />
          </div>
          <div className="col-sm-6">
            <label className="form-label small fw-medium mb-1">Value</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                {data.defaultType === "percentage" ? "%" : "$"}
              </span>
              <input
                type="number"
                className="form-control premium-input border-start-0"
                min={0}
                value={data.defaultValue}
                onChange={(e) =>
                  onChange({
                    ...data,
                    defaultValue: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>
        <p className="text-muted small mt-3 mb-0">
          This rate applies to all staff members unless a custom rate is set
          below.
        </p>
      </div>

      <h6 className="fw-bold mb-3 small text-muted text-uppercase">
        Staff overrides
      </h6>
      <div className="commission-members-list border-top">
        {filtered.map((mc: MemberCommission) => (
          <div
            key={mc.memberId}
            className="d-flex align-items-center gap-3 py-3 border-bottom"
          >
            <div
              className="avatar-circle rounded-circle d-flex align-items-center justify-content-center fw-bold text-uppercase flex-shrink-0"
              style={{
                width: "36px",
                height: "36px",
                backgroundColor: "#f3f4f6",
                color: "#4b5563",
                fontSize: "12px",
              }}
            >
              {mc.memberName
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </div>
            <span className="flex-grow-1 fw-medium text-dark">
              {mc.memberName}
            </span>

            <div className="d-flex gap-2">
              <div style={{ width: "90px" }}>
                <ClientSelect
                  value={mc.commissionType}
                  onChange={(val: string) =>
                    updateMemberCommission(
                      mc.memberId,
                      val as "percentage" | "flat",
                      mc.commissionValue,
                    )
                  }
                  options={MEMBER_COMMISSION_TYPE_OPTIONS}
                  placeholder="Select"
                  searchPlaceholder="Search..."
                />
              </div>
              <input
                type="number"
                className="form-control form-control-sm premium-input"
                style={{ width: 80 }}
                min={0}
                value={mc.commissionValue}
                onChange={(e) =>
                  updateMemberCommission(
                    mc.memberId,
                    mc.commissionType,
                    parseFloat(e.target.value),
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 p-3 rounded-4 bg-light d-flex gap-3">
        <InfoCircle className="text-primary mt-1" size={18} />
        <p className="small text-muted mb-0">
          Changes to commission rates will only apply to future appointments.
          Past appointments will keep their original rates.
        </p>
      </div>
    </div>
  );
};

export default CommissionTab;
