import React from "react";
import type { TeamMembersData, TeamMember } from "../../types/catalog.types.ts";

interface Props {
    data: TeamMembersData;
    onChange: (data: TeamMembersData) => void;
}

const TeamMembersTab: React.FC<Props> = ({ data, onChange }) => {
    const toggleMember = (memberId: string) => {
        const selected = data.selectedMemberIds.includes(memberId)
            ? data.selectedMemberIds.filter((id: string) => id !== memberId)
            : [...data.selectedMemberIds, memberId];
        onChange({ ...data, selectedMemberIds: selected });
    };

    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Team Members</h5>
            <p className="text-muted mb-3">Select which team members can perform this service.</p>
            <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" id="allMembersSwitch"
                    checked={data.allMembers} onChange={(e) => onChange({ ...data, allMembers: e.target.checked })} />
                <label className="form-check-label" htmlFor="allMembersSwitch">All team members</label>
            </div>
            {!data.allMembers && (
                <div className="team-members-list">
                    {data.availableMembers.length === 0 ? <p className="text-muted">No team members found.</p> : (
                        data.availableMembers.map((member: TeamMember) => (
                            <div key={member.id} className="team-member-item">
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id={`member-${member.id}`}
                                        checked={data.selectedMemberIds.includes(member.id)} onChange={() => toggleMember(member.id)} />
                                    <label className="form-check-label d-flex align-items-center gap-2" htmlFor={`member-${member.id}`}>
                                        <div className="team-member-avatar">{member.firstName[0]}{member.lastName[0]}</div>
                                        {member.firstName} {member.lastName}
                                        <span className="text-muted small">{member.role}</span>
                                    </label>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default TeamMembersTab;