import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import type { ViewMode, IntervalOption } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatDateLabel } from "../../utils/timeUtils";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import api from "../../../../services/api/axios";
import ClientHistoryModal from "../../../clients/components/ClientHistoryModal";
import "../../styles/TopBar.scss";

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
function avatarColor(name: string) { return AVATAR_COLORS[(name?.charCodeAt(0) || 65) % AVATAR_COLORS.length]; }

interface TopBarProps {
  onNewAppointment: () => void;
  onBlockTime: () => void;
  onRefresh?: () => void | Promise<void>;
  onNewAppointmentForClient?: (client: { id: string; name: string; phone: string }) => void;
}

const VIEW_OPTIONS: ViewMode[] = ["Day", "Week", "Month", "List Week"];
const INTERVAL_OPTIONS: IntervalOption[] = ["15 Mins", "30 Mins", "60 Mins"];

const TopBar: React.FC<TopBarProps> = ({ onNewAppointment, onBlockTime, onRefresh, onNewAppointmentForClient }) => {
  const {
    viewMode, setViewMode, currentDate, setCurrentDate,
    navigate, interval, setInterval, staffList, selectedStaffIds, setSelectedStaffIds,
  } = useSchedulerContext();
  const navTo   = useNavigate();
  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id ?? s.auth?.user?.salon_id ?? "");

  // ── Client search ──────────────────────────────────────────────────────────
  const [clientQuery, setClientQuery]         = useState("");
  const [clientResults, setClientResults]     = useState<{ id: string; name: string; phone: string }[]>([]);
  const [showClientDrop, setShowClientDrop]   = useState(false);
  const [clientSearching, setClientSearching] = useState(false);
  const [searchDone, setSearchDone]           = useState(false);
  const [historyClientId, setHistoryClientId] = useState<string | null>(null);
  const searchRef   = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        // Hide the dropdown but KEEP the typed query and results — clicks
        // inside the portaled ClientHistoryModal land "outside" this ref, and
        // wiping the query here forced staff to retype the same search after
        // merely viewing a client's history. Refocusing the input reopens the
        // dropdown with the kept results; the × button still clears fully.
        setShowClientDrop(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleClientSearch = useCallback((q: string) => {
    setClientQuery(q);
    setSearchDone(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const trimmed = q.trim();
    if (trimmed.length < 3) { setClientResults([]); setShowClientDrop(false); return; }
    setShowClientDrop(true);
    searchTimer.current = setTimeout(async () => {
      setClientSearching(true);
      try {
        const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(q)}&salon_id=${salonId}`);
        const raw: any = res.data?.data ?? res.data ?? [];
        const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
        const list = items.map((c: any) => ({
          id: String(c.id),
          name: c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—",
          phone: c.phone_number || c.phone || "",
        }));
        setClientResults(list);
        setSearchDone(true);
      } catch {
        setClientResults([]);
        setSearchDone(true);
      } finally {
        setClientSearching(false);
      }
    }, 300);
  }, [salonId]);

  function closeSearch() {
    setClientQuery(""); setClientResults([]); setShowClientDrop(false); setSearchDone(false);
  }

  const [showViewDrop,  setShowViewDrop]  = useState(false);
  const [showDatePicker,setShowDatePicker]= useState(false);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [isRefreshing,  setIsRefreshing]  = useState(false);

  const [viewDropPos,   setViewDropPos]   = useState({ top: 0, left: 0 });
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });
  const [staffDropPos,  setStaffDropPos]  = useState({ top: 0, left: 0 });

  const viewDropBtnRef  = useRef<HTMLButtonElement>(null);
  const dateBtnRef      = useRef<HTMLButtonElement>(null);
  const viewDropRef     = useRef<HTMLDivElement>(null);
  const datePickerRef   = useRef<HTMLDivElement>(null);
  const staffDropBtnRef = useRef<HTMLButtonElement>(null);
  const staffDropRef    = useRef<HTMLDivElement>(null);

  const today   = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (viewDropRef.current && !viewDropRef.current.contains(target) && viewDropBtnRef.current && !viewDropBtnRef.current.contains(target))
        setShowViewDrop(false);
      if (datePickerRef.current && !datePickerRef.current.contains(target) && dateBtnRef.current && !dateBtnRef.current.contains(target))
        setShowDatePicker(false);
      if (staffDropRef.current && !staffDropRef.current.contains(target) && staffDropBtnRef.current && !staffDropBtnRef.current.contains(target))
        setShowStaffDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function reposition() {
      if (showViewDrop && viewDropBtnRef.current) {
        const r = viewDropBtnRef.current.getBoundingClientRect();
        setViewDropPos({ top: r.bottom + 4, left: r.left });
      }
      if (showDatePicker && dateBtnRef.current) {
        const r = dateBtnRef.current.getBoundingClientRect();
        setDatePickerPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
      }
      if (showStaffDrop && staffDropBtnRef.current) {
        const r = staffDropBtnRef.current.getBoundingClientRect();
        setStaffDropPos({ top: r.bottom + 4, left: r.left });
      }
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [showViewDrop, showDatePicker, showStaffDrop]);

  function getShortDateLabel() {
    if (viewMode === "Day") {
      return new Date(currentDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    return formatDateLabel(currentDate, viewMode);
  }

  function openViewDrop() {
    if (viewDropBtnRef.current) {
      const r = viewDropBtnRef.current.getBoundingClientRect();
      setViewDropPos({ top: r.bottom + 4, left: r.left });
    }
    setShowViewDrop((v) => !v);
  }

  function openDatePicker() {
    if (dateBtnRef.current) {
      const r = dateBtnRef.current.getBoundingClientRect();
      setDatePickerPos({ top: r.bottom + 6, left: r.left });
    }
    setShowDatePicker((v) => !v);
  }

  function openStaffDrop() {
    if (staffDropBtnRef.current) {
      const r = staffDropBtnRef.current.getBoundingClientRect();
      setStaffDropPos({ top: r.bottom + 4, left: r.left });
    }
    setShowStaffDrop((v) => !v);
  }

  const selectedStaffName = selectedStaffIds.length === 0
    ? "All Staff"
    : selectedStaffIds.length === 1
      ? (staffList.find((s) => s.id === selectedStaffIds[0])?.name ?? "Staff")
      : `${selectedStaffIds.length} Staff`;

  // Only show a single accent dot when exactly one staff member is selected —
  // with more than one selected there's no single color to represent them all.
  const selectedStaffColor = selectedStaffIds.length === 1
    ? staffList.find((s) => s.id === selectedStaffIds[0])?.color
    : undefined;

  const toggleStaffSelection = useCallback((staffId: string) => {
    setSelectedStaffIds(
      selectedStaffIds.includes(staffId)
        ? selectedStaffIds.filter((id) => id !== staffId)
        : [...selectedStaffIds, staffId]
    );
  }, [selectedStaffIds, setSelectedStaffIds]);

  return (
    <>
      <div className="cal-topbar">
        {/* View dropdown trigger */}
        <button
          ref={viewDropBtnRef}
          className="topbar__view-btn"
          onMouseDown={(e) => { e.stopPropagation(); openViewDrop(); }}
        >
          {viewMode} <span className="topbar__arrow">▼</span>
        </button>

        {/* Prev */}
        <button className="topbar__nav-btn" onClick={() => navigate(-1)}>‹</button>

        {/* Date picker trigger */}
        <button
          ref={dateBtnRef}
          className={`topbar__date-btn${showDatePicker ? " topbar__date-btn--active" : ""}`}
          onMouseDown={(e) => { e.stopPropagation(); openDatePicker(); }}
        >
          {getShortDateLabel()}{" "}
          <span className="topbar__arrow topbar__arrow--faint">▼</span>
        </button>

        {/* Next */}
        <button className="topbar__nav-btn" onClick={() => navigate(1)}>›</button>

        {/* Today */}
        <button
          className={`topbar__today-btn${isToday ? " topbar__today-btn--current" : ""}`}
          onClick={() => setCurrentDate(today)}
        >
          Today
        </button>

        {/* ── Client search ── */}
        <div ref={searchRef} className="topbar__client-search">
          <div className="topbar__client-search-input-wrap">
            <span className="topbar__client-search-icon">🔍</span>
            <input
              value={clientQuery}
              onChange={(e) => {
                const val = e.target.value;
                const isNumeric = /^\d+$/.test(val);
                if (isNumeric && val.length > 10) return;
                if (!isNumeric && val.length > 15) return;
                handleClientSearch(val);
              }}
              onFocus={() => { if (clientQuery.length >= 3) setShowClientDrop(true); }}
              placeholder="Search client…"
              className="topbar__client-search-input"
            />
            {clientSearching && <span className="topbar__client-search-spinner-sm" />}
            {clientQuery && !clientSearching && (
              <button
                className="topbar__client-clear"
                onMouseDown={(e) => { e.preventDefault(); closeSearch(); }}
              >×</button>
            )}
          </div>

          {showClientDrop && ReactDOM.createPortal(
            <div
              className="topbar-client-drop"
              style={{
                top:   (searchRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                left:  searchRef.current?.getBoundingClientRect().left ?? 0,
                width: 340,
              }}
            >
              {clientSearching && (
                <div className="topbar-client-drop__loading">
                  <span className="topbar-client-drop__loading-spinner" />
                  Searching…
                </div>
              )}

              {!clientSearching && searchDone && clientResults.length > 0 && clientResults.map((c) => (
                <div
                  key={c.id}
                  className="topbar-client-drop__item"
                  onMouseDown={(e) => { e.preventDefault(); closeSearch(); onNewAppointmentForClient?.(c); }}
                >
                  <span className="topbar-client-drop__avatar" style={{ background: avatarColor(c.name) }}>
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="topbar-client-drop__info">
                    <span className="topbar-client-drop__name">{c.name}</span>
                    {c.phone && <span className="topbar-client-drop__phone">{c.phone}</span>}
                  </span>
                  {/* Same "View History" action/popup as the client card on the
                      booking drawer — pops up in place instead of navigating
                      away, so staff stay on the calendar. Separate click
                      target from the row itself, which opens a new
                      appointment for this client. */}
                  <button
                    type="button"
                    className="topbar-client-drop__history-btn"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Keep the query/results so the search survives the
                      // history popup — only the dropdown itself hides.
                      setShowClientDrop(false);
                      setHistoryClientId(c.id);
                    }}
                  >
                    View History
                  </button>
                </div>
              ))}

              {!clientSearching && searchDone && clientResults.length === 0 && (
                <div className="topbar-client-drop__no-results">
                  <div className="topbar-client-drop__no-results-title">No client found</div>
                  <div className="topbar-client-drop__no-results-sub">"{clientQuery}" didn't match any client.</div>
                  <div className="topbar-client-drop__no-results-actions">
                    <button
                      className="topbar-client-drop__no-results-btn topbar-client-drop__no-results-btn--dark"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const q = clientQuery.trim();
                        const isPhone = /^\d{7,}$/.test(q.replace(/[^\d]/g, ""));
                        closeSearch();
                        onNewAppointmentForClient?.({ id: "", name: isPhone ? "" : q, phone: isPhone ? q : "" });
                      }}
                    >
                      + Add Appointment
                    </button>
                    <button
                      className="topbar-client-drop__no-results-btn topbar-client-drop__no-results-btn--outline"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const q = clientQuery.trim();
                        const isPhone = /^\d{7,}$/.test(q.replace(/[^\d]/g, ""));
                        closeSearch();
                        navTo("/dashboard/clients/add", {
                          state: isPhone ? { prefillPhone: q } : { prefillName: q },
                        });
                      }}
                    >
                      + Add Client
                    </button>
                  </div>
                </div>
              )}
            </div>,
            document.body,
          )}
        </div>

        {/* Spacer */}
        <div className="topbar__spacer" />

        {/* Staff filter */}
        <button
          ref={staffDropBtnRef}
          className={`topbar__staff-btn${selectedStaffIds.length > 0 ? " topbar__staff-btn--active" : ""}`}
          onMouseDown={(e) => { e.stopPropagation(); openStaffDrop(); }}
        >
          {selectedStaffColor && (
            <span className="topbar__staff-dot" style={{ background: selectedStaffColor }} />
          )}
          {selectedStaffName}
          <span className="topbar__arrow">▼</span>
        </button>

        {/* Refresh */}
        <button
          className={`topbar__refresh-btn${isRefreshing ? " topbar__refresh-btn--busy" : ""}`}
          onClick={async () => {
            if (!onRefresh || isRefreshing) return;
            setIsRefreshing(true);
            try { await onRefresh(); } finally { setIsRefreshing(false); }
          }}
          title="Refresh calendar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14" height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`topbar__refresh-icon${isRefreshing ? " topbar__refresh-icon--spinning" : ""}`}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        {/* Interval pills */}
        <div className="topbar__interval-group">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`topbar__interval-btn${interval === opt ? " topbar__interval-btn--active" : ""}`}
              onClick={() => setInterval(opt)}
            >
              {opt.replace(" Mins", "m")}
            </button>
          ))}
        </div>

        {/* Add + */}
        <button className="topbar__add-btn" onClick={onNewAppointment}>Add +</button>

        {/* Block Time */}
        <button className="topbar__block-btn" onClick={onBlockTime}>Block Time</button>
      </div>

      {/* ── View dropdown PORTAL ── */}
      {showViewDrop && ReactDOM.createPortal(
        <div ref={viewDropRef} className="topbar-drop" style={{ top: viewDropPos.top, left: viewDropPos.left }}>
          {VIEW_OPTIONS.map((v) => (
            <button
              key={v}
              className={`topbar-drop__item${viewMode === v ? " topbar-drop__item--active" : ""}`}
              onClick={() => { setViewMode(v); setShowViewDrop(false); }}
            >
              {v}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {/* ── Date picker PORTAL ── */}
      {showDatePicker && ReactDOM.createPortal(
        <div ref={datePickerRef} className="topbar-cal-portal" style={{ top: datePickerPos.top, left: datePickerPos.left }}>
          <MiniCalendar
            value={currentDate}
            onChange={(d) => { setCurrentDate(d); setShowDatePicker(false); }}
            onClose={() => setShowDatePicker(false)}
          />
        </div>,
        document.body,
      )}

      {/* ── Staff filter PORTAL ── */}
      {showStaffDrop && ReactDOM.createPortal(
        <div ref={staffDropRef} className="topbar-staff-drop" style={{ top: staffDropPos.top, left: staffDropPos.left }}>
          <button
            className={`topbar-staff-drop__item${selectedStaffIds.length === 0 ? " topbar-staff-drop__item--active" : ""}`}
            onClick={() => { setSelectedStaffIds([]); setShowStaffDrop(false); }}
          >
            All Staff
          </button>
          {/* Multi-select: clicking a staff member toggles them in/out of the
              selection without closing the dropdown, so staff can add/remove
              several at once (e.g. Ram + Amit + Priya) before dismissing it. */}
          {staffList.map((s) => {
            const checked = selectedStaffIds.includes(s.id);
            return (
              <button
                key={s.id}
                className={`topbar-staff-drop__item${checked ? " topbar-staff-drop__item--active" : ""}`}
                onClick={() => toggleStaffSelection(s.id)}
              >
                <span className="topbar-staff-drop__checkbox" aria-hidden="true">{checked ? "☑" : "☐"}</span>
                <span className="topbar-staff-drop__dot" style={{ background: s.color }} />
                {s.name}
              </button>
            );
          })}
        </div>,
        document.body,
      )}

      {/* Portaled to document.body like the dropdowns above — this component
          is deep inside the Calendar's DOM tree, which has ancestor elements
          using CSS transforms (drag/scroll). Without a portal, the modal's
          position:fixed overlay gets scoped to that ancestor's box instead of
          the true viewport, making it appear to start below the dashboard's
          global header instead of covering the whole screen. */}
      {historyClientId && ReactDOM.createPortal(
        <ClientHistoryModal
          clientId={historyClientId}
          onClose={() => {
            setHistoryClientId(null);
            // Bring the still-loaded results straight back so staff can pick
            // (or view another) without retyping the search.
            if (clientQuery.trim().length >= 3 && clientResults.length > 0) setShowClientDrop(true);
          }}
        />,
        document.body,
      )}
    </>
  );
};

export default TopBar;
