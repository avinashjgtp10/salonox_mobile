import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ChevronDown,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import "../styles/TeamMemberDrawer.scss";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

function formatDob(day?: number | null, month?: number | null): string | null {
  if (!day || !month || month < 1 || month > 12) return null;
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

function formatJoined(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${MONTH_NAMES[d.getMonth()]} ${ordinal(d.getDate())}, ${d.getFullYear()} – present`;
}

function formatColorLabel(key?: string | null): string | null {
  if (!key || key.startsWith("#")) return null;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TeamMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | number | null;
  onViewCalendar?: (id: string | number) => void;
  onViewShifts?: (id: string | number) => void;
  onAddTimeOff?: (id: string | number) => void;
}

const TeamMemberDrawer: React.FC<TeamMemberDrawerProps> = ({
  isOpen,
  onClose,
  memberId,
  onViewCalendar,
  onViewShifts,
  onAddTimeOff,
}) => {
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const [member, setMember] = useState<any>(null);

  React.useEffect(() => {
    if (isOpen && memberId) {
      const fetchMember = async () => {
        try {
          const res = await api.get(STAFF.BY_ID(memberId));
          const data = res.data?.data || res.data;
          if (data) {
            const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || "Unknown";
            setMember({
              id: data.id,
              name,
              initials: (data.first_name?.[0] || "").toUpperCase(),
              avatarColor: data.calendar_color || "#111827",
              email: data.email || "–",
              phoneDisplay: (data.phone || data.phone_number)
                ? `${data.phone_country_code || ""} ${data.phone || data.phone_number}`.trim()
                : "–",
              dob: formatDob(data.birthday_day, data.birthday_month) || "–",
              country: data.country || "–",
              colorLabel: formatColorLabel(data.calendar_color) || "–",
              jobTitle: data.designation || data.job_title || "–",
              employment: formatJoined(data.joined_date) || "–",
              employmentType: data.employment_type || "–",
              teamMemberId: data.employee_code || data.id || "–",
            });
          }
        } catch (error) {
          console.error("Error fetching team member details:", error);
        }
      };
      fetchMember();
    } else if (!isOpen) {
      setMember(null);
    }
  }, [isOpen, memberId]);

  if (!isOpen || !member) return null;

  return (
    <div
      className={`tm-drawer-overlay ${isOpen ? "show" : ""}`}
      onClick={onClose}
    >
      <div className="tm-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="tm-drawer__header">
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
          <div className="member-profile">
            <div className="name-section">
              <h3>
                {member.name.split(" ")[1]?.toLowerCase() ||
                  member.name.toLowerCase()}
              </h3>
              <div className="actions-container">
                <button
                  className="actions-btn"
                  onClick={() => setShowActions(!showActions)}
                >
                  Actions <ChevronDown size={12} />
                </button>
                {showActions && (
                  <div className="actions-menu">
                    <button
                      className="actions-item"
                      onClick={() => {
                        navigate(`/dashboard/team/edit/${member.id}`);
                        onClose();
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="actions-item"
                      onClick={() => {
                        onViewCalendar?.(member.id);
                        onClose();
                      }}
                    >
                      View calendar
                    </button>
                    <button
                      className="actions-item"
                      onClick={() => {
                        onViewShifts?.(member.id);
                        onClose();
                      }}
                    >
                      View scheduled shifts
                    </button>
                    <button
                      className="actions-item"
                      onClick={() => {
                        onAddTimeOff?.(member.id);
                        onClose();
                      }}
                    >
                      Add time off
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="avatar" style={{ "--avatar-bg": member.avatarColor } as React.CSSProperties}>
              {member.initials}
            </div>
          </div>
        </header>

        <div className="tm-drawer__body">
          <main className="tm-drawer__content">
            <div className="personal-tab">
              <div className="tab-header">
                <h3>Personal information</h3>
                <button
                  className="edit-btn"
                  onClick={() => navigate(`/dashboard/team/${member.id}`)}
                >
                  Edit
                </button>
              </div>

              <div className="personal-section">
                <h4>Profile</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Full name</label>
                    <p>{member.name}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <p>{member.email}</p>
                  </div>
                  <div className="detail-item">
                    <label>Phone number</label>
                    <p>{member.phoneDisplay}</p>
                  </div>
                  <div className="detail-item">
                    <label>Date of birth</label>
                    <p>{member.dob}</p>
                  </div>
                  <div className="detail-item">
                    <label>Country</label>
                    <p>{member.country}</p>
                  </div>
                  <div className="detail-item">
                    <label>Calendar color</label>
                    <div className="color-preview">
                      <span
                        className="color-dot"
                        style={{ "--avatar-bg": member.avatarColor } as React.CSSProperties}
                      ></span>
                      <p>{member.colorLabel}</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Job title</label>
                    <p>{member.jobTitle}</p>
                  </div>
                </div>
              </div>

              <div className="personal-section">
                <h4>Work details</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Employment</label>
                    <p>{member.employment}</p>
                  </div>
                  <div className="detail-item">
                    <label>Employment type</label>
                    <p>{member.employmentType}</p>
                  </div>
                  <div className="detail-item">
                    <label>Team member ID</label>
                    <p>{member.teamMemberId}</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberDrawer;
