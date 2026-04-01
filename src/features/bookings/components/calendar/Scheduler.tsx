import React, { useState } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TopBar from "./TopBar";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import ListWeekView from "./ListWeekView";
import NewAppointmentModal from "../modals/NewAppointmentModal";
import ViewBillModal from "../modals/ViewBillModal";
import BlockTimeModal from "../modals/BlockTimeModal";
import SettingsModal from "../modals/SettingsModal";

const SchedulerContent: React.FC = () => {
  const { viewMode, setViewMode, setCurrentDate } = useSchedulerContext();

  const [showNewAppt,    setShowNewAppt]    = useState(false);
  const [showBlockTime,  setShowBlockTime]  = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [apptDefaults,   setApptDefaults]   = useState<{ staffId?: string; defaultTime?: string }>({});
  const [blockStaffId,   setBlockStaffId]   = useState<string | undefined>(undefined);

  function handleSlotClick(staffId: string, time: string) {
    setApptDefaults({ staffId, defaultTime: time });
    setEditingBooking(null);
    setShowNewAppt(true);
  }

  function handleEditBooking(booking: Booking) {
    setEditingBooking(booking);
    setShowNewAppt(true);
  }

  function handleBlockTime(staffId?: string) {
    setBlockStaffId(staffId);
    setShowBlockTime(true);
  }

  function handleDayClick(date: string) {
    setCurrentDate(date);
    setViewMode("Day");
  }

  function handleCloseAppt() {
    setShowNewAppt(false);
    setEditingBooking(null);
    setApptDefaults({});
  }

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      background: "#f8fafc",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",   /* ← outer wrapper NEVER scrolls */
      position: "relative",
    }}>

      {/* TopBar is FIXED at the top — never moves when grid scrolls */}
      <div style={{
        flexShrink: 0,          /* never shrinks */
        width: "100%",          /* always full viewport width */
        overflow: "hidden",     /* clips anything that tries to overflow */
        position: "relative",
        zIndex: 30,
      }}>
        <TopBar
          onNewAppointment={() => { setEditingBooking(null); setApptDefaults({}); setShowNewAppt(true); }}
          onBlockTime={() => handleBlockTime()}
          onSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Calendar area — this is the ONLY thing that scrolls horizontally */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        /* Month and List Week scroll vertically, others are managed internally */
        overflowY: viewMode === "Month" || viewMode === "List Week" ? "auto" : "hidden",
        overflowX: "hidden",   /* ← horizontal scroll stays INSIDE DayView/WeekView only */
      }}>
        {viewMode === "Day" && (
          <DayView
            onSlotClick={handleSlotClick}
            onViewBill={setViewingBooking}
            onEditBooking={handleEditBooking}
            onBlockTime={(staffId: string) => handleBlockTime(staffId)}
          />
        )}
        {viewMode === "Week" && (
          <WeekView onSlotClick={handleSlotClick} onViewBill={setViewingBooking} />
        )}
        {viewMode === "Month" && (
          <MonthView onDayClick={handleDayClick} onViewBill={setViewingBooking} />
        )}
        {viewMode === "List Week" && (
          <ListWeekView onViewBill={setViewingBooking} />
        )}
      </div>

      {showNewAppt && (
        <NewAppointmentModal
          onClose={handleCloseAppt}
          defaultStaffId={apptDefaults.staffId}
          defaultTime={apptDefaults.defaultTime}
          existingBooking={editingBooking || undefined}
        />
      )}
      {showBlockTime && (
        <BlockTimeModal onClose={() => setShowBlockTime(false)} defaultStaffId={blockStaffId} />
      )}
      {viewingBooking && (
        <ViewBillModal booking={viewingBooking} onClose={() => setViewingBooking(null)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

const Scheduler: React.FC = () => {
  return <SchedulerContent />;
};

export default Scheduler;