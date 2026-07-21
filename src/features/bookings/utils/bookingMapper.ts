import type { Booking } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Display-only Title Case label derived from a booking's unified `status`
 *  (or a Sale's own status string, for the receipt/print callers) — used
 *  wherever the UI needs "Paid"/"Partial"/"Unpaid" text/badges. */
export function normalizePaymentStatus(raw?: string | null): "Paid" | "Partial" | "Unpaid" {
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

  // Detect package-covered appointments: payment_method=package with paid_amount=0 means ₹0 to client.
  // We store catalog total in DB so grand_total>0, but display must show ₹0.
  const isPackagePaid =
    ((appt.payment_method || appt.paymentMode || appt.payment_mode || "").toLowerCase() === "package") &&
    (parseFloat(String(appt.paid_amount ?? appt.payingNow ?? 0)) || 0) === 0;

  // ── Map services ─────────────────────────────────────────────────────────
  // Only fall back to the appointment-level staffId when NO service anywhere on
  // this booking carries its own — that's the true legacy case (bookings saved
  // before per-service staff assignment existed). Once per-service assignment is
  // in use, a service left unassigned on purpose must stay unassigned, not
  // silently inherit the appointment's main staff on next load.
  const anyServiceHasOwnStaff = (appt.services || []).some((s: any) => s.staffId || s.staff_id);
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
    const sPrice = parseFloat(String(s.price ?? 0)) || 0;
    const sQty   = Number(s.qty ?? s.quantity ?? 1) || 1;
    const sTotal = parseFloat(String(s.total ?? 0)) || 0;
    // Per-row discount is a percentage of price × qty — derive it back from the
    // stored total so the edit form shows the % that was originally applied.
    const derivedDiscount = (sTotal > 0 && sPrice * sQty > sTotal)
      ? Math.round(((sPrice * sQty - sTotal) / (sPrice * sQty)) * 100 * 100) / 100
      : (parseFloat(String(s.discount ?? 0)) || 0);
    const isServiceFromPackage = !!(s.is_package_service || (s as any).isPackageService);
    return {
      ...s,
      ...(isPackagePaid || isServiceFromPackage ? { total: 0 } : {}),
      isPackageService: isServiceFromPackage,
      name: sName,
      service: sName,
      staff: staffNameStr,
      staffId: anyServiceHasOwnStaff
        ? ((s.staffId || s.staff_id) ? String(s.staffId || s.staff_id) : undefined)
        : ((s.staffId || s.staff_id || appt.staffId || appt.staff_id) ? String(s.staffId || s.staff_id || appt.staffId || appt.staff_id) : undefined),
      time: mappedTime,
      duration,
      discount: derivedDiscount,
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
  // Same back-derivation as services above: the % itself isn't always stored
  // (older rows saved before it was), but total vs price × qty always is, so
  // recomputing from that ratio survives reload regardless of when the row
  // was originally saved.
  const deriveRowDiscount = (price: number, qty: number, total: number, rawDiscount: unknown) =>
    (total > 0 && price * qty > total)
      ? Math.round(((price * qty - total) / (price * qty)) * 100 * 100) / 100
      : (parseFloat(String(rawDiscount ?? 0)) || 0);

  const productItems = (appt.product_items || appt.productItems || appt.products || []).map((p: any) => {
    const pPrice = parseFloat(String(p.price ?? 0)) || 0;
    const pQty   = Number(p.qty ?? p.quantity ?? 1) || 1;
    const pTotal = parseFloat(String(p.total ?? p.price ?? 0)) || 0;
    return {
      id: String(p.id ?? ""),
      productId: String(p.product_id ?? p.productId ?? ""),
      productName: p.product_name ?? p.productName ?? p.name ?? "",
      name: p.product_name ?? p.productName ?? p.name ?? "",
      price: pPrice,
      qty: pQty,
      total: pTotal,
      discount: deriveRowDiscount(pPrice, pQty, pTotal, p.discount),
      staffId: String(p.staff_id ?? p.staffId ?? ""),
      time: sanitizeItemTime(p.time ?? p.start_time ?? p.startTime),
    };
  });

  const packageItems = (appt.package_items || appt.packageItems || appt.packages || []).map((p: any) => {
    const isPkgService = !!(p.is_package_service || (p as any).isPackageService);
    const pPrice = parseFloat(String(p.price ?? 0)) || 0;
    const pQty   = Number(p.qty ?? p.quantity ?? 1) || 1;
    const pTotal = parseFloat(String(p.total ?? p.price ?? 0)) || 0;
    return {
      id: String(p.id ?? ""),
      packageId: String(p.package_id ?? p.packageId ?? ""),
      packageName: p.package_name ?? p.packageName ?? p.name ?? "",
      name: p.package_name ?? p.packageName ?? p.name ?? "",
      price: pPrice,
      qty: pQty,
      isPackageService: isPkgService,
      total: isPkgService ? 0 : pTotal,
      discount: isPkgService ? 0 : deriveRowDiscount(pPrice, pQty, pTotal, p.discount),
      staffId: String(p.staff_id ?? p.staffId ?? ""),
      time: sanitizeItemTime(p.time ?? p.start_time ?? p.startTime),
    };
  });

  const membershipItems = (appt.membership_items || appt.membershipItems || appt.memberships || []).map((m: any) => {
    const mPrice = parseFloat(String(m.price ?? 0)) || 0;
    const mQty   = Number(m.qty ?? m.quantity ?? 1) || 1;
    const mTotal = parseFloat(String(m.total ?? m.price ?? 0)) || 0;
    return {
      id: String(m.id ?? ""),
      membershipId: String(m.membership_id ?? m.membershipId ?? ""),
      membershipName: m.membership_name ?? m.membershipName ?? m.name ?? "",
      name: m.membership_name ?? m.membershipName ?? m.name ?? "",
      price: mPrice,
      qty: mQty,
      total: mTotal,
      discount: deriveRowDiscount(mPrice, mQty, mTotal, m.discount),
      staffId: String(m.staff_id ?? m.staffId ?? ""),
      time: sanitizeItemTime(m.time ?? m.start_time ?? m.startTime),
    };
  });

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

  // For mixed appointments, recompute from mapped items (package services already have total=0)
  const hasPerServicePackage = services.some((s: any) => s.isPackageService)
    || packageItems.some((p: any) => p.isPackageService);
  // Persisted snapshot from the payment that was actually made (see taxBreakdown
  // below, hoisted here) — appointments.grand_total doesn't exist as a column,
  // so the raw item-price sum below never included tax. Without this, Calendar
  // showed a pre-tax total that permanently disagreed with what Reports/
  // Dashboard show (payments.net_amount / sales.total_amount, both tax-inclusive).
  const taxBreakdownVal = appt.taxBreakdown ?? appt.tax_breakdown ?? undefined;
  const taxFromBreakdown = Array.isArray(taxBreakdownVal)
    ? taxBreakdownVal.reduce((s: number, t: any) => s + (Number(t?.amount) || 0), 0)
    : 0;
  // For an appointment with no payment yet, the backend backfills a full
  // discount+tax-inclusive total at read time (appointments.service.ts::
  // backfillTaxBreakdown) — prefer it outright rather than `computedTotal +
  // taxFromBreakdown`, since computedTotal is the raw pre-discount item sum
  // and never accounts for the bill-level discount on its own.
  const computedGrandTotal = appt.computed_grand_total ?? (appt as any).computedGrandTotal;
  const grandTotalVal = isPackagePaid ? 0
    : hasPerServicePackage
      ? Math.max(0, [...services, ...productItems, ...packageItems, ...membershipItems]
          .reduce((sum, item: any) => sum + (Number(item.total) || 0), 0)) + taxFromBreakdown
      : (parseFloat(String(appt.grand_total ?? appt.grandTotal ?? appt.total_amount ?? 0))
          || (computedGrandTotal != null ? Number(computedGrandTotal) : (computedTotal + taxFromBreakdown)));

  // ── Subtotal / discount / taxable amount ──────────────────────────────────
  const subtotalVal = parseFloat(String(appt.subtotal ?? 0)) || computedTotal;

  const discountValueRaw = parseFloat(String(appt.discount_value ?? appt.discount ?? 0)) || 0;
  const discountTypeRaw  = (appt.discount_type || "").toLowerCase();

  let discountAmountVal = parseFloat(String(appt.discount_amount ?? appt.discountAmount ?? 0)) || 0;
  // API often omits discount_amount — compute it from discount_value + discount_type
  if (discountAmountVal === 0 && discountValueRaw > 0) {
    if (discountTypeRaw === "flat") {
      discountAmountVal = discountValueRaw;
    } else {
      // Percentage — apply only to services/packages/memberships (not products)
      const svcBase = services.reduce((sum: number, s: any) => sum + (parseFloat(String(s.total ?? s.price ?? 0)) || 0), 0)
        + packageItems.reduce((sum: number, p: any) => sum + (parseFloat(String(p.total ?? p.price ?? 0)) || 0), 0)
        + membershipItems.reduce((sum: number, m: any) => sum + (parseFloat(String(m.total ?? m.price ?? 0)) || 0), 0);
      const base = svcBase > 0 ? svcBase : subtotalVal;
      discountAmountVal = Math.round((base * discountValueRaw / 100) * 100) / 100;
    }
  }

  const taxableAmountVal = parseFloat(String(appt.taxable_amount ?? appt.taxableAmount ?? 0))
    || Math.max(0, subtotalVal - discountAmountVal);

  // ── Booking status is unified — appt.status carries the payment state too,
  //    no separate payment_status field anymore. ────────────────────────────
  const rawStatus = String(appt.status ?? "booked").toLowerCase();
  const isPaidStatus = rawStatus === "paid";

  // ── Compute payingNow / dueAmount ─────────────────────────────────────────
  const paidAmountVal = Number(appt.paid_amount ?? 0) || 0;

  // Always recompute — never trust a stale appt.payingNow === 0 from the API
  let payingNow: number;
  if (paidAmountVal > 0) {
    payingNow = paidAmountVal;
  } else if (appt.payingNow != null && Number(appt.payingNow) > 0) {
    payingNow = Number(appt.payingNow);
  } else if (isPaidStatus) {
    payingNow = grandTotalVal;
  } else {
    payingNow = 0;
  }

  // Use API's due_amount directly if provided (most accurate); else compute.
  // Package payments always have due_amount=0 (client owes nothing — covered by package).
  // A booking that's simply been booked — no payment attempted at all yet — is not
  // "due" money; it's just an upcoming charge. `due_amount` only means something once
  // a real (partial) payment has actually been made, i.e. status === "partial".
  // Otherwise this fallback formula (grandTotal - payingNow, with payingNow=0) would
  // show the FULL bill as "due" the instant an appointment is created.
  const apiDue = Number(appt.due_amount ?? appt.dueAmount ?? NaN);
  const isPartialStatus = rawStatus === "partial";
  const dueAmount = isPackagePaid ? 0
    : hasPerServicePackage ? (isPartialStatus ? Math.max(0, parseFloat((grandTotalVal - payingNow).toFixed(2))) : 0)
    : (!isNaN(apiDue) && apiDue > 0) ? apiDue
    : isPartialStatus ? Math.max(0, parseFloat((grandTotalVal - payingNow).toFixed(2))) : 0;

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
  const clientPhone = appt.clientPhone || appt.client_phone || appt.client?.phone || appt.client?.mobile || "";
  const clientEmail = appt.clientEmail || appt.client_email || appt.client?.email || "";
  const clientGst   = appt.clientGst   || appt.client_gst   || appt.client?.gst_number || appt.client?.gst || "";
  const staffName   = appt.staffName   || appt.staff_name   || "";
  const staffPhone  = appt.staffPhone  || appt.staff_phone  || "";
  const staffEmail  = appt.staffEmail  || appt.staff_email  || "";
  const loyaltyPoints = appt.loyaltyPoints ?? appt.loyalty_points ?? appt.client?.loyalty_points ?? null;
  const rewardPointsValue = Number(appt.rewardPointsValue ?? appt.reward_points_value ?? 0) || 0;
  // Hoisted above (as taxBreakdownVal) so grandTotalVal can include it too.
  const taxBreakdown = taxBreakdownVal;
  // Persisted ₹ tax figure for consumers that show a single GST line (tooltip,
  // bill views). Without this, gstAmount only existed transiently via the
  // post-payment Redux patch — after any refetch a partially-paid bill's GST
  // silently vanished from displays even though its due_amount still included it.
  const gstAmountVal = taxFromBreakdown > 0 ? taxFromBreakdown : undefined;
  const membershipName = (() => {
    if (appt.membershipName) return appt.membershipName;
    if (appt.membership_name) return appt.membership_name;
    const m = (appt.memberships || appt.membership_items || [])[0];
    return m ? (m.membership_name || m.membershipName || m.name || "") : "";
  })();

  return {
    ...appt,
    title,
    invoiceNumber: appt.invoice_number ? Number(appt.invoice_number) : undefined,
    clientName,
    clientPhone,
    clientEmail,
    clientGst,
    staffName,
    staffPhone,
    staffEmail,
    loyaltyPoints,
    rewardPointsValue,
    taxBreakdown,
    gstAmount: gstAmountVal,
    membershipName,
    staffId: (() => { const raw = appt.staffId || appt.staff_id || packageItems.find((p: any) => p.staffId)?.staffId; return raw ? String(raw) : undefined; })(),
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
    isDeleted: !!(appt.deleted_at ?? appt.deletedAt),
    reopenedFromPaid: !!(appt.reopened_from_paid ?? appt.reopenedFromPaid),
    // When package-covered items bring our recomputed due to 0, the backend may still
    // have sent "partial" (it used the old grand_total that included catalog prices). Override to "paid".
    // Gated on rawStatus === "partial" specifically — without this, a cancelled/
    // deleted/no-show package booking that had any prior payment recorded (paid_amount
    // persists after cancellation) would satisfy dueAmount===0 && payingNow>0 too and
    // get silently overwritten to "paid", turning it back into a draggable/active chip.
    status: ((rawStatus === "partial" && hasPerServicePackage && dueAmount === 0 && payingNow > 0) ? "paid" : rawStatus) as Booking["status"],
    paymentMode: appt.paymentMode || appt.payment_mode || appt.payment_method,
    membershipWalletUsed: parseFloat(String(appt.membership_wallet_used ?? appt.membershipWalletUsed ?? 0)) || 0,
    applyMembershipWallet: !!(appt.apply_membership_wallet ?? appt.applyMembershipWallet),
    ewalletUsed: parseFloat(String(appt.ewallet_used ?? appt.ewalletUsed ?? 0)) || 0,
    referralCreditUsed: parseFloat(String(appt.referral_credit_used ?? appt.referralCreditUsed ?? 0)) || 0,
    splitDetails: (() => {
      const raw = appt.split_details ?? appt.splitDetails;
      if (!raw) return undefined;
      const obj = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
      return (obj && typeof obj === "object") ? obj : undefined;
    })(),
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
