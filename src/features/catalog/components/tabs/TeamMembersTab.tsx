import React from "react";
import type { TeamMembersData, TeamMember } from "../../types/catalog.types.ts";

interface Props {
  data: TeamMembersData;
  onChange: (data: TeamMembersData) => void;
  errors?: string[];
}

const TeamMembersTab: React.FC<Props> = ({ data, onChange, errors = [] }) => {
  const toggleMember = (memberId: string) => {
    const selected = data.selectedMemberIds.includes(memberId)
      ? data.selectedMemberIds.filter((id: string) => id !== memberId)
      : [...data.selectedMemberIds, memberId];
    onChange({ ...data, selectedMemberIds: selected });
  };

  const hasError = errors.length > 0;

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Team members required</h5>
      <p className="text-muted small mb-4">
        Choose which team members will perform this service
      </p>

      {hasError && (
        <div
          className="alert alert-danger border-0 rounded-3 d-flex align-items-center py-3 mb-4 animate-fade-in"
          style={{ backgroundColor: "#fff1f2", color: "#991b1b" }}
        >
          <i className="bi bi-exclamation-triangle-fill me-2" />
          <span className="small fw-medium">
            At least one team member must be selected.
          </span>
        </div>
      )}

      <div className="team-selection-list">
        <div className="team-selection-item py-2 border-bottom d-flex align-items-center">
          <div className="form-check d-flex align-items-center gap-3 w-100 mb-0">
            <input
              className="form-check-input flex-shrink-0"
              type="checkbox"
              id="all-members"
              checked={data.allMembers}
              onChange={(e) =>
                onChange({ ...data, allMembers: e.target.checked })
              }
            />
            <label
              className="form-check-label fw-bold d-flex align-items-center gap-2 mb-0"
              htmlFor="all-members"
            >
              All team members{" "}
              <span className="nav-item-count bg-light text-muted small px-2 rounded-pill">
                2
              </span>
            </label>
          </div>
        </div>

        {data.availableMembers.map((member: TeamMember) => (
          <div
            key={member.id}
            className="team-selection-item py-3 border-bottom d-flex align-items-center"
          >
            <div className="form-check d-flex align-items-center gap-3 w-100 mb-0">
              <input
                className="form-check-input flex-shrink-0"
                type="checkbox"
                id={`member-${member.id}`}
                checked={data.selectedMemberIds.includes(member.id)}
                onChange={() => toggleMember(member.id)}
              />
              <label
                className="form-check-label d-flex align-items-center gap-3 mb-0"
                htmlFor={`member-${member.id}`}
              >
                <div
                  className="avatar-circle rounded-circle d-flex align-items-center justify-content-center fw-bold text-uppercase"
                  style={{
                    width: "36px",
                    height: "36px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    fontSize: "13px",
                  }}
                >
                  {member.firstName[0]}
                  {member.lastName[0]}
                </div>
                <span className="fw-medium text-dark">
                  {member.firstName} {member.lastName}
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamMembersTab;
