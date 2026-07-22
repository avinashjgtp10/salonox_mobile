import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  InfoCircle,
  Trash3,
  Plus,
  X,
} from "react-bootstrap-icons";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import "../styles/RepeatingShiftsPage.scss";

interface DaySchedule {
  day: string;
  isActive: boolean;
  shifts: { start: string; end: string }[];
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const RepeatingShiftsPage: React.FC = () => {
  const navigate = useNavigate();

  // Mock user data - in reality, fetch by id
  const memberName = "Wendy";

  const scheduleType = "Every week";
  const startDate = "Mar 27, 2026";
  const ends = "Select an option";

  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(
    DAYS.map((day) => ({
      day,
      isActive: day !== "Sunday",
      shifts: [{ start: "10:00 AM", end: "7:00 PM" }],
    })),
  );

  const toggleDay = (index: number) => {
    const newSchedule = [...weeklySchedule];
    newSchedule[index].isActive = !newSchedule[index].isActive;
    setWeeklySchedule(newSchedule);
  };

  const addShift = (dayIndex: number) => {
    const newSchedule = [...weeklySchedule];
    newSchedule[dayIndex].shifts.push({ start: "10:00 AM", end: "7:00 PM" });
    setWeeklySchedule(newSchedule);
  };

  const removeShift = (dayIndex: number, shiftIndex: number) => {
    const newSchedule = [...weeklySchedule];
    newSchedule[dayIndex].shifts = newSchedule[dayIndex].shifts.filter(
      (_, i) => i !== shiftIndex,
    );
    if (newSchedule[dayIndex].shifts.length === 0) {
      newSchedule[dayIndex].isActive = false;
    }
    setWeeklySchedule(newSchedule);
  };

  const calculateTotalHours = () => {
    // Mock calculation
    return weeklySchedule.filter((d) => d.isActive).length * 9;
  };

  return (
    <div className="repeating-shifts-page">
      <header className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <X size={24} />
          </button>
          <div className="title-group">
            <h2>Set {memberName}'s repeating shifts</h2>
            <p>
              Set weekly, biweekly or custom shifts. Changes saved will apply to
              all upcoming shifts for the selected period.{" "}
              <LearnMoreLink topic="repeating-shifts" className="learn-more">Learn more</LearnMoreLink>
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-close" onClick={() => navigate(-1)}>
            Close
          </button>
          <button className="btn-save" onClick={() => navigate(-1)}>
            Save
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="settings-sidebar">
          <div className="profile-card">
            <div className="avatar-icon">
              <InfoCircle size={20} />
            </div>
            <div className="profile-info">
              <strong>test123@gmail.com</strong>
              <p>Sathiaon, Purvanchal Expressway, Satiyava, Uttar Pradesh</p>
            </div>
          </div>

          <div className="setting-group">
            <label>Schedule type</label>
            <div className="select-box">
              <span>{scheduleType}</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div className="setting-group">
            <label>Start date</label>
            <div className="select-box">
              <span>{startDate}</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div className="setting-group">
            <label>Ends</label>
            <div className="select-box placeholder">
              <span>{ends}</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div className="info-box">
            <InfoCircle size={16} />
            <p>
              Team members will not be scheduled on business closed periods.
            </p>
          </div>
        </div>

        <div className="schedule-main">
          <div className="schedule-header">
            <h3>Weekly</h3>
            <span className="total-hours">
              {calculateTotalHours()} hours total
            </span>
          </div>

          <div className="days-list">
            {weeklySchedule.map((dayData, dIndex) => (
              <div
                key={dayData.day}
                className={`day-row ${dayData.isActive ? "active" : ""}`}
              >
                <div className="day-control">
                  <input
                    type="checkbox"
                    checked={dayData.isActive}
                    onChange={() => toggleDay(dIndex)}
                  />
                  <div className="day-name-group">
                    <span className="day-name">{dayData.day}</span>
                    {dayData.isActive && (
                      <span className="day-hours">9 hr</span>
                    )}
                  </div>
                </div>

                <div className="day-shifts">
                  {dayData.isActive ? (
                    dayData.shifts.map((shift, sIndex) => (
                      <div key={sIndex} className="shift-line">
                        <div className="time-select">
                          <span>{shift.start}</span>
                          <ChevronDown size={12} />
                        </div>
                        <span className="to-text">to</span>
                        <div className="time-select">
                          <span>{shift.end}</span>
                          <ChevronDown size={12} />
                        </div>
                        <div className="line-actions">
                          <button
                            className="btn-icon"
                            onClick={() => addShift(dIndex)}
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => removeShift(dIndex, sIndex)}
                          >
                            <Trash3 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="not-working">Not working</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepeatingShiftsPage;
