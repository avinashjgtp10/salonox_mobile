import type { AppointmentListItem, UpdateAppointmentRequest } from "@/types/appointment";

/** What the staff member picked from the catalog, plus who is doing it. */
export type JobCardItemDraft = {
  catalogId: string;
  kind: "product" | "service";
  name: string;
  price: number;
  staffId: string;
  staffName: string;
};

type RawRow = Record<string, unknown>;

/**
 * PATCH /appointments/:id REPLACES each item array outright — it is not an
 * append. So adding one line means resending every line already on the
 * appointment, and anything dropped here is silently deleted from a real
 * booking. The existing rows are therefore passed back exactly as the server
 * sent them (same spirit as useAppointmentForm's `rawItem` round trip) rather
 * than rebuilt from the normalized view, which would lose server-only fields
 * such as consumables, package flags and per-row discounts.
 */
const readRows = (raw: Record<string, unknown>, ...keys: string[]): RawRow[] => {
  const rows = keys.map((key) => raw[key]).find(Array.isArray);
  return (rows ?? []).filter((row): row is RawRow => Boolean(row) && typeof row === "object");
};

export const buildAddJobCardItemPayload = (
  appointment: AppointmentListItem,
  draft: JobCardItemDraft,
): UpdateAppointmentRequest => {
  const raw = (appointment.raw ?? {}) as Record<string, unknown>;

  const services = readRows(raw, "services");
  const productItems = readRows(raw, "product_items", "productItems");
  const packageItems = readRows(raw, "package_items", "packageItems");
  const membershipItems = readRows(raw, "membership_items", "membershipItems");

  // The new line carries the staff member who added it, which is the whole
  // point of adding it from their own phone mid-service.
  const line = {
    name: draft.name,
    price: draft.price,
    quantity: 1,
    staff_id: draft.staffId,
    staff_name: draft.staffName,
    total: draft.price,
  };

  const nextServices = draft.kind === "service"
    ? [...services, { ...line, service_id: draft.catalogId }]
    : services;
  const nextProducts = draft.kind === "product"
    ? [...productItems, { ...line, product_id: draft.catalogId }]
    : productItems;

  return {
    membership_items: membershipItems,
    package_items: packageItems,
    product_items: nextProducts,
    services: nextServices,
  } as UpdateAppointmentRequest;
};
