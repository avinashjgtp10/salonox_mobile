import React from "react";
import type { TeamMembersData, TeamMember } from "../../types/catalog.types.ts";

interface Props {
  data: TeamMembersData;
  onChange: (data: TeamMembersData) => void;
  errors?: string[];
  staffMembers?: TeamMember[];
  staffLoading?: boolean;
}

const TeamMembersTab: React.FC<Props> = ({
  data,
  onChange,
  errors = [],
  staffMembers,
  staffLoading = false,
}) => {
  // Use API-provided staff when available, fall back to form data
  const members: TeamMember[] =
    staffMembers !== undefined ? staffMembers : data.availableMembers;

  const toggleMember = (memberId: string) => {
    const selected = data.selectedMemberIds.includes(memberId)
      ? data.selectedMemberIds.filter((id: string) => id !== memberId)
      : [...data.selectedMemberIds, memberId];
    onChange({ ...data, selectedMemberIds: selected });
  };

  const toggleAll = (checked: boolean) => {
    onChange({
      ...data,
      allMembers: checked,
      selectedMemberIds: checked ? members.map((m) => m.id) : [],
    });
  };

  const hasError = errors.length > 0;

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Staff members required</h5>
      <p className="text-muted small mb-4">
        Choose which staff members will perform this service
      </p>

      {hasError && (
        <div
          className="alert alert-danger border-0 rounded-3 d-flex align-items-center py-3 mb-4"
          style={{ backgroundColor: "#fff1f2", color: "#991b1b" }}
        >
          <i className="bi bi-exclamation-triangle-fill me-2" />
          <span className="small fw-medium">
            At least one staff member must be selected.
          </span>
        </div>
      )}

      {staffLoading ? (
        <div className="d-flex align-items-center gap-2 py-4 text-muted">
          <span className="spinner-border spinner-border-sm" />
          <span className="small">Loading staff members…</span>
        </div>
      ) : members.length === 0 ? (
        <div className="text-muted small py-4">
          No staff members found. Add staff members first.
        </div>
      ) : (
        <div className="team-selection-list">
          {/* All team members row */}
          <div className="team-selection-item py-2 border-bottom d-flex align-items-center">
            <div className="form-check d-flex align-items-center gap-3 w-100 mb-0">
              <input
                className="form-check-input flex-shrink-0"
                type="checkbox"
                id="all-members"
                checked={data.allMembers}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <label
                className="form-check-label fw-bold d-flex align-items-center gap-2 mb-0"
                htmlFor="all-members"
              >
                All staff members{" "}
                <span className="nav-item-count bg-light text-muted small px-2 rounded-pill">
                  {members.length}
                </span>
              </label>
            </div>
          </div>

          {members.map((member: TeamMember) => (
            <div
              key={member.id}
              className="team-selection-item py-3 border-bottom d-flex align-items-center"
            >
              <div className="form-check d-flex align-items-center gap-3 w-100 mb-0">
                <input
                  className="form-check-input flex-shrink-0"
                  type="checkbox"
                  id={`member-${member.id}`}
                  checked={data.allMembers || data.selectedMemberIds.includes(member.id)}
                  onChange={() => {
                    if (data.allMembers) {
                      // Switch to individual selection, deselect this one
                      onChange({
                        ...data,
                        allMembers: false,
                        selectedMemberIds: members
                          .map((m) => m.id)
                          .filter((id) => id !== member.id),
                      });
                    } else {
                      toggleMember(member.id);
                    }
                  }}
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
                      flexShrink: 0,
                    }}
                  >
                    {member.firstName?.[0] ?? ""}
                    {member.lastName?.[0] ?? ""}
                  </div>
                  <div>
                    <div className="fw-medium text-dark">
                      {member.firstName} {member.lastName}
                    </div>
                    {member.role && (
                      <div className="text-muted extra-small">{member.role}</div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamMembersTab;
