import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ShiftCell from "../../staff/components/ShiftCell";
import MemberRowMenu from "../../staff/components/MemberRowMenu";
import AddTimeOffModal from "../../staff/components/AddTimeOffModal";
import type { ShiftTime } from "../../staff/components/ShiftCell";
import "../styles/ScheduledShiftsPage.scss";
interface Member {
  id: number;
  name: string;
  initials: string;
  avatarColor: string;
  totalHours: number;
}

interface WeekDay {
  label: string;
  dateKey: string;
  colHours: number;
  isOff: boolean;
}

type ShiftMap = Record<number, Record<string, ShiftTime | undefined>>;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekDays(monday: Date): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isOff = d.getDay() === 0;
    return {
      label: `${DAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`,
      dateKey: toLocalDateKey(d),
      colHours: isOff ? 0 : i === 5 ? 7 : 9,
      isOff,
    };
  });
}

function formatRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.getDate()} – ${sunday.getDate()} ${MONTH_SHORT[sunday.getMonth()]}, ${sunday.getFullYear()}`;
}

const MEMBERS: Member[] = [
  { id: 1, name: "Dhumal Dipak", initials: "DD", avatarColor: "#5b5ef4", totalHours: 52 },
];

const SEED_SHIFTS: ShiftMap = {
  1: {
    "2026-03-09": { start: "10am", end: "7pm" },
    "2026-03-10": { start: "10am", end: "7pm" },
    "2026-03-11": { start: "10am", end: "7pm" },
    "2026-03-12": { start: "10am", end: "7pm" },
    "2026-03-13": { start: "10am", end: "7pm" },
    "2026-03-14": { start: "10am", end: "5pm" },
  },
};

const ScheduledShiftsPage: React.FC = () => {
  const navigate = useNavigate();
  const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()));
  const [shifts, setShifts] = useState<ShiftMap>(SEED_SHIFTS);
  const [showOpts, setShowOpts] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [timeOff, setTimeOff] = useState<{ show: boolean; memberId?: number; date?: string }>({ show: false });
  const [isStarted, setIsStarted] = useState(false);

  const weekDays = getWeekDays(monday);

  const prevWeek = () => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d); };
  const nextWeek = () => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d); };
  const thisWeek = () => setMonday(getMondayOf(new Date()));

  const addShift = (memberId: number, date: string) => {
    setShifts(p => ({ ...p, [memberId]: { ...p[memberId], [date]: { start: "10am", end: "6pm" } } }));
  };
  const deleteShift = (memberId: number, date: string) => {
    setShifts(p => { const copy = { ...p[memberId] }; delete copy[date]; return { ...p, [memberId]: copy }; });
  };
  const deleteAll = (memberId: number) => setShifts(p => ({ ...p, [memberId]: {} }));
  const closeDropdowns = () => { setShowOpts(false); setShowAdd(false); };

  // --- Intro / Landing View ---
  if (!isStarted) {
    return (
      <div className="ss-page ss-page--intro-state">
        <div className="ss-page__intro">
          <div className="ss-page__container">
            <div className="ss-page__content">
              <span className="ss-page__badge">Free to use</span>
              <h1 className="ss-page__title">Management made easy <br /> with scheduled shifts</h1>
              <p className="ss-page__subtext">
                Plan your team's schedule, track availability, and ensure <br />
                your salon is always perfectly staffed with Fresha shifts.
              </p>
              <ul className="ss-page__features">
                <li><span className="ss-page__feature-icon">✓</span> Create and manage recurring shift patterns</li>
                <li><span className="ss-page__feature-icon">✓</span> Track staff availability and time-off requests</li>
                <li><span className="ss-page__feature-icon">✓</span> Seamlessly integrated with your booking calendar</li>
              </ul>
              <div className="ss-page__actions">
                <button className="ss-page__btn ss-page__btn--dark ss-page__btn--large" onClick={() => setIsStarted(true)}>Start now</button>
                <button className="ss-page__btn ss-page__btn--outline ss-page__btn--large">Learn more</button>
              </div>
            </div>
            <div className="ss-page__visual">
              {/* CSS-Based Illustration */}
              <div className="sh-ill">
                <div className="sh-ill__card sh-ill__card--left">
                  <div className="sh-ill__header">
                    <div className="sh-ill__status">Scheduled</div>
                    <h3>Morning Shift</h3>
                    <span>Mon 12 Nov 2023</span>
                  </div>
                  <div className="sh-ill__user">
                    <div className="sh-ill__avatar">JD</div>
                    <div className="sh-ill__user-info">
                      <strong>Jane Doe</strong>
                    </div>
                  </div>
                  <div className="sh-ill__list">
                    <div className="sh-ill__item"><span className="dot dot--green"></span> 9:00 AM - 2:00 PM</div>
                    <div className="sh-ill__item">
                      <span className="dot dot--gray"></span>
                      <div>
                        <strong>Main Station</strong>
                        <p>Primary Location</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sh-ill__card sh-ill__card--right">
                  <div className="sh-ill__user">
                    <div className="sh-ill__user-info">
                      <h3>Weekly Overview</h3>
                      <div className="sh-ill__rating">42 Hours Scheduled</div>
                    </div>
                  </div>
                  <div className="sh-ill__data-list">
                    <div className="sh-ill__data-item">
                      <div className="sh-ill__data-label">
                        <span className="icon icon--blue">🕒</span>
                        <div><strong>Mon - Fri</strong> <p>Standard Shift</p></div>
                      </div>
                      <div className="sh-ill__data-val">40h</div>
                    </div>
                    <div className="sh-ill__data-item">
                      <div className="sh-ill__data-label">
                        <span className="icon icon--orange">📅</span>
                        <div><strong>Saturday</strong> <p>Overtime</p></div>
                      </div>
                      <div className="sh-ill__data-val">2h</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Active Scheduling View ---
  return (
    <div className="ss-page ss-page--active" onClick={closeDropdowns}>
      <div className="ss-page__header">
        <h4 className="ss-page__title">Scheduled shifts</h4>
        <div className="ss-page__actions" onClick={e => e.stopPropagation()}>
          <div className="ss-page__dropdown-wrap">
            <button className="ss-page__btn ss-page__btn--outline" onClick={() => { setShowOpts(p => !p); setShowAdd(false); }}>
              Options <span className="ss-page__caret">▾</span>
            </button>
            {showOpts && (
              <ul className="ss-page__menu">
                <li><button className="ss-page__menu-item" onClick={closeDropdowns}>⚙ Scheduling settings</button></li>
              </ul>
            )}
          </div>
          <div className="ss-page__dropdown-wrap">
            <button className="ss-page__btn ss-page__btn--dark" onClick={() => { setShowAdd(p => !p); setShowOpts(false); }}>
              Add <span className="ss-page__caret">▾</span>
            </button>
            {showAdd && (
              <ul className="ss-page__menu ss-page__menu--right">
                <li><button className="ss-page__menu-item" onClick={() => { setTimeOff({ show: true }); closeDropdowns(); }}>Time off</button></li>
                <li><button className="ss-page__menu-item" onClick={() => { navigate("/dashboard/team/add"); closeDropdowns(); }}>New team member</button></li>
                <li><button className="ss-page__menu-item" onClick={closeDropdowns}>Business closed period</button></li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="ss-page__week-nav">
        <button className="ss-page__btn ss-page__btn--outline" onClick={thisWeek}>This week</button>
        <button className="ss-page__btn ss-page__btn--icon" onClick={prevWeek}>‹</button>
        <span className="ss-page__week-label">{formatRange(monday)}</span>
        <button className="ss-page__btn ss-page__btn--icon" onClick={nextWeek}>›</button>
      </div>

      <div className="ss-page__table-wrap">
        <table className="ss-table">
          <thead>
            <tr>
              <th className="ss-table__th-member">
                Team member <button className="ss-page__link">Change</button>
              </th>
              {weekDays.map(d => (
                <th key={d.dateKey} className="ss-table__th-day">
                  <div className="ss-table__day-name">{d.label}</div>
                  <div className="ss-table__day-hours">{d.colHours > 0 ? `${d.colHours}h` : "0min"}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map(m => (
              <tr key={m.id} className="ss-table__row">
                <td className="ss-table__td-member">
                  <div className="ss-table__member-info">
                    <div className="ss-table__avatar" style={{ background: m.avatarColor }}>{m.initials}</div>
                    <div>
                      <div className="ss-table__member-name">{m.name}</div>
                      <div className="ss-table__member-hours">{m.totalHours}h</div>
                    </div>
                    <MemberRowMenu
                      memberId={m.id}
                      onSetRepeating={() => alert("Set repeating")}
                      onUnassign={() => alert("Unassign")}
                      onDeleteAll={deleteAll}
                      onViewMember={() => navigate(`/dashboard/team/members`)}
                      onEditMember={() => navigate(`/dashboard/team/add`)}
                    />
                  </div>
                </td>
                {weekDays.map(d => (
                  <td key={d.dateKey} className="ss-table__td-day">
                    <ShiftCell
                      shift={shifts[m.id]?.[d.dateKey]}
                      isOff={d.isOff}
                      memberId={m.id}
                      date={d.dateKey}
                      onAddShift={addShift}
                      onEditDay={() => alert(`Edit ${d.dateKey}`)}
                      onSetRepeating={() => alert("Set repeating")}
                      onAddTimeOff={(mid, date) => setTimeOff({ show: true, memberId: mid, date })}
                      onDeleteShift={deleteShift}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ss-page__info-banner">
        <span className="ss-page__info-icon">💡</span>
        <p>The team roster shows your availability for bookings and is not linked to your business standard opening hours. To set your standard opening hours, <button className="ss-page__link">click here</button>.</p>
      </div>

      <AddTimeOffModal
        show={timeOff.show}
        members={MEMBERS}
        defaultMemberId={timeOff.memberId}
        defaultDate={timeOff.date}
        onClose={() => setTimeOff({ show: false })}
        onSave={(data) => console.log("Time off saved:", data)}
      />
    </div>
  );
};

export default ScheduledShiftsPage;
