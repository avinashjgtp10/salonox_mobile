import { useCallback, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { createBookingThunk, updateBookingThunk, deleteBookingThunk } from "../../../middleware/booking/booking.thunk";
import {
  addBooking, updateBooking as updateBookingAction,
  deleteBooking as deleteBookingAction, replaceBookingId,
} from "../../../store/schedulerSlice";
import { toApiStaffId, isRealId } from "../utils/paymentUtils";
import type { Booking, ServiceItem, PackageItem, ProductItem, MembershipItem } from "../types";
import api from "../../../services/api/axios";

interface SavePayload {
  booking: Partial<Booking>;
  serviceRows: ServiceItem[];
  packageRows: PackageItem[];
  productRows: ProductItem[];
  membershipRows: MembershipItem[];
  calDate: string;
  defaultTime?: string;
  notes?: string;
  staffAlert?: string;
  salonId?: string;
  clientId?: string | null;
  existingBooking?: Booking | null;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function buildServiceApiItems(services: ServiceItem[], bookingStartMs: number, bookingStartMins: number) {
  return services
    .filter((s) => s.service.trim())
    .map((s) => {
      const svcLocal = s.time || "10:00";
      const [svH, svM] = svcLocal.split(":").map(Number);
      const svcOffsetMs = ((svH * 60 + svM) - bookingStartMins) * 60000;
      const svcStartMs = bookingStartMs + svcOffsetMs;
      // For existing services (have service_id from DB): id = appointment-service row id
      // For new services (no service_id from DB): id field holds service type id → don't send as row id
      const hasDbServiceId = !!(s as any).service_id;
      const svcTypeId      = (s as any).service_id || s.id || undefined;
      const svcRowId       = hasDbServiceId ? ((s as any).id || undefined) : undefined;
      const price          = parseFloat(String((s as any).price ?? 0)) || 0;
      const qty            = Number((s as any).qty ?? (s as any).quantity ?? 1) || 1;
      const total          = parseFloat(String((s as any).total ?? (s as any).price ?? 0)) || price * qty;
      return {
        ...(svcRowId ? { id: svcRowId } : {}),
        service_id: svcTypeId,
        name: s.service,
        staff_id: toApiStaffId(s.staffId),
        start_time: new Date(svcStartMs).toISOString(),
        end_time: new Date(svcStartMs + (s.duration || 30) * 60000).toISOString(),
        price,
        qty,
        total,
        duration: s.duration || 30,
      };
    });
}

/**
 * Handles create/update/delete booking API calls with optimistic Redux updates.
 * Returns { save, remove, isSaving, error }.
 */
export function useAppointment() {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector((s: any) => s.scheduler?.staffList ?? []);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const pendingTempIdRef        = useRef<string | null>(null);
  const [apiAppointmentId, setApiAppointmentId] = useState<string | null>(null);

  // ── Create or update a booking ────────────────────────────────────────────
  const save = useCallback(async (payload: SavePayload): Promise<string | null> => {
    const {
      booking, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, clientId, existingBooking,
    } = payload;

    setIsSaving(true);
    setError(null);

    try {
      const firstRow   = serviceRows[0];
      const startTime  = firstRow?.time || defaultTime || "10:00";
      const bookingStartMs   = new Date(`${calDate}T${startTime}:00`).getTime();
      const [stH, stM]       = startTime.split(":").map(Number);
      const bookingStartMins = stH * 60 + stM;

      // Compute endTime from last service
      const lastRow   = serviceRows[serviceRows.length - 1] ?? firstRow;
      const lastStart = lastRow?.time || startTime;
      const endTime   = addMinutes(lastStart, lastRow?.duration || 30);

      const [eh, em] = endTime.split(":").map(Number);
      const [sh, sm] = startTime.split(":").map(Number);
      const durationMins = Math.max(5, (eh * 60 + em) - (sh * 60 + sm));

      const apiServices = buildServiceApiItems(serviceRows, bookingStartMs, bookingStartMins);

      const baseData = {
        salon_id:         salonId || undefined,
        client_id:   (clientId && isRealId(clientId) && clientId !== 'walk-in') ? clientId : undefined,
        staff_id:         toApiStaffId(firstRow?.staffId ?? (booking as any).staffId) ?? toApiStaffId(staffList[0]?.id),
        scheduled_at:     new Date(bookingStartMs).toISOString(),
        ends_at:          new Date(bookingStartMs + durationMins * 60000).toISOString(),
        duration_minutes: durationMins,
        services:         apiServices,
        package_items:    packageRows.map((p) => ({
          package_id: (p as any).packageId || p.id || undefined,
          name: (p as any).packageName || (p as any).name || "",
          price: p.price || 0,
          quantity: p.qty || 1,
        })),
        product_items:    productRows.map((p) => ({
          product_id: (p as any).productId || p.id || undefined,
          name: (p as any).productName || (p as any).name || "",
          price: p.price || 0,
          quantity: p.qty || 1,
        })),
        membership_items: membershipRows.map((m) => ({
          membership_id: (m as any).membershipId || m.id || undefined,
          name: (m as any).membershipName || (m as any).name || "",
          price: m.price || 0,
          quantity: m.qty || 1,
        })),
        notes:       notes || undefined,
        staff_alert: staffAlert || undefined,
        title:       (booking as any).title,
      };

      if (existingBooking) {
        // Optimistic update
        dispatch(updateBookingAction({ ...existingBooking, ...booking } as any));
        const prev = existingBooking;
        const action: any = await dispatch(updateBookingThunk({ id: existingBooking.id, data: baseData }));
        if (updateBookingThunk.rejected.match(action)) {
          dispatch(updateBookingAction(prev as any)); // rollback
          const msg = (action.payload as string) || "Failed to update appointment";
          setError(msg);
          return null;
        }
        return String(existingBooking.id);
      } else {
        // Optimistic add with temp id
        const tempId = `temp-${Date.now()}`;
        const optimistic = { ...booking, id: tempId, date: calDate, startTime, endTime } as Booking;
        dispatch(addBooking(optimistic));
        pendingTempIdRef.current = tempId;

        const action: any = await dispatch(createBookingThunk({ ...baseData, status: "booked" }));
        if (createBookingThunk.rejected.match(action)) {
          dispatch(deleteBookingAction(tempId));
          const msg = (action.payload as string) || "Failed to create appointment";
          setError(msg);
          return null;
        }

        const realId = String(action.payload?.data?.id ?? action.payload?.id ?? "");
        if (realId && realId !== tempId) {
          dispatch(replaceBookingId({ localId: tempId, realId }));
          setApiAppointmentId(realId);
          return realId;
        }
        return tempId;
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [dispatch, staffList]);

  // ── Delete a booking ──────────────────────────────────────────────────────
  const remove = useCallback(async (id: string): Promise<boolean> => {
    dispatch(deleteBookingAction(id));
    try {
      await dispatch(deleteBookingThunk(id));
      return true;
    } catch {
      return false;
    }
  }, [dispatch]);

  // ── Create a new client if needed ─────────────────────────────────────────
  const ensureClient = useCallback(async (params: {
    name: string; lastName: string; phone: string; gender: string; salonId?: string;
  }): Promise<string | undefined> => {
    if (!params.name && !params.phone) return undefined;
    try {
      const res = await api.post("/api/v1/clients", {
        salon_id:   params.salonId,
        first_name: params.name,
        last_name:  params.lastName,
        phone:      params.phone,
        gender:     params.gender,
      });
      return String(res.data?.data?.id ?? res.data?.id ?? "");
    } catch { return undefined; }
  }, []);

  return { save, remove, ensureClient, isSaving, error, setError, apiAppointmentId };
}