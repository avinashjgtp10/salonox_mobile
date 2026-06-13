import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import { fetchBookingsThunk } from "../../../middleware/booking/booking.thunk";
import { useListPackagesQuery } from "../../../services/api/endpoints/packages.endpoints";
import {
  setBookings,
  setStaffList,
  setClientsList,
  setServicesList,
  setPackagesList,
  setMembershipsList,
  setProductsList,
  setStaffSchedules,
} from "../../../store/schedulerSlice";
import type { StaffDaySchedule } from "../../../store/schedulerSlice";
import type { Staff, Client, Booking, ServiceItem } from "../types/scheduler-types";

const STAFF_COLORS = [
  "#4f46e5", "#0891b2", "#be185d", "#059669",
  "#d97706", "#7c3aed", "#dc2626", "#0d9488",
  "#b45309", "#0f766e", "#9333ea", "#0369a1",
];

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] || "").join("").toUpperCase().slice(0, 2) || "--";
}

function padTime(n: number): string {
  return String(n).padStart(2, "0");
}

function isoToLocalParts(iso: string): { date: string; hh: string; mm: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`,
    hh: padTime(d.getHours()),
    mm: padTime(d.getMinutes()),
  };
}

/** Maps backend status strings → UI BookingStatus */
function mapBackendStatus(s: string): "Confirmed" | "Pending" | "Cancelled" {
  const lower = (s || "").toLowerCase();
  if (["confirmed", "booked", "in_progress", "completed"].includes(lower)) return "Confirmed";
  if (["cancelled", "no_show"].includes(lower)) return "Cancelled";
  return "Pending";
}

/**
 * Converts a raw backend appointment object → scheduler Booking.
 * Exported so Scheduler.tsx can enrich individual bookings fetched by ID.
 * rawServices: the raw API services array (s.services.items from Redux)
 */
export function mapApiBooking(item: any, rawServices: any[] = [], rawStaff: any[] = []): Booking {
  // ── Time extraction ──────────────────────────────────────────────────────────
  const { date, hh, mm } = isoToLocalParts(item.scheduled_at);
  let endHH = hh;
  let endMM = mm;
  if (item.ends_at) {
    const ep = isoToLocalParts(item.ends_at);
    endHH = ep.hh;
    endMM = ep.mm;
  } else {
    const endMs = new Date(item.scheduled_at).getTime() + (item.duration_minutes || 30) * 60000;
    const ep = isoToLocalParts(new Date(endMs).toISOString());
    endHH = ep.hh;
    endMM = ep.mm;
  }

  // ── Services mapping ─────────────────────────────────────────────────────────
  let services: ServiceItem[] = [];

  if (Array.isArray(item.services) && item.services.length > 0) {
    // Backend returned an embedded services array (via JOIN / include)
    services = item.services.map((s: any, idx: number) => {
      const svcId = String(s.id ?? s.service_id ?? idx);
      const svcLookup = rawServices.find((rs: any) => String(rs.id) === String(s.service_id ?? s.id));
      const stfId = String(s.staff_id ?? item.staff_id ?? "");
      const stfLookup = rawStaff.find((rs: any) => String(rs.id) === stfId);
      const svcName = s.name ?? s.service_name ?? (typeof s.service === "object" ? s.service?.name || s.service?.service : s.service) ?? svcLookup?.name ?? "";
      
      return {
        id: svcId,
        service: svcName,
        staff: (() => {
          const raw = s.staff_name ?? s.staff
            ?? `${stfLookup?.first_name || ""} ${stfLookup?.last_name || ""}`.trim()
            ?? stfLookup?.fullName ?? stfLookup?.full_name ?? "";
          return raw.includes(" ") ? raw : raw.replace(/([a-z])([A-Z])/g, "$1 $2");
        })(),
        staffId: stfId,
        time: s.time ?? `${hh}:${mm}`,
        price: parseFloat(String(s.price ?? 0)) || 0,
        qty: Number(s.qty ?? s.quantity ?? 1) || 1,
        total: parseFloat(String(s.total ?? s.price ?? 0)) || 0,
        duration: Number(s.duration ?? svcLookup?.duration ?? item.duration_minutes ?? 30) || 30,
      };
    });
  } else if (item.service_id) {
    // Single service_id — look up name/price from loaded services list
    const svc = rawServices.find((s: any) => String(s.id) === String(item.service_id));
    const svcName = svc?.name ?? item.service_name ?? "";
    const svcPrice = parseFloat(String(svc?.price ?? 0)) || 0;
    services = [{
      id: String(item.service_id),
      service: svcName,
      staff: "",
      staffId: String(item.staff_id ?? ""),
      time: `${hh}:${mm}`,
      price: svcPrice,
      qty: 1,
      total: svcPrice,
      duration: Number(svc?.duration ?? item.duration_minutes ?? 30) || 30,
    }];
  } else if (item.title) {
    // Use title as last-resort service name ("ClientName - ServiceName" or plain title)
    const parts = (item.title as string).split(" - ");
    const svcName = parts.length > 1 ? parts.slice(1).join(" - ").trim() : item.title;
    services = [{
      id: "",
      service: svcName,
      staff: "",
      staffId: String(item.staff_id ?? ""),
      time: `${hh}:${mm}`,
      price: 0,
      qty: 1,
      total: 0,
      duration: Number(item.duration_minutes ?? 30) || 30,
    }];
  }

  // ── Financials ───────────────────────────────────────────────────────────────
  const grandTotal = parseFloat(String(item.grand_total ?? item.total_amount ?? 0)) || 0;
  const payStatusStr = (item.payment_status ?? item.paymentStatus ?? "").toLowerCase();
  const paidAmount = Number(item.paid_amount) || 0;
  let finalPayStatus: "Paid" | "Partial" | "Unpaid" = "Unpaid";
  if (paidAmount > 0) {
    finalPayStatus = paidAmount >= grandTotal ? "Paid" : "Partial";
  } else if (payStatusStr === "paid" || payStatusStr === "completed") {
    finalPayStatus = "Paid";
  } else if (payStatusStr === "partial") {
    finalPayStatus = "Partial";
  }

  // ── Products, packages, memberships ────────────────────────────────────────
  const productItems = (item.product_items || item.productItems || item.products || []).map((p: any) => ({
    id: String(p.id ?? ""),
    productId: String(p.product_id ?? p.productId ?? ""),
    productName: p.product_name ?? p.productName ?? p.name ?? "",
    name: p.product_name ?? p.productName ?? p.name ?? "",
    price: parseFloat(String(p.price ?? 0)) || 0,
    qty: Number(p.qty ?? p.quantity ?? 1) || 1,
    total: parseFloat(String(p.total ?? p.price ?? 0)) || 0,
  }));

  const packageItems = (item.package_items || item.packageItems || item.packages || []).map((p: any) => ({
    id: String(p.id ?? ""),
    packageId: String(p.package_id ?? p.packageId ?? ""),
    packageName: p.package_name ?? p.packageName ?? p.name ?? "",
    name: p.package_name ?? p.packageName ?? p.name ?? "",
    price: parseFloat(String(p.price ?? 0)) || 0,
    qty: Number(p.qty ?? p.quantity ?? 1) || 1,
    total: parseFloat(String(p.total ?? p.price ?? 0)) || 0,
  }));

  const membershipItems = (item.membership_items || item.membershipItems || item.memberships || []).map((m: any) => ({
    id: String(m.id ?? ""),
    membershipId: String(m.membership_id ?? m.membershipId ?? ""),
    membershipName: m.membership_name ?? m.membershipName ?? m.name ?? "",
    name: m.membership_name ?? m.membershipName ?? m.name ?? "",
    price: parseFloat(String(m.price ?? 0)) || 0,
    qty: Number(m.qty ?? m.quantity ?? 1) || 1,
    total: parseFloat(String(m.total ?? m.price ?? 0)) || 0,
  }));
  // ── Build combined title from all booking item types ──────────────────────
  const title = (item.title && item.title !== "Appointment" && item.title !== "appointment") ? item.title : [
    ...(services || []).map((s: any) => s.name || s.service).filter(Boolean),
    ...(productItems || []).map((p: any) => p.name).filter(Boolean),
    ...(packageItems || []).map((p: any) => p.name).filter(Boolean),
    ...(membershipItems || []).map((m: any) => m.name).filter(Boolean),
  ].join(", ") || "Appointment";

  return {
    id: String(item.id),
    title,
    clientId: item.client_id ? String(item.client_id) : undefined,
    clientName: item.client?.fullName ?? item.client?.full_name ?? item.client_name ?? "",
    clientPhone: item.client?.phone ?? item.client_phone ?? "",
    staffId: item.staff_id ? String(item.staff_id) : "",
    date,
    billDate: date,
    startTime: `${hh}:${mm}`,
    endTime: `${endHH}:${endMM}`,
    services,
    products: productItems,
    productItems,
    packages: packageItems,
    packageItems,
    memberships: membershipItems,
    membershipItems,
    status: mapBackendStatus(item.status),
    _rawStatus: (item.status || "").toLowerCase(),
    paymentStatus: finalPayStatus,
    subtotal: grandTotal,
    taxableAmount: grandTotal,
    grandTotal,
    payingNow: paidAmount > 0 ? paidAmount : (finalPayStatus === "Paid" ? grandTotal : 0),
    dueAmount: grandTotal - (paidAmount > 0 ? paidAmount : (finalPayStatus === "Paid" ? grandTotal : 0)),
    notes: item.notes ?? "",
    staffAlert: item.staff_alert || item.staffAlert || "",
  };
}

export function useSchedulerInit() {
  const dispatch = useAppDispatch();
  const initialized = useRef<string | null>(null);

  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id);
  const scheduleVersion = useAppSelector((s: any) => s.scheduler?.scheduleVersion ?? 0);
  const currentDate = useAppSelector((s: any) => s.scheduler?.currentDate ?? "");
  const apiStaff = useAppSelector((s: any) => s.staff.items);
  const apiClients = useAppSelector((s: any) => s.client.items);
  const apiServices = useAppSelector((s: any) => s.services.items);
  const apiMemberships = useAppSelector((s: any) => s.memberships.items);
  const apiProducts = useAppSelector((s: any) => s.products.items);
  // staffSchedules is used to skip re-fetching when data already exists in Redux
  const staffSchedules = useAppSelector((s: any) => s.scheduler?.staffSchedules ?? {});

  // Raw API booking objects stored so bookings can be re-mapped when services load later
  const [rawApiBookings, setRawApiBookings] = useState<any[]>([]);

  const { data: packagesData } = useListPackagesQuery({});

  // ── Fetch active services once — skip if already in store ───────────────────
  useEffect(() => {
    if (!salonId || apiServices.length > 0) return;
    dispatch(fetchServicesThunk({ isActive: true }));
  }, [dispatch, salonId, apiServices.length]);

  // ── Tracks which individual dates have already been fetched ──────────────────
  const fetchedDatesRef = useRef<Set<string>>(new Set());

  // ── Helper: extract Booking[] from paginated or flat thunk payload ───────────
  function extractBookings(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  // ── Helper: fetch appointments for a single date ──────────────────────────────
  function fetchDateBookings(dateStr: string, isFirst: boolean) {
    if (fetchedDatesRef.current.has(dateStr)) return;
    fetchedDatesRef.current.add(dateStr);

    (dispatch(fetchBookingsThunk({ startDate: dateStr, endDate: dateStr })) as any)
      .then((action: any) => {
        if (!fetchBookingsThunk.fulfilled.match(action)) return;
        const items = extractBookings(action.payload);
        if (isFirst) {
          setRawApiBookings(items);
        } else {
          if (!items.length) return;
          setRawApiBookings((prev) => {
            const newIdSet = new Set(items.map((b: any) => String(b.id)));
            return [...prev.filter((b: any) => !newIdSet.has(String(b.id))), ...items];
          });
        }
      })
      .catch((err: any) => { if (isFirst) console.error("Failed to load bookings:", err); });
  }

  // ── Initial fetch — runs once per salonId, fetches only today ────────────────
  useEffect(() => {
    if (!salonId || initialized.current === salonId) return;
    initialized.current = salonId;

    dispatch(fetchStaffThunk());

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    fetchDateBookings(todayStr, true);
  }, [dispatch, salonId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch appointments for the selected date when user navigates ──────────────
  useEffect(() => {
    if (!salonId || !currentDate) return;
    fetchDateBookings(currentDate, false);
  }, [currentDate, salonId, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-map bookings whenever raw data or services change ─────────────────────
  // This ensures service names appear correctly even if services load after bookings
  useEffect(() => {
    if (!rawApiBookings.length) return;
    dispatch(setBookings(rawApiBookings.map((item) => mapApiBooking(item, apiServices, apiStaff))));
  }, [rawApiBookings, apiServices, apiStaff, dispatch]);

  // ── Map staff ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiStaff.length) {
      dispatch(setStaffList([]));
      return;
    }
    const mapped: Staff[] = apiStaff.map((s: any, i: number) => {
      const fromParts = `${s.first_name || ""} ${s.last_name || ""}`.trim();
      const rawFull = s.fullName || s.full_name || "";
      const spacedFull = rawFull.includes(" ") ? rawFull : rawFull.replace(/([a-z])([A-Z])/g, "$1 $2");
      const name = fromParts || spacedFull || "";
      return {
        id: String(s.id),
        name,
        initials: getInitials(name),
        color: STAFF_COLORS[i % STAFF_COLORS.length],
      };
    });
    dispatch(setStaffList(mapped));
  }, [apiStaff, dispatch]);

  // ── Map clients ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiClients.length) return;
    const mapped: Client[] = apiClients.map((c: any) => ({
      id: String(c.id),
      name: c.fullName || c.full_name || "",
      phone: c.phone || "",
      eWallet: c.wallet_balance || 0,
    }));
    dispatch(setClientsList(mapped));
  }, [apiClients, dispatch]);

  // ── Map services ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiServices.length) return;
    dispatch(setServicesList(
      apiServices.filter((s: any) => s.is_active !== false).map((s: any) => ({
        id: String(s.id ?? ""),
        name: s.name,
        price: parseFloat(String(s.price)) || 0,
        duration: Number(s.duration) || 30,
      }))
    ));
  }, [apiServices, dispatch]);

  // ── Map packages (RTK Query) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!packagesData?.items?.length) return;
    dispatch(setPackagesList(
      packagesData.items.map((p) => ({
        id: String(p.id || ""),
        name: p.name || "",
        price: p.basePrice || 0,
        services: [],
      }))
    ));
  }, [packagesData, dispatch]);

  // ── Map memberships ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiMemberships.length) return;
    dispatch(setMembershipsList(
      apiMemberships.map((m: any) => ({
        name: m.name,
        price: m.price || 0,
      }))
    ));
  }, [apiMemberships, dispatch]);

  // ── Fetch staff weekly schedule patterns once per scheduleVersion ────────────
  // staffSchedules in Redux persists across component remounts (navigate away & back).
  // bumpScheduleVersion() clears staffSchedules in the reducer, which causes this
  // effect to re-run and re-fetch fresh data from the API.
  useEffect(() => {
    if (!apiStaff.length) return;
    // staffSchedules is already populated (either from this session or a prior mount)
    if (Object.keys(staffSchedules).length > 0) return;

    Promise.all(
      apiStaff.map((s: any) =>
        api
          .get(`/api/v1/staff/${s.id}/scheduled`)
          .then((res: any) => ({ staffId: String(s.id), data: res.data?.data || res.data || [] }))
          .catch(() => ({ staffId: String(s.id), data: [] }))
      )
    )
      .then((results) => {
        const schedules: Record<string, Record<number, StaffDaySchedule>> = {};
        results.forEach(({ staffId, data }) => {
          schedules[staffId] = {};
          if (Array.isArray(data)) {
            data.forEach((sch: any) => {
              const dow = Number(sch.day_of_week);
              if (!isNaN(dow) && dow >= 0 && dow <= 6 && sch.is_available) {
                schedules[staffId][dow] = {
                  startTime: sch.start_time || "",
                  endTime: sch.end_time || "",
                  isAvailable: true,
                };
              }
            });
          }
        });
        dispatch(setStaffSchedules(schedules));
      })
      .catch(() => {/* non-critical — calendar still works without schedule data */});
  }, [apiStaff, scheduleVersion, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map products ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiProducts.length) return;
    dispatch(setProductsList(
      apiProducts.map((p: any) => {
        const rp = parseFloat(String(p.retail_price ?? p.selling_price ?? p.sellingPrice ?? p.price));
        const sp = parseFloat(String(p.supply_price));
        const isValidRp = !isNaN(rp) && rp !== 0;
        const isValidSp = !isNaN(sp) && sp !== 0;

        let price: number | null = null;
        if (isValidRp) price = rp;
        else if (isValidSp) price = sp;
        else if (p.retail_price === 0 || p.retail_price === "0" || p.supply_price === 0 || p.supply_price === "0") price = 0;

        const rawAmt = parseFloat(p.amount);
        const stock = isNaN(rawAmt) ? 0 : rawAmt;

        return {
          id: String(p.id),
          name: p.name || "",
          price,
          stock,
        };
      })
    ));
  }, [apiProducts, dispatch]);
}
