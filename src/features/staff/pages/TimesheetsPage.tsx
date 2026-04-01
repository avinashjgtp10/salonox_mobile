import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    CheckCircleFill,
    Search,
    Funnel,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    PeopleFill,
    CalendarCheck,
    XLg,
    Gear
} from "react-bootstrap-icons";
import "../styles/TimesheetsPage.scss";

const TimesheetsPage: React.FC = () => {
    const [isStarted, setIsStarted] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [currentSort, setCurrentSort] = useState("Date (newest first)");
    const [startDate, setStartDate] = useState("2026-03-09");
    const [endDate, setEndDate] = useState("2026-03-15");
    const [statusFilter, setStatusFilter] = useState("All");
    const [punctualityFilter, setPunctualityFilter] = useState("All clock ins");
    const sortRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const sortOptions = [
        "Date (newest first)",
        "Date (oldest first)",
        "Team member (A-Z)",
        "Team member (Z-A)",
        "Breaks (longest first)",
        "Breaks (shortest first)"
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
            if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
                setIsOptionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay(); // 0 = Sun

    const renderMonth = (month: number, year: number, monthName: string) => {
        const totalDays = daysInMonth(month, year);
        const startOffset = (firstDayOfMonth(month, year) + 6) % 7; // Adjust for Mon start
        const days = [];

        for (let i = 0; i < startOffset; i++) {
            days.push(<div key={`empty-${i}`} className="ts-cal__day ts-cal__day--empty" />);
        }

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isStart = dateStr === startDate;
            const isEnd = dateStr === endDate;
            const inRange = dateStr > startDate && dateStr < endDate;

            days.push(
                <div
                    key={d}
                    className={`ts-cal__day ${isStart ? 'ts-cal__day--start' : ''} ${isEnd ? 'ts-cal__day--end' : ''} ${inRange ? 'ts-cal__day--range' : ''}`}
                    onClick={() => {
                        if (!startDate || (startDate && endDate)) {
                            setStartDate(dateStr);
                            setEndDate("");
                        } else {
                            if (dateStr < startDate) {
                                setEndDate(startDate);
                                setStartDate(dateStr);
                            } else {
                                setEndDate(dateStr);
                            }
                        }
                    }}
                >
                    {d}
                </div>
            );
        }

        return (
            <div className="ts-cal__month">
                <div className="ts-cal__month-header">
                    {monthName} {year}
                </div>
                <div className="ts-cal__weekdays">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
                <div className="ts-cal__grid">
                    {days}
                </div>
            </div>
        );
    };

    // --- Intro / Landing View ---
    if (!isStarted) {
        return (
            <div className="ts-page">
                <div className="ts-page__intro">
                    <div className="ts-page__container">
                        <div className="ts-page__content">
                            <span className="ts-page__badge">Free to use</span>
                            <h1 className="ts-page__title">Simplify time tracking <br /> and attendance</h1>
                            <p className="ts-page__subtext">
                                Track your team's working hours and make pay calculations <br />
                                straightforward with salonox timesheets
                            </p>
                            <ul className="ts-page__features">
                                <li><CheckCircleFill /> Track worked hours and breaks in real time</li>
                                <li><CheckCircleFill /> Fully integrated with salonox Pay Runs</li>
                                <li><CheckCircleFill /> Detailed reporting to monitor attendance and punctuality</li>
                            </ul>
                            <div className="ts-page__actions">
                                <button className="ts-page__btn ts-page__btn--dark" onClick={() => setIsStarted(true)}>Start now</button>
                                <button className="ts-page__btn ts-page__btn--light" onClick={() => navigate("/dashboard/team/members")}>View team members</button>
                            </div>
                        </div>
                        <div className="ts-page__visual">
                            {/* CSS-Based Illustration */}
                            <div className="ts-ill">
                                <div className="ts-ill__card ts-ill__card--left">
                                    <div className="ts-ill__header">
                                        <div className="ts-ill__status">Checked out</div>
                                        <h3>Timesheet</h3>
                                        <span>Tue 13 Nov 2023</span>
                                    </div>
                                    <div className="ts-ill__user">
                                        <div className="ts-ill__avatar">SC</div>
                                        <div className="ts-ill__user-info">
                                            <strong>Sarah Curtis</strong>
                                        </div>
                                    </div>
                                    <div className="ts-ill__list">
                                        <div className="ts-ill__item"><span className="dot dot--blue"></span> Clocked in</div>
                                        <div className="ts-ill__item">
                                            <span className="dot dot--gray"></span>
                                            <div>
                                                <strong>Coffee break</strong>
                                                <p>Unpaid</p>
                                            </div>
                                        </div>
                                        <div className="ts-ill__item">
                                            <span className="dot dot--orange"></span>
                                            <div>
                                                <strong>Lunch break</strong>
                                                <p>Paid</p>
                                            </div>
                                        </div>
                                        <div className="ts-ill__item"><span className="dot dot--blue"></span> Clocked out</div>
                                    </div>
                                </div>

                                <div className="ts-ill__card ts-ill__card--right">
                                    <div className="ts-ill__user">
                                        <div className="ts-ill__user-info">
                                            <h3>Tony Smith</h3>
                                            <div className="ts-ill__rating">5.0 ★</div>
                                        </div>
                                    </div>
                                    <div className="ts-ill__data-list">
                                        <div className="ts-ill__data-item">
                                            <div className="ts-ill__data-label">
                                                <CheckCircleFill className="text-success" />
                                                <div><strong>12 Nov timesheet</strong> <p>Waiting approval</p></div>
                                            </div>
                                            <div className="ts-ill__data-val">11 hours</div>
                                        </div>
                                        <div className="ts-ill__data-item">
                                            <div className="ts-ill__data-label">
                                                <CheckCircleFill className="text-success" />
                                                <div><strong>Working hours</strong> <p>Approved</p></div>
                                            </div>
                                            <div className="ts-ill__data-val">8 hours</div>
                                        </div>
                                        <div className="ts-ill__data-item">
                                            <div className="ts-ill__data-label">
                                                <CheckCircleFill className="text-success" />
                                                <div><strong>Overtime hours</strong> <p>Approved</p></div>
                                            </div>
                                            <div className="ts-ill__data-val">1 hours</div>
                                        </div>
                                        <div className="ts-ill__data-item">
                                            <div className="ts-ill__data-label">
                                                <CheckCircleFill className="text-success" />
                                                <div><strong>Unpaid hours</strong> <p>Approved</p></div>
                                            </div>
                                            <div className="ts-ill__data-val">2 hours</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="ts-ill__bubble">
                                    <div className="ts-ill__bubble-icon"><CalendarCheck /></div>
                                    <div className="ts-ill__bubble-text">
                                        <strong>Clock in starts in 2 minutes</strong>
                                        <p>8:30am to 5:00pm at Trendy Studio</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Active / List View (Image 2 style) ---
    return (
        <div className="ts-page ts-page--active">
            <div className="ts-page__header">
                <div className="ts-page__header-info">
                    <h2>Timesheets</h2>
                    <p>Manage your team members' timesheets</p>
                </div>
                <div className="ts-page__header-btns">
                    <div className="ts-page__options-wrap" ref={optionsRef}>
                        <button
                            className="ts-page__btn ts-page__btn--white"
                            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                        >
                            Options <ChevronDown size={12} />
                        </button>
                        {isOptionsOpen && (
                            <div className="ts-page__options-menu">
                                <div className="ts-page__options-item" onClick={() => setIsOptionsOpen(false)}>
                                    <Gear size={16} /> Timesheets settings
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="ts-page__btn ts-page__btn--dark" onClick={() => setIsAddDrawerOpen(true)}>Add</button>
                </div>
            </div>

            <div className="ts-page__main">
                <div className="ts-page__toolbar">
                    <div className="ts-page__toolbar-left">
                        <div className="ts-page__search-wrap">
                            <Search />
                            <input type="text" placeholder="Search" />
                        </div>
                        <div className="ts-page__toolbar-group" ref={calendarRef}>
                            <div className="ts-page__cal-trigger">
                                <button
                                    className="ts-page__btn ts-page__btn--white ts-page__date-btn"
                                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                >
                                    This week <ChevronDown size={12} />
                                </button>

                                {isCalendarOpen && (
                                    <div className="ts-cal-overlay">
                                        <div className="ts-cal-overlay__header">
                                            <div className="ts-cal-overlay__range-select">
                                                <label>Date range</label>
                                                <select defaultValue="This week">
                                                    <option>This week</option>
                                                    <option>Last week</option>
                                                    <option>Custom</option>
                                                </select>
                                            </div>

                                            <div className="ts-cal-overlay__inputs">
                                                <div className="ts-cal-overlay__input-field">
                                                    <label>Starting</label>
                                                    <input type="text" value={startDate} readOnly />
                                                </div>
                                                <div className="ts-cal-overlay__input-field">
                                                    <label>Ending</label>
                                                    <input type="text" value={endDate} readOnly />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ts-cal-overlay__calendars">
                                            <button className="ts-cal-overlay__nav ts-cal-overlay__nav--prev">
                                                <ChevronLeft />
                                            </button>
                                            {renderMonth(2, 2026, "March")}
                                            {renderMonth(3, 2026, "April")}
                                            <button className="ts-cal-overlay__nav ts-cal-overlay__nav--next">
                                                <ChevronRight />
                                            </button>
                                        </div>

                                        <div className="ts-cal-overlay__footer">
                                            <button className="ts-page__btn ts-page__btn--white" onClick={() => setIsCalendarOpen(false)}>Cancel</button>
                                            <button className="ts-page__btn ts-page__btn--dark" onClick={() => setIsCalendarOpen(false)}>Apply</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button className="ts-page__filter-btn" onClick={() => setIsFilterOpen(true)}>
                                <Funnel />
                            </button>
                        </div>
                    </div>
                    <div className="ts-page__sort-wrap" ref={sortRef}>
                        <div className="ts-page__sort" onClick={() => setIsSortOpen(!isSortOpen)}>
                            {currentSort.split(" ")[0]} <span>({currentSort.split(" ").slice(1).join(" ")})</span> <ChevronDown size={12} />
                        </div>
                        {isSortOpen && (
                            <div className="ts-page__sort-menu">
                                {sortOptions.map((option) => (
                                    <div
                                        key={option}
                                        className={`ts-page__sort-item ${currentSort === option ? "ts-page__sort-item--active" : ""}`}
                                        onClick={() => {
                                            setCurrentSort(option);
                                            setIsSortOpen(false);
                                        }}
                                    >
                                        <div className="ts-page__radio">
                                            {currentSort === option && <div className="ts-page__radio-inner" />}
                                        </div>
                                        {option}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="ts-page__empty-card">
                    <div className="ts-page__empty-icon">
                        <PeopleFill />
                    </div>
                    <h3>No team members</h3>
                    <p>
                        To add your first timesheet, enable timesheets for your team members
                    </p>
                    <button className="ts-page__btn ts-page__btn--white" onClick={() => navigate("/dashboard/team/members")}>
                        View team members
                    </button>
                </div>
            </div>

            {/* Filter Modal */}
            {isFilterOpen && (
                <div className="ts-filter-overlay">
                    <div className="ts-filter-modal">
                        <div className="ts-filter-modal__header">
                            <h3>Filters</h3>
                            <button className="ts-filter-modal__close" onClick={() => setIsFilterOpen(false)}>
                                <XLg size={18} />
                            </button>
                        </div>

                        <div className="ts-filter-modal__body">
                            <div className="ts-filter-modal__field">
                                <label>Status</label>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option>All</option>
                                    <option>Pending</option>
                                    <option>Approved</option>
                                </select>
                            </div>

                            <div className="ts-filter-modal__field">
                                <label>Punctuality</label>
                                <select value={punctualityFilter} onChange={(e) => setPunctualityFilter(e.target.value)}>
                                    <option>All clock ins</option>
                                    <option>Late</option>
                                    <option>Early</option>
                                </select>
                            </div>
                        </div>

                        <div className="ts-filter-modal__footer">
                            <button className="ts-page__btn ts-page__btn--white" onClick={() => {
                                setStatusFilter("All");
                                setPunctualityFilter("All clock ins");
                            }}>Clear filters</button>
                            <button className="ts-page__btn ts-page__btn--dark" onClick={() => setIsFilterOpen(false)}>Apply</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Team Member Drawer */}
            {isAddDrawerOpen && (
                <div className="ts-drawer-overlay" onClick={() => setIsAddDrawerOpen(false)}>
                    <div className="ts-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="ts-drawer__header">
                            <h3>Select team member</h3>
                            <button className="ts-drawer__close" onClick={() => setIsAddDrawerOpen(false)}>
                                <XLg size={18} />
                            </button>
                        </div>

                        <div className="ts-drawer__body">
                            <div className="ts-drawer__search">
                                <Search size={16} />
                                <input type="text" placeholder="Search team member name" />
                            </div>

                            <div className="ts-drawer__empty">
                                <div className="ts-drawer__empty-icon">
                                    <Search size={32} />
                                </div>
                                <strong>No team members found</strong>
                                <p>To add your first timesheet, enable timesheets for your team members</p>
                                <button className="ts-page__btn ts-page__btn--white" onClick={() => navigate("/dashboard/team/members")}>
                                    View team members
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimesheetsPage;
