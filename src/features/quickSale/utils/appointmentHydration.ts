import { getClientInitials } from "@/features/quickSale/utils/client";
import { localItemTime } from "./itemTime";
import type { CartItem, CartItemSource, QuickSaleClient, QuickSaleSlot } from "@/features/quickSale/types";
import { parseAppointmentDateTime } from "@/features/appointments/utils/appointmentDateTime";
import type { AppointmentApiService, AppointmentListItem } from "@/types/appointment";
import type { PosStaffMember } from "@/types/sales";

// Each billed bucket on an appointment and the catalog id key it carries.
const APPOINTMENT_ITEM_SOURCES: { idKey: string; key: "services" | "product_items" | "package_items" | "membership_items"; type: CartItemSource }[] = [
  { idKey: "service_id", key: "services", type: "service" },
  { idKey: "product_id", key: "product_items", type: "product" },
  { idKey: "package_id", key: "package_items", type: "package" },
  { idKey: "membership_id", key: "membership_items", type: "membership" },
];

const toId = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

let appointmentLineCounter = 0;

/**
 * An existing appointment's billed rows as Quick Sale cart lines. Package
 * coverage is not set here: it is recalculated from the client's active
 * packages once they load, exactly as for a new Quick Sale.
 */
export const mapAppointmentToCartItems = (appointment: AppointmentListItem): CartItem[] =>
  APPOINTMENT_ITEM_SOURCES.flatMap(({ idKey, key, type }) => {
    const rows = appointment.raw[key];
    if (!Array.isArray(rows)) return [];

    return rows.map((row: AppointmentApiService): CartItem => {
      const record = row as Record<string, unknown>;
      const quantity = Math.max(1, toNumber(row.quantity ?? row.qty) || 1);
      const unitPrice = Math.max(0, toNumber(row.price));
      // Row discount is stored as a percentage of the line (web parity).
      const discountPercent = Math.max(0, toNumber(row.discount));
      const durationMinutes = toNumber(row.duration_minutes ?? row.duration);
      appointmentLineCounter += 1;

      return {
        // Real stock is fetched after hydration (same as a reopened draft).
        availableStock: type === "product" ? 0 : undefined,
        category: null,
        categoryId: toId(record.category_id) || null,
        discountAmount: Math.round(unitPrice * quantity * discountPercent) / 100,
        ...(type === "service" && durationMinutes > 0 ? { duration: `${durationMinutes} min` } : {}),
        itemId: toId(record[idKey]),
        itemType: type,
        lineId: `appointment-line-${appointmentLineCounter}`,
        name: row.name?.trim() || type,
        note: "",
        originalUnitPrice: unitPrice,
        quantity,
        staffId: toId(row.staff_id) || appointment.staffId || null,
        staffName: row.staff_name?.trim() || appointment.staffName || null,
        startTime: localItemTime(record.time ?? record.start_time),
        unitPrice,
      };
    });
  });

export const mapAppointmentToClient = (appointment: AppointmentListItem): QuickSaleClient | null =>
  appointment.clientId
    ? {
        avatarBg: "#e4edf9",
        avatarColor: "#7488a0",
        id: appointment.clientId,
        initials: getClientInitials(appointment.clientName),
        membership: null,
        name: appointment.clientName,
        phone: appointment.phone,
      }
    : null;

export const mapAppointmentToStaff = (appointment: AppointmentListItem): PosStaffMember | null =>
  appointment.staffId
    ? {
        avatarBg: "#e4edf9",
        avatarColor: "#7488a0",
        id: appointment.staffId,
        initials: getClientInitials(appointment.staffName || "Staff"),
        name: appointment.staffName || "Selected staff",
        role: null,
        status: "Available",
      }
    : null;

type PayloadRows = Partial<Record<(typeof APPOINTMENT_ITEM_SOURCES)[number]["key"], Record<string, unknown>[]>>;

// Row fields the cart doesn't model; the original row's value always wins.
const ORIGINAL_ROW_FIELDS = ["end_time", "duration", "duration_minutes", "services", "never_expires", "expiry_date"];

/**
 * Saving the cart back onto an existing appointment: each payload row is laid
 * over its original row (matched by catalog id, else name), like the web edits
 * the stored rows in place. Keeps what Quick Sale doesn't model — per-service
 * start times, recorded consumables, a package's service breakdown/expiry —
 * while price, quantity, discount, staff and package coverage come from the cart.
 */
export function mergeWithAppointmentRows<T extends PayloadRows>(payload: T, appointment: AppointmentListItem): T {
  const merged: PayloadRows = { ...payload };

  for (const { idKey, key } of APPOINTMENT_ITEM_SOURCES) {
    const rows = payload[key];
    const originals = Array.isArray(appointment.raw[key]) ? [...(appointment.raw[key] as Record<string, unknown>[])] : [];
    if (!rows || originals.length === 0) continue;

    merged[key] = rows.map((row) => {
      const id = toId(row[idKey]);
      const index = originals.findIndex((original) =>
        id ? toId(original[idKey]) === id : String(original.name ?? "") === String(row.name ?? ""));
      if (index < 0) return row;
      const [original] = originals.splice(index, 1);

      const next: Record<string, unknown> = { ...original };
      for (const [field, value] of Object.entries(row)) {
        if (value !== undefined) next[field] = value;
      }
      for (const field of ORIGINAL_ROW_FIELDS) {
        if (original[field] !== undefined && original[field] !== null) next[field] = original[field];
      }
      if (key === "services") {
        // Coverage is recomputed from the client's packages; absent means not covered.
        next.is_package_service = row.is_package_service === true;
        if (row.consumables === undefined && original.consumables !== undefined) next.consumables = original.consumables;
      }
      return next;
    });
  }

  return merged as T;
}

/** The booking's own date/time, so paying never moves the appointment to "now". */
export const mapAppointmentToSlot = (appointment: AppointmentListItem): QuickSaleSlot | null => {
  const start = parseAppointmentDateTime(appointment.scheduledAt ?? appointment.startTime);
  if (!start) return null;
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    staffName: appointment.staffName || undefined,
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
  };
};
