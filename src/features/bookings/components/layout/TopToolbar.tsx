import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import type { ViewMode, IntervalOption } from "../../types/booking.types.ts";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatDateLabel } from "../../utils/timeUtils";
import { DatePickerPanel } from "../../../../components/ui";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import api from "../../../../services/api/axios";
import { formatDateDDMMYYYY } from "../../../../utils/dateFormat";
import "../../styles/TopBar.scss";

interface TopBarProps {
  onNewAppointment: () => void;
  onBlockTime: () => void;
  onSettings?: () => void;
}

interface ClientSuggestion {
  id: string;
  name: string;
  phone: string;
}

const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 65) % AVATAR_COLORS.length];
}

const VIEW_OPTIONS: ViewMode[] = ["Day", "Week", "Month", "List Week"];
const INTERVAL_OPTIONS: IntervalOption[] = ["15 Mins", "30 Mins", "60 Mins"];

const TopBarComponent: React.FC<TopBarProps> = ({ onNewAppointment, onBlockTime }) => {
  const { viewMode, setViewMode, currentDate, setCurrentDate, navigate, interval, setInterval } = useSchedulerContext();
  const navTo   = useNavigate();
  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id ?? s.auth?.user?.salon_id ?? "");

  // ── Client search ──────────────────────────────────────────────────────────
  const [clientQuery, setClientQuery]       = useState("");
  const [clientResults, setClientResults]   = useState<ClientSuggestion[]>([]);
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [clientSearching, setClientSearching] = useState(false);
  const searchRef   = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowClientDrop(false);
        setClientQuery("");
        setClientResults([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleClientSearch = useCallback((q: string) => {
    setClientQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setClientResults([]); setShowClientDrop(false); return; }
    searchTimer.current = setTimeout(async () => {
      setClientSearching(true);
      try {
        const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(q)}&salon_id=${salonId}`);
        const raw = res.data?.data ?? res.data ?? [];
        const list = (Array.isArray(raw) ? raw : raw.data ?? []).map((c: any) => ({
          id:    String(c.id),
          name:  c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—",
          phone: c.phone_number || c.phone || "",
        }));
        setClientResults(list);
        setShowClientDrop(true);
      } catch { setClientResults([]); }
      finally { setClientSearching(false); }
    }, 280);
  }, [salonId]);

  function selectClient(c: ClientSuggestion) {
    setClientQuery("");
    setClientResults([]);
    setShowClientDrop(false);
    navTo("/dashboard/clients/history", { state: { openClientId: c.id } });
  }

  // ── View / date pickers ───────────────────────────────────────────────────
  const [showViewDrop, setShowViewDrop] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewDropPos, setViewDropPos] = useState({ top: 0, left: 0 });
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });

  const viewDropBtnRef = useRef<HTMLButtonElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const viewDropRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (viewDropRef.current && !viewDropRef.current.contains(target) && viewDropBtnRef.current && !viewDropBtnRef.current.contains(target))
        setShowViewDrop(false);
      if (datePickerRef.current && !datePickerRef.current.contains(target) && dateBtnRef.current && !dateBtnRef.current.contains(target))
        setShowDatePicker(false);
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
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [showViewDrop, showDatePicker]);

  const shortDateLabel = useMemo(() => {
    if (viewMode === "Day") {
      return formatDateDDMMYYYY(new Date(currentDate + "T12:00:00"));
    }
    return formatDateLabel(currentDate, viewMode);
  }, [currentDate, viewMode]);

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

  return (
    <>
      <div className="topbar">
        <button ref={viewDropBtnRef} className="topbar__view-btn" onMouseDown={(e) => { e.stopPropagation(); openViewDrop(); }}>
          {viewMode} <span className="topbar__arrow">▼</span>
        </button>

        <button className="topbar__nav-btn" onClick={() => navigate(-1)}>‹</button>

        <button
          ref={dateBtnRef}
          className={`topbar__date-btn${showDatePicker ? " topbar__date-btn--active" : ""}`}
          onMouseDown={(e) => { e.stopPropagation(); openDatePicker(); }}
        >
          {shortDateLabel} <span className="topbar__arrow topbar__arrow--faint">▼</span>
        </button>

        <button className="topbar__nav-btn" onClick={() => navigate(1)}>›</button>

        <button
          className={`topbar__today-btn${isToday ? " topbar__today-btn--current" : ""}`}
          onClick={() => setCurrentDate(today)}
        >
          Today
        </button>

        {/* ── Client search ── */}
        <div className="topbar__client-search" ref={searchRef}>
          <div className="topbar__client-search-input-wrap">
            <span className="topbar__client-search-icon">🔍</span>
            <input
              className="topbar__client-search-input"
              placeholder="Search client…"
              value={clientQuery}
              onChange={(e) => handleClientSearch(e.target.value)}
              onFocus={() => { if (clientResults.length) setShowClientDrop(true); }}
            />
            {clientSearching && <span className="topbar__client-search-spinner" />}
          </div>

          {showClientDrop && clientResults.length > 0 && ReactDOM.createPortal(
            <div
              className="topbar__client-drop"
              style={(() => {
                const r = searchRef.current?.getBoundingClientRect();
                return r ? { top: r.bottom + 4, left: r.left, width: r.width } : {};
              })()}
            >
              {clientResults.map((c) => (
                <button
                  key={c.id}
                  className="topbar__client-drop-item"
                  onMouseDown={(e) => { e.preventDefault(); selectClient(c); }}
                >
                  <span
                    className="topbar__client-avatar"
                    style={{ background: avatarColor(c.name) }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="topbar__client-info">
                    <span className="topbar__client-name">{c.name}</span>
                    {c.phone && <span className="topbar__client-phone">{c.phone}</span>}
                  </span>
                </button>
              ))}
            </div>,
            document.body,
          )}
        </div>

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

        <button className="topbar__add-btn" onClick={onNewAppointment}>Add +</button>

        <button className="topbar__block-btn" onClick={onBlockTime}>Block Time</button>
      </div>

      {/* View dropdown portal */}
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

      {/* Date picker portal */}
      {showDatePicker && ReactDOM.createPortal(
        <div ref={datePickerRef} className="topbar-cal-portal" style={{ top: datePickerPos.top, left: datePickerPos.left }}>
          <DatePickerPanel
            value={currentDate}
            onChange={(d) => { setCurrentDate(d); setShowDatePicker(false); }}
            onClose={() => setShowDatePicker(false)}
            />
        </div>,
        document.body,
      )}
    </>
  );
};

const TopBar = React.memo(TopBarComponent);
export default TopBar;