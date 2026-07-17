import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ChevronDown,
  InfoCircle,
  GraphUp,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import "../styles/TeamMemberDrawer.scss";

interface PerformanceCardProps {
  title: string;
  value: string;
  change: string;
  icon?: React.ReactNode;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  value,
  change,
  icon,
}) => (
  <div className="perf-card">
    <div className="perf-card__header">
      <span className="title-with-icon">
        {title} {icon || <InfoCircle size={14} />}
      </span>
    </div>
    <div className="perf-card__value">{value}</div>
    <div className="perf-card__change">
      <GraphUp size={12} /> {change} vs prev period
    </div>
  </div>
);

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
  const [timeRange, setTimeRange] = useState("Week to date");
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [member, setMember] = useState<any>(null);

  React.useEffect(() => {
    if (isOpen && memberId) {
      const fetchMember = async () => {
        try {
          const res = await api.get(STAFF.BY_ID(memberId));
          const data = res.data?.data || res.data;
          if (data) {
            setMember({
              id: data.id,
              name: `${data.first_name} ${data.last_name}`,
              initials: (data.first_name?.[0] || "").toUpperCase(),
              avatarColor: data.calendar_color || "#111827",
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

  const ranges = ["Today", "Week to date", "Last 7 days", "Month to date"];

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
            <div className="overview-tab">
              <div className="overview-header">
                <h3>Overview</h3>
                <div className="perf-controls">
                  <div className="perf-link">
                    <span>Performance dashboard</span>
                    <button className="view-full">View full dashboard</button>
                  </div>
                  <div className="perf-selector">
                    <button
                      className="range-btn"
                      onClick={() => setShowRangeMenu(!showRangeMenu)}
                    >
                      {timeRange} <ChevronDown size={14} />
                    </button>
                    {showRangeMenu && (
                      <div className="range-menu">
                        {ranges.map((r) => (
                          <div
                            key={r}
                            className={`range-item ${timeRange === r ? "active" : ""}`}
                            onClick={() => {
                              setTimeRange(r);
                              setShowRangeMenu(false);
                            }}
                          >
                            {r} {timeRange === r && <span>✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="metrics-grid">
                <PerformanceCard title="Sales" value="₹0.00" change="0%" />
                <PerformanceCard title="Appointments" value="0" change="0%" />
                <PerformanceCard title="Clients" value="0" change="0%" />
                <PerformanceCard title="Occupancy" value="0%" change="0%" />
                <PerformanceCard title="Retention" value="0%" change="0%" />
              </div>
            </div>

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
                    <p>shivani21@gmail.com</p>
                  </div>
                  <div className="detail-item">
                    <label>Phone number</label>
                    <p>+91 89997 23694</p>
                  </div>
                  <div className="detail-item">
                    <label>Date of birth</label>
                    <p>–</p>
                  </div>
                  <div className="detail-item">
                    <label>Country</label>
                    <p>–</p>
                  </div>
                  <div className="detail-item">
                    <label>Calendar color</label>
                    <div className="color-preview">
                      <span
                        className="color-dot"
                        style={{ "--avatar-bg": member.avatarColor } as React.CSSProperties}
                      ></span>
                      <p>Blue</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Job title</label>
                    <p>–</p>
                  </div>
                </div>
              </div>

              <div className="personal-section">
                <h4>Work details</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Employment</label>
                    <p>March 26th, 2026 – present</p>
                  </div>
                  <div className="detail-item">
                    <label>Employment type</label>
                    <p>–</p>
                  </div>
                  <div className="detail-item">
                    <label>Team member ID</label>
                    <p>–</p>
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
