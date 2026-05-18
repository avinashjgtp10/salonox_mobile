import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Booking, BlockedTime } from "../../types/scheduler-types";
import { useAppDispatch, useAppSelector } from "../../../../hooks/useAppRedux";
import { fetchBookingByIdThunk } from "../../../../middleware/booking/booking.thunk";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { useSchedulerInit, mapApiBooking } from "../../hooks/useSchedulerInit";
import TopBar from "./TopBar";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import ListWeekView from "./ListWeekView";
import NewAppointmentModal from "../modals/NewAppointmentModal";
import ViewBillModal from "../modals/ViewBillModal";
import PaymentModal from "../modals/PaymentModal";
import BlockTimeModal from "../modals/BlockTimeModal";
import SettingsModal from "../modals/SettingsModal";

const SchedulerContent: React.FC = () => {
  useSchedulerInit();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { viewMode, setViewMode, setCurrentDate } = useSchedulerContext();
  const apiServices = useAppSelector((s: any) => s.services?.items ?? []);

  const apiStaff = useAppSelector((s: any) => s.staff?.items ?? []);

  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [collectDueMode, setCollectDueMode] = useState(false);
  const [apptDefaults, setApptDefaults] = useState<{ staffId?: string; defaultTime?: string }>({});
  const [blockStaffId, setBlockStaffId] = useState<string | undefined>(undefined);
  const [editingBlockTime, setEditingBlockTime] = useState<BlockedTime | undefined>(undefined);

  // Auto-open appointment for editing when navigated from Reports page
  useEffect(() => {
    const appointmentId = (location.state as any)?.openAppointmentId;
    if (!appointmentId) return;
    // Clear the state so refreshing doesn't re-open
    navigate(location.pathname, { replace: true, state: {} });
    (async () => {
      try {
        const action = await (dispatch(fetchBookingByIdThunk(appointmentId)) as any);
        if (fetchBookingByIdThunk.fulfilled.match(action)) {
          const enriched = mapApiBooking(action.payload, apiServices, apiStaff);
          setEditingBooking(enriched);
          setShowNewAppt(true);
        }
      } catch { /* ignore */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSlotClick(staffId: string, time: string) {
    setApptDefaults({ staffId, defaultTime: time });
    setEditingBooking(null);
    setShowNewAppt(true);
  }

  /**
   * For bookings that came from the API (non-temp ID), fetch the full record
   * so the edit modal gets service line items and all details.
   * Falls back to the cached local booking if the API call fails.
   */
  async function handleEditBooking(booking: Booking) {
    const isApiBooking = !String(booking.id).startsWith("b_");
    if (isApiBooking) {
      try {
        const action = await (dispatch(fetchBookingByIdThunk(booking.id)) as any);
        if (fetchBookingByIdThunk.fulfilled.match(action)) {
          const enriched = mapApiBooking(action.payload, apiServices, apiStaff);
          // Merge: use enriched services/details but keep any local edits already in state
          setEditingBooking({
            ...booking,
            ...enriched,
            // Prefer the enriched services array if the backend returned any
            services: enriched.services.length ? enriched.services : booking.services,
            // Always trust local Redux paymentStatus — API may not have the column yet
            paymentStatus: booking.paymentStatus,
          });
          setShowNewAppt(true);
          return;
        }
      } catch {
        // fall through — use cached booking
      }
    }
    setEditingBooking(booking);
    setShowNewAppt(true);
  }

  function handlePaymentBooking(booking: Booking) {
    setPaymentBooking(booking);
  }

  function handleCollectDue(booking: Booking) {
    // Open PaymentModal in collect-due mode with the original booking intact
    setPaymentBooking(booking);
    setCollectDueMode(true);
  }

  function handleBlockTime(staffId?: string) {
    setBlockStaffId(staffId);
    setEditingBlockTime(undefined);
    setShowBlockTime(true);
  }

  function handleEditBlockTime(block: BlockedTime) {
    setEditingBlockTime(block);
    setBlockStaffId(undefined);
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
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{ flexShrink: 0, width: "100%", overflow: "hidden", position: "relative", zIndex: 30 }}>
        <TopBar
          onNewAppointment={() => { setEditingBooking(null); setApptDefaults({}); setShowNewAppt(true); }}
          onBlockTime={() => handleBlockTime()}
          onSettings={() => setShowSettings(true)}
        />
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
        overflowY: viewMode === "Month" || viewMode === "List Week" ? "auto" : "hidden",
        overflowX: "hidden",
      }}>
        {viewMode === "Day" && (
          <DayView
            onSlotClick={handleSlotClick}
            onViewBill={setViewingBooking}
            onEditBooking={handleEditBooking}
            onPaymentBooking={handlePaymentBooking}
            onBlockTime={(staffId: string) => handleBlockTime(staffId)}
            onEditBlockTime={handleEditBlockTime}
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
        <BlockTimeModal
          onClose={() => { setShowBlockTime(false); setEditingBlockTime(undefined); }}
          defaultStaffId={blockStaffId}
          editingBlock={editingBlockTime}
        />
      )}
      {viewingBooking && (
        <ViewBillModal
          booking={viewingBooking}
          onClose={() => setViewingBooking(null)}
          onEdit={(b) => { setViewingBooking(null); handleEditBooking(b); }}
          onCollectDue={handleCollectDue}
        />
      )}
      {paymentBooking && (
        <PaymentModal
          booking={paymentBooking}
          collectDue={collectDueMode}
          onClose={() => { setPaymentBooking(null); setCollectDueMode(false); }}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

const Scheduler: React.FC = () => <SchedulerContent />;
export default Scheduler;
