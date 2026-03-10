import React, { useState } from "react";
import type { CommissionData, MemberCommission } from "../../types/catalog.types.ts";

interface Props {
    data: CommissionData;
    onChange: (data: CommissionData) => void;
}

const CommissionTab: React.FC<Props> = ({ data, onChange }) => {
    const [filterStaff] = useState("all");

    const updateMemberCommission = (memberId: string, type: "percentage" | "flat", value: number) => {
        onChange({
            ...data,
            memberCommissions: data.memberCommissions.map((mc: MemberCommission) =>
                mc.memberId === memberId ? { ...mc, commissionType: type, commissionValue: value } : mc
            )
        });
    };

    const filtered = data.memberCommissions.filter((mc: MemberCommission) =>
        filterStaff === "all" ? true : mc.memberId === filterStaff
    );

    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Commission</h5>
            <p className="text-muted mb-3">Set commission rates for this service per team member.</p>
            <div className="card mb-4">
                <div className="card-body">
                    <h6>Default Commission</h6>
                    <div className="row g-2 align-items-center">
                        <div className="col-auto">
                            <select className="form-select" value={data.defaultType}
                                onChange={(e) => onChange({ ...data, defaultType: e.target.value as "percentage" | "flat" })}>
                                <option value="percentage">Percentage (%)</option>
                                <option value="flat">Flat ($)</option>
                            </select>
                        </div>
                        <div className="col-auto">
                            <div className="input-group">
                                <span className="input-group-text">{data.defaultType === "percentage" ? "%" : "$"}</span>
                                <input type="number" className="form-control" min={0} value={data.defaultValue}
                                    onChange={(e) => onChange({ ...data, defaultValue: parseFloat(e.target.value) })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Per Staff Overrides</h6>
                <button className="btn btn-sm btn-outline-primary"
                    onClick={() => onChange({
                        ...data,
                        memberCommissions: data.memberCommissions.map((mc: MemberCommission) => ({
                            ...mc,
                            commissionType: data.defaultType,
                            commissionValue: data.defaultValue
                        }))
                    })}>
                    Apply Default to All
                </button>
            </div>
            <div className="commission-members-list">
                {filtered.map((mc: MemberCommission) => (
                    <div key={mc.memberId} className="d-flex align-items-center gap-3 py-2 border-bottom">
                        <div className="team-member-avatar">{mc.memberName.split(" ").map((n: string) => n[0]).join("")}</div>
                        <span className="flex-grow-1">{mc.memberName}</span>
                        <select className="form-select form-select-sm w-auto" value={mc.commissionType}
                            onChange={(e) => updateMemberCommission(mc.memberId, e.target.value as "percentage" | "flat", mc.commissionValue)}>
                            <option value="percentage">%</option>
                            <option value="flat">$</option>
                        </select>
                        <input type="number" className="form-control form-control-sm" style={{ width: 80 }} min={0} value={mc.commissionValue}
                            onChange={(e) => updateMemberCommission(mc.memberId, mc.commissionType, parseFloat(e.target.value))} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommissionTab;