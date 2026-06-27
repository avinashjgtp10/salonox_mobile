import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import type { ViewMode, IntervalOption } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatDateLabel } from "../../utils/timeUtils";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import api from "../../../../services/api/axios";

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
function avatarColor(name: string) { return AVATAR_COLORS[(name?.charCodeAt(0) || 65) % AVATAR_COLORS.length]; }

interface TopBarProps {
  onNewAppointment: () => void;
  onBlockTime: () => void;
  onRefresh?: () => void;
}

const VIEW_OPTIONS: ViewMode[] = ["Day", "Week", "Month", "List Week"];
const INTERVAL_OPTIONS: IntervalOption[] = ["15 Mins", "30 Mins", "60 Mins"];

const TopBar: React.FC<TopBarProps> = ({ onNewAppointment, onBlockTime, onRefresh }) => {
  const {
    viewMode, setViewMode, currentDate, setCurrentDate,
    navigate, interval, setInterval, staffList, selectedStaffId, setSelectedStaffId,
  } = useSchedulerContext();
  const navTo   = useNavigate();
  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id ?? s.auth?.user?.salon_id ?? "");

  // ── Client search ──────────────────────────────────────────────────────────
  const [clientQuery, setClientQuery]       = useState("");
  const [clientResults, setClientResults]   = useState<{ id: string; name: string; phone: string }[]>([]);
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [clientSearching, setClientSearching] = useState(false);
  const searchRef   = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowClientDrop(false);
        setClientQuery("");
        setClientResults([]);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleClientSearch = useCallback((q: string) => {
    setClientQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setClientResults([]); setShowClientDrop(false); return; }
    searchTimer.current = setTimeout(async () => {
      setClientSearching(true);
      try {
        const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(q)}&salon_id=${salonId}`);
        const raw: any[] = res.data?.data ?? res.data ?? [];
        const list = (Array.isArray(raw) ? raw : (raw as any).data ?? []).map((c: any) => ({
          id: String(c.id),
          name: c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—",
          phone: c.phone_number || c.phone || "",
        }));
        setClientResults(list);
        setShowClientDrop(list.length > 0);
      } catch { setClientResults([]); }
      finally { setClientSearching(false); }
    }, 280);
  }, [salonId]);

  function selectClient(c: { id: string; name: string }) {
    setClientQuery(""); setClientResults([]); setShowClientDrop(false);
    navTo("/dashboard/clients/history", { state: { openClientId: c.id } });
  }

  const [showViewDrop, setShowViewDrop] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Portal position state ─────────────────────────────────────────────────
  const [viewDropPos, setViewDropPos] = useState({ top: 0, left: 0 });
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });
  const [staffDropPos, setStaffDropPos] = useState({ top: 0, left: 0 });

  const viewDropBtnRef = useRef<HTMLButtonElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const viewDropRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const staffDropBtnRef = useRef<HTMLButtonElement>(null);
  const staffDropRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        viewDropRef.current &&
        !viewDropRef.current.contains(target) &&
        viewDropBtnRef.current &&
        !viewDropBtnRef.current.contains(target)
      )
        setShowViewDrop(false);
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(target) &&
        dateBtnRef.current &&
        !dateBtnRef.current.contains(target)
      )
        setShowDatePicker(false);
      if (
        staffDropRef.current &&
        !staffDropRef.current.contains(target) &&
        staffDropBtnRef.current &&
        !staffDropBtnRef.current.contains(target)
      )
        setShowStaffDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Recalculate portal positions on scroll/resize ─────────────────────────
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
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [showViewDrop, showDatePicker]);

  function getShortDateLabel() {
    if (viewMode === "Day") {
      return new Date(currentDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
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

  const selectedStaffName = selectedStaffId
    ? (staffList.find((s) => s.id === selectedStaffId)?.name ?? "Staff")
    : "All Staff";

  return (
    <>
      {/* ── TopBar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          height: 48,
          flexShrink: 0,
        }}
      >
        {/* View dropdown trigger */}
        <button
          ref={viewDropBtnRef}
          onMouseDown={(e) => {
            e.stopPropagation();
            openViewDrop();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "5px 9px",
            background: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            flexShrink: 0,
            color: "#374151",
          }}
        >
          {viewMode} <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
        </button>

        {/* Prev */}
        <button
          onClick={() => navigate(-1)}
          style={{
            flexShrink: 0,
            background: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
            color: "#374151",
          }}
        >
          ‹
        </button>

        {/* Date picker trigger */}
        <button
          ref={dateBtnRef}
          onMouseDown={(e) => {
            e.stopPropagation();
            openDatePicker();
          }}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#111827",
            textAlign: "center",
            background: showDatePicker ? "#f3f4f6" : "none",
            border: "1px solid " + (showDatePicker ? "#d1d5db" : "transparent"),
            borderRadius: 6,
            padding: "5px 8px",
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {getShortDateLabel()}{" "}
          <span style={{ fontSize: 9, opacity: 0.5 }}>▼</span>
        </button>

        {/* Next */}
        <button
          onClick={() => navigate(1)}
          style={{
            flexShrink: 0,
            background: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
            color: "#374151",
          }}
        >
          ›
        </button>

        {/* Today */}
        <button
          onClick={() => setCurrentDate(today)}
          style={{
            flexShrink: 0,
            border: isToday ? "1px solid #e5e7eb" : "1px solid #3b82f6",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            background: isToday ? "#f9fafb" : "#eff6ff",
            color: isToday ? "#9ca3af" : "#3b82f6",
            transition: "all 0.15s",
          }}
        >
          Today
        </button>

        {/* ── Client search ── */}
        <div ref={searchRef} style={{ width: 240, flexShrink: 0, position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 20,
            padding: "5px 10px", transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 12, opacity: 0.45, flexShrink: 0 }}>🔍</span>
            <input
              value={clientQuery}
              onChange={(e) => handleClientSearch(e.target.value)}
              onFocus={() => { if (clientResults.length) setShowClientDrop(true); }}
              placeholder="Search client…"
              style={{
                flex: 1, minWidth: 0, border: "none", background: "transparent",
                fontSize: 12, fontFamily: "inherit", color: "#111827", outline: "none",
              }}
            />
            {clientSearching && (
              <span style={{
                width: 11, height: 11, borderRadius: "50%", flexShrink: 0,
                border: "2px solid #d1d5db", borderTopColor: "#6366f1",
                animation: "topbar-spin 0.7s linear infinite", display: "inline-block",
              }} />
            )}
          </div>

          {showClientDrop && clientResults.length > 0 && ReactDOM.createPortal(
            <div
              style={{
                position: "fixed",
                top: (searchRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                left: searchRef.current?.getBoundingClientRect().left ?? 0,
                width: searchRef.current?.getBoundingClientRect().width ?? 260,
                zIndex: 99999,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                overflow: "hidden",
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {clientResults.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={(e) => { e.preventDefault(); selectClient(c); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "9px 12px",
                    border: "none", background: "#fff",
                    cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: avatarColor(c.name), color: "#fff",
                    fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </span>
                    {c.phone && <span style={{ fontSize: 11, color: "#6b7280" }}>{c.phone}</span>}
                  </span>
                </button>
              ))}
            </div>,
            document.body,
          )}
        </div>

        {/* Spacer — keeps right-side controls right-aligned */}
        <div style={{ flex: 1, minWidth: 0 }} />

        {/* Staff filter */}
        <button
          ref={staffDropBtnRef}
          onMouseDown={(e) => { e.stopPropagation(); openStaffDrop(); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            border: "1px solid #d1d5db", borderRadius: 6,
            padding: "5px 10px", background: selectedStaffId ? "#eff6ff" : "#fff",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
            fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
            color: selectedStaffId ? "#3b82f6" : "#374151",
          }}
        >
          {selectedStaffId && (
            <span style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: staffList.find((s) => s.id === selectedStaffId)?.color ?? "#4f46e5",
            }} />
          )}
          {selectedStaffName}
          <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
        </button>

        {/* Refresh */}
        <button
          onClick={async () => {
            if (!onRefresh || isRefreshing) return;
            setIsRefreshing(true);
            try { await onRefresh(); } finally { setIsRefreshing(false); }
          }}
          title="Refresh calendar"
          style={{
            flexShrink: 0,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "5px 8px",
            background: "#fff",
            cursor: onRefresh ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#374151",
            opacity: isRefreshing ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "block", transition: "transform 0.4s", transform: isRefreshing ? "rotate(360deg)" : "none" }}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        {/* Interval pills */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "#f3f4f6",
            borderRadius: 6,
            padding: 3,
            flexShrink: 0,
          }}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit",
                background: interval === opt ? "#1f2937" : "transparent",
                color: interval === opt ? "#fff" : "#6b7280",
                whiteSpace: "nowrap",
              }}
            >
              {opt.replace(" Mins", "m")}
            </button>
          ))}
        </div>

        {/* Add + */}
        <button
          onClick={onNewAppointment}
          style={{
            flexShrink: 0,
            background: "#1f2937",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          Add +
        </button>

        {/* Block Time */}
        <button
          onClick={onBlockTime}
          style={{
            flexShrink: 0,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: 11,
            cursor: "pointer",
            background: "#fff",
            fontWeight: 500,
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          Block Time
        </button>
      </div>

      {/* ── View dropdown PORTAL ── */}
      {showViewDrop &&
        ReactDOM.createPortal(
          <div
            ref={viewDropRef}
            style={{
              position: "fixed",
              top: viewDropPos.top,
              left: viewDropPos.left,
              zIndex: 99999,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,.12)",
              minWidth: 140,
              overflow: "hidden",
            }}
          >
            {VIEW_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  setViewMode(v);
                  setShowViewDrop(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "9px 14px",
                  width: "100%",
                  background: viewMode === v ? "#f3f4f6" : "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  fontWeight: viewMode === v ? 600 : 400,
                  fontFamily: "inherit",
                }}
              >
                {v}
              </button>
            ))}
          </div>,
          document.body,
        )}

      {/* ── Date picker PORTAL ── */}
      {showDatePicker &&
        ReactDOM.createPortal(
          <div
            ref={datePickerRef}
            style={{
              position: "fixed",
              top: datePickerPos.top,
              left: datePickerPos.left,
              zIndex: 99999,
            }}
          >
            <MiniCalendar
              value={currentDate}
              onChange={(d) => {
                setCurrentDate(d);
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
            />
          </div>,
          document.body,
        )}

      {/* Spinner keyframe */}
      <style>{`@keyframes topbar-spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Staff filter PORTAL ── */}
      {showStaffDrop &&
        ReactDOM.createPortal(
          <div
            ref={staffDropRef}
            style={{
              position: "fixed",
              top: staffDropPos.top,
              left: staffDropPos.left,
              zIndex: 99999,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,.12)",
              minWidth: 160,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => { setSelectedStaffId(null); setShowStaffDrop(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 14px", width: "100%",
                background: !selectedStaffId ? "#f3f4f6" : "#fff",
                border: "none", cursor: "pointer", fontSize: 13,
                textAlign: "left", fontWeight: !selectedStaffId ? 600 : 400,
                fontFamily: "inherit",
              }}
            >
              All Staff
            </button>
            {staffList.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedStaffId(s.id); setShowStaffDrop(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 14px", width: "100%",
                  background: selectedStaffId === s.id ? "#f3f4f6" : "#fff",
                  border: "none", cursor: "pointer", fontSize: 13,
                  textAlign: "left", fontWeight: selectedStaffId === s.id ? 600 : 400,
                  fontFamily: "inherit",
                }}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: s.color, flexShrink: 0,
                }} />
                {s.name}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

export default TopBar;
