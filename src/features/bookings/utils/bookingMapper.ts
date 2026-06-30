import type { Booking, PaymentStatus } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Normalise API payment_status to consistent Title Case so PAY_RANK
 *  comparisons, patchPaymentStatus dispatches, and chip colour lookups all match. */
export function normalizePaymentStatus(raw?: string | null): PaymentStatus {
  const s = (raw ?? "").toLowerCase();
  if (s === "paid" || s === "completed") return "Paid";
  if (s === "partial")                   return "Partial";
  return "Unpaid";
}

// ─── Core mapper ─────────────────────────────────────────────────────────────

/**
 * Maps a raw API appointment response to the frontend Booking shape.
 * @param appt      Raw API object
 * @param servicesList  Optional catalog services for name lookup
 * @param apiStaff      Optional staff list for staffId lookup
 * @param apiClients    Optional client list for clientId lookup
 */
export function mapApiBooking(
  appt: any,
  servicesList: any[] = [],
  _apiStaff: any[] = [],
  _apiClients: any[] = [],
): Booking {
  // ── Parse startTime / endTime from ISO strings ────────────────────────────
  let startTime: string = appt.startTime ?? "";
  if (!startTime && appt.scheduled_at) {
    const d = new Date(appt.scheduled_at);
    startTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  let endTime: string = appt.endTime ?? "";
  if (!endTime && appt.ends_at) {
    const d = new Date(appt.ends_at);
    endTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // ── UTC → local time for service start_time fields ────────────────────────
  function svcTimeToLocal(svcStartTime: string): string {
    if (!svcStartTime) return startTime;
    if (svcStartTime.includes("T") || svcStartTime.endsWith("Z")) {
      const d = new Date(svcStartTime);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    if (!appt.scheduled_at || !startTime) return svcStartTime;
    try {
      const bookingDate = new Date(appt.scheduled_at);
      const bookingUtcMins = bookingDate.getUTCHours() * 60 + bookingDate.getUTCMinutes();
      const [bh, bm] = startTime.split(":").map(Number);
      const tzOffsetMins = bh * 60 + bm - bookingUtcMins;
      const [sh, sm] = svcStartTime.split(":").map(Number);
      if (isNaN(sh) || isNaN(sm)) return startTime;
      const svcLocalMins = ((sh * 60 + sm) + tzOffsetMins + 24 * 60) % (24 * 60);
      return `${String(Math.floor(svcLocalMins / 60)).padStart(2, "0")}:${String(svcLocalMins % 60).padStart(2, "0")}`;
    } catch {
      return startTime;
    }
  }

  // Converts a raw time value from a line-item (product/package/membership) into
  // a padded "HH:MM" string, or "" when the value is absent or unparseable.
  // Unlike svcTimeToLocal it never falls back to the booking start time.
  function sanitizeItemTime(raw: string | null | undefined): string {
    const t = String(raw ?? "").trim();
    if (!t) return "";
    if (/^\d{1,2}:\d{2}$/.test(t)) {
      const [h, m] = t.split(":").map(Number);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    if (t.includes("T") || t.endsWith("Z")) {
      const d = new Date(t);
      if (!isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    }
    return "";
  }

  // ── Map services ─────────────────────────────────────────────────────────
  const services = (appt.services || []).map((s: any) => {
    const svcLookup = servicesList.find((rs: any) => String(rs.id) === String(s.service_id ?? s.id));
    const sName = s.name
      || (typeof s.service === "object" ? s.service?.name || s.service?.service : s.service)
      || s.service_name
      || svcLookup?.name
      || "";
    const mappedTime = s.time || (s.start_time ? svcTimeToLocal(s.start_time) : startTime);
    const duration = Number(s.duration || s.duration_minutes || svcLookup?.duration || 30) || 30;
    const staffNameStr = (() => { const sf = s.staff; if (!sf) return ""; if (typeof sf === "object") return (sf as any)?.name || ""; return String(sf); })();
    return {
      ...s,
      name: sName,
      service: sName,
      staff: staffNameStr,
      staffId: s.staffId || s.staff_id || appt.staffId || appt.staff_id || undefined,
      time: mappedTime,
      duration,
    };
  });

  // Auto-cascade when all services have the same start time (stale DB data)
  if (services.length > 1 && services.every((s: any) => s.time === services[0].time)) {
    const [h0, m0] = (services[0].time || "00:00").split(":").map(Number);
    let runMins = (isNaN(h0) ? 0 : h0) * 60 + (isNaN(m0) ? 0 : m0);
    services.forEach((s: any) => {
      const dur = s.duration || 30;
      s.time = `${String(Math.floor(runMins / 60) % 24).padStart(2, "0")}:${String(runMins % 60).padStart(2, "0")}`;
      runMins += dur;
    });
  }

  // ── Map line items ────────────────────────────────────────────────────────
  const productItems = (appt.product_items || appt.productItems || appt.products || []).map((p: any) => ({
    id: String(p.id ?? ""),
    productId: String(p.product_id ?? p.productId ?? ""),
    productName: p.product_name ?? p.productName ?? p.name ?? "",
    name: p.product_name ?? p.productName ?? p.name ?? "",
    price: parseFloat(String(p.price ?? 0)) || 0,
    qty: Number(p.qty ?? p.quantity ?? 1) || 1,
    total: parseFloat(String(p.total ?? p.price ?? 0)) || 0,
    staffId: String(p.staff_id ?? p.staffId ?? ""),
    time: sanitizeItemTime(p.time ?? p.start_time ?? p.startTime),
  }));

  const packageItems = (appt.package_items || appt.packageItems || appt.packages || []).map((p: any) => ({
    id: String(p.id ?? ""),
    packageId: String(p.package_id ?? p.packageId ?? ""),
    packageName: p.package_name ?? p.packageName ?? p.name ?? "",
    name: p.package_name ?? p.packageName ?? p.name ?? "",
    price: parseFloat(String(p.price ?? 0)) || 0,
    qty: Number(p.qty ?? p.quantity ?? 1) || 1,
    total: parseFloat(String(p.total ?? p.price ?? 0)) || 0,
    staffId: String(p.staff_id ?? p.staffId ?? ""),
    time: sanitizeItemTime(p.time ?? p.start_time ?? p.startTime),
  }));

  const membershipItems = (appt.membership_items || appt.membershipItems || appt.memberships || []).map((m: any) => ({
    id: String(m.id ?? ""),
    membershipId: String(m.membership_id ?? m.membershipId ?? ""),
    membershipName: m.membership_name ?? m.membershipName ?? m.name ?? "",
    name: m.membership_name ?? m.membershipName ?? m.name ?? "",
    price: parseFloat(String(m.price ?? 0)) || 0,
    qty: Number(m.qty ?? m.quantity ?? 1) || 1,
    total: parseFloat(String(m.total ?? m.price ?? 0)) || 0,
    staffId: String(m.staff_id ?? m.staffId ?? ""),
    time: sanitizeItemTime(m.time ?? m.start_time ?? m.startTime),
  }));

  // ── Compute grand total ───────────────────────────────────────────────────
  const computedTotal = [
    ...(appt.services || []),
    ...(appt.product_items || []),
    ...(appt.package_items || []),
    ...(appt.membership_items || []),
  ].reduce((sum: number, item: any) => {
    const itemTotal = parseFloat(String(item.total ?? 0)) || 0;
    if (itemTotal > 0) return sum + itemTotal;
    const price = parseFloat(String(item.price ?? item.unit_price ?? 0)) || 0;
    const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
    return sum + price * qty;
  }, 0);

  const grandTotalVal = parseFloat(String(appt.grand_total ?? appt.grandTotal ?? appt.total_amount ?? 0)) || computedTotal;

  // ── Subtotal / discount / taxable amount ──────────────────────────────────
  // The API stores the raw discount input (discount_value, a %/flat number) separately
  // from the computed monetary discount (discount_amount). Use computedTotal as the
  // subtotal fallback since the API doesn't always echo back a `subtotal` field.
  const subtotalVal = parseFloat(String(appt.subtotal ?? 0)) || computedTotal;
  const discountAmountVal = parseFloat(String(appt.discount_amount ?? appt.discountAmount ?? 0)) || 0;
  const taxableAmountVal = parseFloat(String(appt.taxable_amount ?? appt.taxableAmount ?? 0))
    || Math.max(0, subtotalVal - discountAmountVal);

  // ── Normalise paymentStatus (always Title Case) ───────────────────────────
  const normalizedPaymentStatus = normalizePaymentStatus(appt.payment_status ?? appt.paymentStatus);

  // ── Compute payingNow / dueAmount ─────────────────────────────────────────
  const paidAmountVal = Number(appt.paid_amount ?? 0) || 0;

  // Always recompute — never trust a stale appt.payingNow === 0 from the API
  let payingNow: number;
  if (paidAmountVal > 0) {
    payingNow = paidAmountVal;
  } else if (appt.payingNow != null && Number(appt.payingNow) > 0) {
    payingNow = Number(appt.payingNow);
  } else if (normalizedPaymentStatus === "Paid") {
    payingNow = grandTotalVal;
  } else {
    payingNow = 0;
  }

  // Use API's due_amount directly if provided (most accurate); else compute.
  const apiDue = Number(appt.due_amount ?? appt.dueAmount ?? NaN);
  const dueAmount = (!isNaN(apiDue) && apiDue > 0)
    ? apiDue
    : Math.max(0, parseFloat((grandTotalVal - payingNow).toFixed(2)));

  // ── Notes / staffAlert split ──────────────────────────────────────────────
  const rawNotes: string = appt.notes || "";
  const legacySep = "\n Staff Alert: ";
  const legacyIdx = rawNotes.indexOf(legacySep);
  const parsedNotes = appt.staff_alert || appt.staffAlert
    ? rawNotes
    : (legacyIdx >= 0 ? rawNotes.substring(0, legacyIdx) : rawNotes);
  const parsedStaffAlert = appt.staff_alert || appt.staffAlert
    || (legacyIdx >= 0 ? rawNotes.substring(legacyIdx + legacySep.length) : undefined);

  // ── Title ─────────────────────────────────────────────────────────────────
  const title = (appt.title && appt.title !== "Appointment" && appt.title !== "appointment")
    ? appt.title
    : [
        ...services.map((s: any) => s.name || s.service).filter(Boolean),
        ...productItems.map((p: any) => p.name).filter(Boolean),
        ...packageItems.map((p: any) => p.name).filter(Boolean),
        ...membershipItems.map((m: any) => m.name).filter(Boolean),
      ].join(", ") || "Appointment";

  // ── clientName ────────────────────────────────────────────────────────────
  const clientName = (() => {
    if (appt.clientName) return appt.clientName;
    if (appt.client_name) return appt.client_name;
    const c = appt.client;
    if (!c) return "";
    return c.fullName || c.full_name || c.name
      || `${c.first_name || c.firstName || ""} ${c.last_name || c.lastName || ""}`.trim()
      || "";
  })();

  return {
    ...appt,
    title,
    clientName,
    staffId: appt.staffId || appt.staff_id || undefined,
    clientId: String(appt.clientId ?? appt.client_id ?? appt.client?.id ?? ""),
    date: appt.date
      ? toLocalDateStr(appt.date)
      : (appt.scheduled_at ? toLocalDateStr(appt.scheduled_at) : undefined),
    startTime,
    endTime,
    services,
    productItems,
    products: productItems,
    packageItems,
    packages: packageItems,
    membershipItems,
    memberships: membershipItems,
    grandTotal: grandTotalVal,
    paymentStatus: normalizedPaymentStatus,
    payment_status: (appt.payment_status ?? "unpaid") as any,
    payingNow,
    dueAmount,
    notes: parsedNotes,
    staffAlert: parsedStaffAlert,
    discount: parseFloat(String(appt.discount_value ?? 0)) || 0,
    discountAmount: discountAmountVal,
    discountType: appt.discount_type === "flat" ? "Flat (₹)" : "Percentage (%)",
    exCharges: parseFloat(String(appt.ex_charges ?? 0)) || 0,
    tipAmount: parseFloat(String(appt.tip_amount ?? 0)) || 0,
    gst: parseFloat(String(appt.gst_percent ?? 0)) || 0,
    subtotal: subtotalVal,
    taxableAmount: taxableAmountVal,
  } as Booking;
}
