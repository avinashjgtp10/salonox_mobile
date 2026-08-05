import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, PencilSquare } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import "../styles/TeamMemberDrawer.scss";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDob(day?: number | null, month?: number | null): string | null {
  if (!day || !month || month < 1 || month > 12) return null;
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

function formatJoined(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatColorLabel(key?: string | null): string | null {
  if (!key) return null;
  if (key.startsWith("#")) return key.toUpperCase();
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="tmd-info-row">
      <span className="tmd-info-label">{label}</span>
      <span className="tmd-info-value">{value || "–"}</span>
    </div>
  );
}

interface TeamMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | number | null;
  /** Called after Activate/Deactivate succeeds, so the parent list's own
   *  Active/Inactive column/filter stays in sync without a manual refresh. */
  onUpdated?: () => void;
}

const TeamMemberDrawer: React.FC<TeamMemberDrawerProps> = ({
  isOpen,
  onClose,
  memberId,
  onUpdated,
}) => {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const loadMember = useCallback(async (id: string | number) => {
    setLoading(true);
    try {
      const [staffRes, wagesRes] = await Promise.all([
        api.get(STAFF.BY_ID(id)),
        api.get(STAFF.WAGES(id)).catch(() => null),
      ]);
      const data = staffRes.data?.data || staffRes.data;
      const wages = wagesRes?.data?.data;
      if (data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || "Unknown";
        setMember({
          id: data.id,
          name,
          initials: (data.first_name?.[0] || "?").toUpperCase(),
          avatarColor: data.calendar_color?.startsWith?.("#") ? data.calendar_color : "#111827",
          isActive: data.is_active !== false,
          email: data.email || null,
          mobile: (data.phone_number || data.phone)
            ? `${data.phone_country_code || ""} ${data.phone_number || data.phone}`.trim()
            : null,
          gender: data.gender || null,
          dob: formatDob(data.birthday_day, data.birthday_month),
          address: data.address || null,
          country: data.country || null,
          joinedDate: formatJoined(data.joined_date),
          employmentType: data.employment_type || null,
          designation: data.designation || data.job_title || null,
          staffMemberId: data.employee_code || data.id,
          workingHoursPerDay: data.working_hours_per_day != null ? `${data.working_hours_per_day} hrs/day` : null,
          weeklyHolidays: data.holidays != null ? String(data.holidays) : null,
          calendarColor: data.calendar_color || null,
          calendarColorLabel: formatColorLabel(data.calendar_color),
          hourlyRate: wages?.hourly_rate != null ? formatAmount(Number(wages.hourly_rate)) : null,
          fixedSalary: wages?.salary_amount != null ? formatAmount(Number(wages.salary_amount)) : null,
        });
      }
    } catch (error) {
      console.error("Error fetching team member details:", error);
      setMember(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOpen && memberId) {
      loadMember(memberId);
    } else if (!isOpen) {
      setMember(null);
    }
  }, [isOpen, memberId, loadMember]);

  const handleToggleActive = async () => {
    if (!member || togglingActive) return;
    setTogglingActive(true);
    try {
      const endpoint = member.isActive ? STAFF.DEACTIVATE(member.id) : STAFF.ACTIVATE(member.id);
      await api.patch(endpoint);
      setMember((prev: any) => (prev ? { ...prev, isActive: !prev.isActive } : prev));
      showSuccess(member.isActive ? "Staff member deactivated" : "Staff member activated");
      onUpdated?.();
    } catch {
      showError("Failed to update staff status. Please try again.");
    } finally {
      setTogglingActive(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`tm-drawer-overlay ${isOpen ? "show" : ""}`} onClick={onClose}>
      {overlay}
      <div className="tm-drawer tmd-simple" onClick={(e) => e.stopPropagation()}>
        <button className="tmd-close" onClick={onClose}>
          <X size={20} />
        </button>

        {loading || !member ? (
          <div className="tmd-loading">Loading staff details…</div>
        ) : (
          <>
            {/* Header */}
            <div className="tmd-header">
              <div className="tmd-avatar" style={{ "--avatar-bg": member.avatarColor } as React.CSSProperties}>
                {member.initials}
              </div>
              <div className="tmd-identity">
                <h3 className="tmd-name">{member.name}</h3>
                {member.designation && <p className="tmd-designation">{member.designation}</p>}
                <div className="tmd-meta-row">
                  <span className={`tmd-status-badge ${member.isActive ? "active" : "inactive"}`}>
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                  {member.joinedDate && (
                    <span className="tmd-joined-since">Joined {member.joinedDate}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="tmd-quick-actions">
              <button
                type="button"
                className="tmd-action-btn"
                onClick={() => { navigate(`/dashboard/team/${member.id}`); onClose(); }}
              >
                <PencilSquare size={13} /> Edit Staff
              </button>
              <button
                type="button"
                className={`tmd-action-btn ${member.isActive ? "tmd-action-btn--danger" : "tmd-action-btn--success"}`}
                onClick={handleToggleActive}
                disabled={togglingActive}
              >
                {togglingActive ? "Please wait…" : member.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>

            {/* Info sections */}
            <div className="tmd-body">
              <div className="tmd-section-title">Personal Information</div>
              <InfoRow label="Full Name" value={member.name} />
              <InfoRow label="Email" value={member.email} />
              <InfoRow label="Mobile Number" value={member.mobile} />
              <InfoRow label="Gender" value={member.gender} />
              <InfoRow label="Date of Birth" value={member.dob} />
              <InfoRow label="Address" value={member.address} />
              <InfoRow label="Country" value={member.country} />

              <div className="tmd-section-title tmd-section-title--mt">Employment Details</div>
              <InfoRow label="Date of Joining" value={member.joinedDate} />
              <InfoRow label="Employment Type" value={member.employmentType} />
              <InfoRow label="Designation" value={member.designation} />
              <InfoRow label="Staff Member ID" value={member.staffMemberId} />

              <div className="tmd-section-title tmd-section-title--mt">Work Information</div>
              <InfoRow label="Working Hours per Day" value={member.workingHoursPerDay} />
              <InfoRow label="Weekly Holidays" value={member.weeklyHolidays} />
              <InfoRow label="Hourly Rate" value={member.hourlyRate} />
              <InfoRow label="Fixed Salary" value={member.fixedSalary} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeamMemberDrawer;
