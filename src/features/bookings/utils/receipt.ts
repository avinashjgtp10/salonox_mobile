import type { Booking } from "../types/scheduler-types";
import type { Salon } from "../../../types/salon.types";
import { formatTime12 } from "./timeUtils";
import { normalizePaymentStatus } from "./bookingMapper";

// ═══════════════════════════════════════════════════════════════════════════
// Single reusable source for "print a bill/receipt" — every entry point in the
// app (calendar's ViewBillModal + AppointmentModal, client history) calls into
// this file instead of each growing its own invoice HTML/mapping logic.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Mapping raw appointment/sale records into a printable Booking ──────────

// Generic line-item shape shared by sale items (services/packages/products/memberships)
// regardless of which page/endpoint they came from.
export interface ReceiptLineItem {
  name: string;
  item_type: string;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
}

export interface BuildPrintableBookingParams {
  id: string;
  clientId?: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  staffId?: string | null;
  /** ISO timestamp the visit/sale happened at (appointment's scheduled_at, or sale's created_at). */
  dateIso: string;
  /** Priced line items (e.g. from a linked sale) — services/packages/products/memberships. */
  items: ReceiptLineItem[];
  /** Services present on the appointment itself but not already covered by `items`
   *  (e.g. no linked sale row exists yet for them). */
  extraServices?: { name: string; price: number }[];
  status?: string | null;
  /** Raw status used to derive Paid/Partial/Unpaid (sale.status or appointment.payment_status). */
  rawPaymentStatus?: string | null;
  paymentMethod?: string | null;
  invoiceNumber?: string | number | null;
  /** Use when the real bill total isn't just the sum of `items` (e.g. an appointment
   *  with no linked sale yet, priced from amount_paid instead). */
  grandTotalOverride?: number;
  /** The actual amount collected so far — needed for a partial payment, where
   *  it's neither the full grandTotal (not fully paid) nor 0 (something WAS
   *  collected). Omit for the normal fully-paid/fully-unpaid cases, where
   *  paymentStatus alone is enough to tell payingNow/dueAmount apart. */
  amountPaidOverride?: number;
  notes?: string | null;
  /** Amount of `grandTotal` paid from the client's eWallet — printReceipt only
   *  shows a "Paid via eWallet" line when this (or membershipWalletUsed) is
   *  wired through, otherwise the breakdown silently disappears even though
   *  the payment genuinely used the wallet. */
  ewalletUsed?: number;
  membershipWalletUsed?: number;
  /** ₹ value of reward points redeemed on this bill. */
  rewardPointsValue?: number;
  /** ₹ referral credit balance spent on this bill. */
  referralCreditUsed?: number;
}

/**
 * Maps a visit's raw data (appointment + optional linked sale, or a standalone
 * quick sale) into the Booking-shaped object `printReceipt` (below) expects —
 * so every "print bill" entry point renders the same invoice layout instead
 * of each page growing its own.
 */
export function buildPrintableBooking(params: BuildPrintableBookingParams): any {
  const d = new Date(params.dateIso);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dateStr = params.dateIso.slice(0, 10);

  const byType = (type: string) => params.items
    .filter((it) => it.item_type === type)
    .map((it) => ({
      name: it.name, staffId: params.staffId || "", time,
      price: Number(it.unit_price) || 0, qty: it.quantity, total: Number(it.total_price) || 0,
    }));

  const itemServiceNames = new Set(params.items.filter((it) => it.item_type === "service").map((it) => it.name));
  const extraServiceRows = (params.extraServices ?? [])
    .filter((s) => s.name && !itemServiceNames.has(s.name))
    .map((s) => ({ name: s.name, staffId: params.staffId || "", time, price: s.price, qty: 1, total: s.price }));

  const paymentStatus = normalizePaymentStatus(params.rawPaymentStatus);
  const isPaid = paymentStatus === "Paid";
  const grandTotal = params.grandTotalOverride
    ?? params.items.reduce((s, it) => s + (Number(it.total_price) || 0), 0);

  // Binary paid-or-not by default (payingNow = grandTotal or 0) — overridden
  // for a partial payment, where the real collected amount is somewhere in
  // between and dueAmount is whatever's left, not the full grandTotal.
  const payingNow = params.amountPaidOverride !== undefined
    ? params.amountPaidOverride
    : (isPaid ? grandTotal : 0);
  const dueAmount = Math.max(0, grandTotal - payingNow);

  const ewalletUsed = Number(params.ewalletUsed) || 0;
  // Only the eWallet leg is known precisely here (the appointment/sale record
  // doesn't carry a full cash/card/upi split) — still strictly more accurate
  // than showing no wallet usage at all, which is the bug this fixes.
  const splitDetails = ewalletUsed > 0 ? { eWallet: ewalletUsed } : undefined;

  return {
    id: params.id,
    clientId: params.clientId,
    clientName: params.clientName || "Walk-In",
    clientPhone: params.clientPhone || "",
    clientEmail: params.clientEmail || undefined,
    staffId: params.staffId || "",
    date: dateStr,
    billDate: dateStr,
    startTime: time,
    endTime: time,
    services: [...byType("service"), ...extraServiceRows],
    packageItems: byType("package"),
    productItems: byType("product"),
    membershipItems: byType("membership"),
    status: params.status,
    paymentStatus,
    paymentMode: params.paymentMethod ?? undefined,
    invoiceNumber: params.invoiceNumber ?? undefined,
    subtotal: grandTotal,
    taxableAmount: grandTotal,
    grandTotal,
    payingNow,
    dueAmount,
    notes: params.notes || undefined,
    splitDetails,
    membershipWalletUsed: Number(params.membershipWalletUsed) || 0,
    ewalletUsed,
    rewardPointsValue: Number(params.rewardPointsValue) || 0,
    referralCreditUsed: Number(params.referralCreditUsed) || 0,
  };
}

// ─── Rendering + printing the invoice itself ─────────────────────────────────

export function printReceipt(
  booking: Booking,
  staffList: { id: string; name: string }[],
  salon: Salon | null,
  client?: { phone?: string | null; email?: string | null; [key: string]: any } | null,
  opts?: {
    auto?: boolean;
    showTaxBreakup?: boolean;
    /** From the caller's own useCurrency() — this module is a plain function,
     *  not a component, so it can't call the hook itself. */
    formatAmount?: (n: number) => string;
  },
) {
  // Defaults to true (itemized) when the caller doesn't pass it, so existing
  // call sites that haven't wired the Tax Settings toggle through yet keep
  // their current behavior unchanged.
  const showTaxBreakup = opts?.showTaxBreakup ?? true;
  const findStaffName = (id?: string | number | null) =>
    id ? staffList.find((s) => String(s.id) === String(id))?.name ?? "" : "";

  const s = salon as any;
  const salonName    = s?.business_name || "Salon";
  // Address: try multiple field names the API might use
  const salonAddress = s?.address || s?.address_line1
    ? [s?.address || s?.address_line1, s?.address_line2, s?.city, s?.state, s?.pincode].filter(Boolean).join(", ")
    : "";
  const salonPhone   = s?.phone         || s?.phone_number  || s?.mobile        || s?.contact || "";
  const salonEmail   = s?.email         || s?.email_address || "";
  const salonWebsite = s?.website_url   || s?.website       || "";
  const gst          = s?.gst_number    || s?.gstin         || s?.gst           || "";
  const logoUrl      = s?.logo_url      || s?.logo          || "";

  // Client contact — prefer looked-up client record over booking fields
  const clientPhone    = client?.phone || client?.phone_number || client?.mobile
    || (booking as any).clientPhone || "";
  const clientEmail    = client?.email || (booking as any).clientEmail || "";
  const clientGst      = (booking as any).clientGst || (booking as any).client_gst || "";
  const membershipName = (booking as any).membershipName || (booking as any).membership_name || "";

  // Client's current referral earnings / active memberships / active
  // packages — passed in via the `client` param since booking itself only
  // ever carries the items purchased on THIS appointment, not the client's
  // overall standing.
  const referralCode = (client as any)?.referralCode ?? null;
  const referralEarnings = (client as any)?.referralEarnings ?? null;
  const activeMemberships: { membershipName: string; membershipWalletBalance: number; expiresAt?: string | null }[] = (client as any)?.activeMemberships ?? [];
  const activePackages: { packageName: string; remaining: number; total: number }[] = (client as any)?.activePackages ?? [];
  const primaryMembershipName = activeMemberships[0]?.membershipName || membershipName;
  const fmtDate = (raw?: string | null) => {
    if (!raw) return "";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // invoiceNumber now already carries the full "INV-00002"-style value from
  // the linked sale (see appointments.repository.ts/bookingMapper.ts) — no
  // longer a bare sequence number that needs its own INV- prefix/padding here.
  const invoiceSeq = (booking as any).invoiceNumber || (booking as any).invoice_number;
  const invoiceNo  = invoiceSeq
    ? String(invoiceSeq)
    : `INV-${String(booking.id).slice(0, 8).toUpperCase()}`;
  // Always derived from the appointment's own id — genuinely distinct from
  // Invoice No (the sales/billing record's own sequence, which only exists
  // once the visit is actually billed). Previously this reused invoiceSeq
  // too, so "Booking #" just silently repeated the invoice number.
  const bookingNo = String(booking.id).slice(0, 8).toUpperCase();

  const apptDate = (booking as any).billDate || (booking as any).date || "—";
  const fmtDDMMYYYY = (raw: string) => {
    if (!raw || raw === "—") return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };
  const apptTime = `${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}`;

  const isCancelled = ((booking as any).status || "").toLowerCase() === "cancelled";
  const rawPs = isCancelled ? "Cancelled" : normalizePaymentStatus(booking.status);
  const PAY_COLOR: Record<string, string> = { Paid: "#15803d", Partial: "#7c3aed", Unpaid: "#b45309", Cancelled: "#dc2626" };
  const PAY_BG:    Record<string, string> = { Paid: "#dcfce7", Partial: "#ede9fe", Unpaid: "#fef3c7", Cancelled: "#fee2e2" };
  const payColor = PAY_COLOR[rawPs] ?? "#b45309";
  const payBg    = PAY_BG[rawPs]    ?? "#fef3c7";
  // A real Package-covered booking is the ONLY case that should zero out this
  // whole receipt — detected the same explicit way bookingMapper.ts's own
  // isPackagePaid does (payment_method === "package"), never guessed from
  // symptoms. A "grandTotal === 0" / "payingNow === 0 && due === 0" heuristic
  // also matches any bill fully covered by non-cash credit (membership
  // wallet, eWallet, reward points, referral), so a real ₹1,147
  // membership-wallet-covered bill printed as ₹0.00 across every row.
  const isPackagePaid = String((booking as any).paymentMode || "").toLowerCase() === "package";

  const allStaffIds = Array.from(new Set(
    [booking.staffId, ...(booking.services || []).map((s: any) => s.staffId)].filter(Boolean)
  )) as string[];
  const allStaffDisplay = allStaffIds.map((id) => findStaffName(id)).filter(Boolean).join(", ") || "—";

  const services        = booking.services || [];
  const packageItems    = (booking as any).packageItems  || (booking as any).packages     || [];
  const membershipItems = (booking as any).membershipItems || (booking as any).memberships || [];
  const productItems    = (booking as any).productItems  || (booking as any).products      || [];

  // Prefer the caller's own useCurrency().formatAmount (reflects the salon's
  // actual selected currency) — this fallback only covers a caller that
  // hasn't been updated to pass it, and shows real ₹ formatting rather than
  // repeating the old bug of printing bare numbers with no symbol at all.
  const fmt = opts?.formatAmount
    ?? ((n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  // ── Table rows ────────────────────────────────────────────────────────────
  let srNo = 0;
  const BADGE: Record<string, [string, string]> = {
    Service:    ["#ede9fe", "#5b21b6"],
    Package:    ["#fef3c7", "#92400e"],
    Membership: ["#dcfce7", "#15803d"],
    Product:    ["#dbeafe", "#1d4ed8"],
  };

  // Tax breakdown is a bill-level figure (per-tax-name, not per line item —
  // buckets get merged together upstream in computeTotals()), so each row's
  // own "Tax" column is a proportional share: row total × the combined rate.
  // Accurate whenever one tax configuration applies uniformly across the
  // items on the bill (the common case); falls back to the older blended
  // gst% field for bookings saved before per-tax breakdown existed.
  const taxBreakdownEarly = ((booking as any).taxBreakdown || []) as { name: string; rate: number; amount: number; inclusive: boolean }[];
  const taxRatePct = taxBreakdownEarly.length > 0
    ? taxBreakdownEarly.reduce((s, t) => s + (Number(t.rate) || 0), 0)
    : Number((booking as any).gst || 0);
  const taxLabel = taxBreakdownEarly.length > 0
    ? taxBreakdownEarly.map((t) => `${t.name} ${t.rate}%`).join(" + ")
    : (taxRatePct > 0 ? `${taxRatePct}%` : "");
  // Inclusive taxes are already baked into the row's price and must be backed
  // out (same math as computeBucketTax in totalsUtils.ts), not added on top
  // like an exclusive tax — otherwise this column disagrees with the Payment
  // Summary below, which does compute it correctly.
  const inclusiveRatePct = taxBreakdownEarly.filter((t) => t.inclusive).reduce((s, t) => s + (Number(t.rate) || 0), 0);
  const exclusiveRatePct = taxBreakdownEarly.length > 0
    ? taxBreakdownEarly.filter((t) => !t.inclusive).reduce((s, t) => s + (Number(t.rate) || 0), 0)
    : taxRatePct;

  // Running sum of every row's gross (tax-inclusive) amount — filled in as
  // makeRow renders each line, read back by the "Items Total" footer so the
  // AMOUNT column always adds up to its own total.
  let grossItemsTotal = 0;
  const makeRow = (
    name: string, type: string, staff: string, time: string,
    qty: number, price: number, discount: number, total: number,
    isEven: boolean, realTax?: number,
  ) => {
    srNo++;
    const [badgeBg, badgeColor] = BADGE[type] ?? ["#f3f4f6", "#374151"];
    const rowBg = isEven ? "#f9fafb" : "#ffffff";
    // Prefer the item's own real, backend-computed GST (attached once the
    // appointment has a linked, paid sale — see bookingMapper.ts/
    // appointmentsService's enrichItemsWithTax) over this blended
    // bill-level-rate approximation, which only stays accurate when a single
    // tax configuration applies uniformly across every item on the bill.
    let rowTax: number;
    // Only EXCLUSIVE tax adds to the row's gross amount — an inclusive tax is
    // already baked into `total`, so adding it again would double-count.
    let rowExclusiveTax: number;
    if (realTax !== undefined) {
      rowTax = realTax;
      // sale_items.tax_amount bundles exclusive+inclusive; treat it as
      // exclusive unless the salon's tax config is purely inclusive.
      rowExclusiveTax = (exclusiveRatePct === 0 && inclusiveRatePct > 0) ? 0 : realTax;
    } else {
      const rowInclusiveTax = inclusiveRatePct > 0 ? (total * inclusiveRatePct) / (100 + inclusiveRatePct) : 0;
      rowExclusiveTax = exclusiveRatePct > 0 ? (total * exclusiveRatePct) / 100 : 0;
      rowTax = rowInclusiveTax + rowExclusiveTax;
    }
    // AMOUNT column is the gross line total the client pays for this line =
    // post-discount base + its own exclusive GST (so a ₹1,500 service at 5%
    // reads ₹1,575). Accumulated into grossItemsTotal for the "Items Total"
    // footer so the column reconciles to its own sum.
    const grossAmount = total + rowExclusiveTax;
    grossItemsTotal += grossAmount;
    return `
    <tr style="background:${rowBg};-webkit-print-color-adjust:exact;print-color-adjust:exact">
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:11px">${srNo}</td>
      <td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;color:#111827;font-size:12px">${name}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center">
        <span style="display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;background:${badgeBg};color:${badgeColor};letter-spacing:0.3px;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact">${type}</span>
      </td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center;font-size:11px;color:#374151">${staff || "—"}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center;font-size:11px;color:#374151">${time || "—"}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;color:#111827">${qty}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:right;font-size:12px;color:#111827">${fmt(price)}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:right;font-size:12px;color:${discount > 0 ? "#dc2626" : "#9ca3af"}">${discount > 0 ? `−${fmt(discount)}` : "—"}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:right;font-size:11px;color:#374151">
        ${rowTax > 0 ? `${fmt(rowTax)}<div style="font-size:9px;color:#9ca3af;margin-top:1px">${taxLabel}</div>` : "—"}
      </td>
      <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;font-size:12px;color:#111827">${fmt(grossAmount)}</td>
    </tr>`;
  };

  let rowIdx = 0;
  const svcRows  = services.map((s: any) => makeRow(s.service || s.name || "", "Service", findStaffName(s.staffId) || allStaffDisplay, s.time ? formatTime12(s.time) : "—", Number(s.qty||1), Number(s.price||0), Number(s.discount||0), isPackagePaid ? 0 : Number(s.total||s.price||0), (rowIdx++ % 2 === 0), s.tax)).join("");
  const pkgRows  = packageItems.map((p: any) => makeRow(p.packageName||p.name||"", "Package", findStaffName(p.staffId)||"—", p.time ? formatTime12(p.time) : "—", Number(p.qty||1), Number(p.price||0), Number(p.discount||0), Number(p.total||p.price||0), (rowIdx++ % 2 === 0), p.tax)).join("");
  const memRows  = membershipItems.map((m: any) => makeRow(m.membershipName||m.name||"", "Membership", findStaffName(m.staffId)||"—", "—", Number(m.qty||1), Number(m.price||0), Number(m.discount||0), Number(m.total||m.price||0), (rowIdx++ % 2 === 0), m.tax)).join("");
  const prodRows = productItems.map((p: any) => makeRow(p.productName||p.name||"", "Product", findStaffName(p.staffId)||"—", p.time ? formatTime12(p.time) : "—", Number(p.qty||1), Number(p.price||0), Number(p.discount||0), Number(p.total||p.price||0), (rowIdx++ % 2 === 0), p.tax)).join("");
  const allItemRows = svcRows + pkgRows + memRows + prodRows;

  // ── Payment summary ───────────────────────────────────────────────────────
  // Item-level "Disc %" and the bill-level discount below can both be active
  // at once and stack — broken out explicitly so the printed bill shows how
  // much came from each, same reasoning as the live AppointmentModal summary.
  const allBillItems = [...services, ...packageItems, ...productItems, ...membershipItems];
  const itemsCatalogTotal = allBillItems.reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.qty ?? i.quantity ?? 1) || 1), 0);
  const itemsNetTotal = allBillItems.reduce((s: number, i: any) => s + (Number(i.total ?? i.price) || 0), 0);
  const itemDiscountAmt = Math.max(0, itemsCatalogTotal - itemsNetTotal);
  const subtotalAmt = Number((booking as any).subtotal      || 0);
  const manualDisc  = Number((booking as any).discountAmount || 0);
  const couponDisc  = Number((booking as any).couponDiscount || 0);
  const couponCode  = (booking as any).couponCode || "";
  const referralDisc = Number((booking as any).referralDiscount || 0);
  // Pre-tax price reduction from a Discount Balance/Loyalty membership —
  // already baked into grandTotal (see payments.service.ts), so it has to be
  // subtracted here too or the gap between the un-adjusted rawGrandTotal and
  // the real grandTotal gets mislabeled as "Round Off" below instead of
  // showing as its own line.
  const membershipDiscountAmt = Number((booking as any).membershipDiscountUsed || 0);
  // Split for display only — see ViewBillModal.tsx's identical split for why.
  const membershipPercentageDiscountAmt = Number((booking as any).membershipPercentageDiscountUsed || 0);
  const membershipLoyaltyDiscountAmt = Math.max(0, membershipDiscountAmt - membershipPercentageDiscountAmt);
  const exCharges   = Number((booking as any).exCharges     || 0);
  const tipAmt      = Number((booking as any).tipAmount     || 0);
  const gstPct      = Number((booking as any).gst           || 0);
  const gstAmt      = Number((booking as any).gstAmount     || 0);
  const taxBreakdown = ((booking as any).taxBreakdown || []) as { name: string; rate: number; amount: number; inclusive: boolean }[];
  const grandTotal  = Number(booking.grandTotal || 0);
  // grandTotal is already rounded to a whole rupee (see computeTotals()) — the
  // receipt shows the small adjustment that produced it, same as the on-screen
  // totals panel/summary the client saw moments earlier at checkout.
  const exclusiveTaxTotal = taxBreakdown.length > 0
    ? taxBreakdown.filter((t) => !t.inclusive && t.amount > 0).reduce((s, t) => s + t.amount, 0)
    : gstAmt;
  const rawGrandTotal = subtotalAmt - manualDisc - couponDisc - referralDisc - membershipDiscountAmt + exCharges + exclusiveTaxTotal;
  const roundOff = grandTotal - rawGrandTotal;
  const paidAmt     = Number(booking.payingNow  || 0);
  const dueAmt      = Number(booking.dueAmount  || 0);
  const rewardPointsValuePaid = Number((booking as any).rewardPointsValue || 0);
  const membershipWalletUsedAmt = Number((booking as any).membershipWalletUsed || 0);
  const referralCreditUsedAmt = Number((booking as any).referralCreditUsed || 0);
  // eWallet can arrive either as its own field (calendar prints patch it from
  // the saved payment) or as a leg inside splitDetails (older records) — show
  // one dedicated line either way, and drop the splitDetails leg below so the
  // same amount is never printed twice.
  const splitDetailsRaw = ((booking as any).splitDetails || {}) as Record<string, unknown>;
  const splitEwallet = Number(Object.entries(splitDetailsRaw).find(([k]) => k.toLowerCase() === "ewallet")?.[1]) || 0;
  const ewalletUsedAmt = Number((booking as any).ewalletUsed || 0) || splitEwallet;
  // Per-method breakdown of the actual payment (Cash/Card/UPI/Package —
  // eWallet/membership wallet aren't part of this map, they're tracked
  // separately above).
  const splitEntries = Object.entries(splitDetailsRaw)
    .map(([k, v]) => [k, Number(v) || 0] as [string, number])
    .filter(([k, v]) => v > 0 && k.toLowerCase() !== "ewallet");
  // Only call out the breakdown when it's genuinely mixed, or the sole method
  // is something other than plain Cash/Card/UPI (eWallet/Package) — a plain
  // single-method Cash payment already has "Amount Paid" + the Payment Method
  // field above, so a "Paid via Cash" line would just be noise there.
  const showPaymentBreakdown = splitEntries.length > 1
    || splitEntries.some(([k]) => !["cash", "card", "upi"].includes(k.toLowerCase()))
    // A mixed wallet + cash/card payment is genuinely split even when the
    // splitDetails map itself only has the single cash/card leg left in it.
    || (splitEntries.length === 1 && (ewalletUsedAmt > 0 || membershipWalletUsedAmt > 0 || rewardPointsValuePaid > 0 || referralCreditUsedAmt > 0));
  const METHOD_COLOR: Record<string, string> = { ewallet: "#2563eb", package: "#92400e" };

  const sumRow = (label: string, value: string, bold = false, color = "#111827", borderDouble = false) =>
    `<tr>
      <td style="padding:6px 12px;font-size:12px;font-weight:${bold ? 700 : 500};color:${color};border:1px solid #e5e7eb;${borderDouble ? "border-top:2px solid #111827;" : ""}">${label}</td>
      <td style="padding:6px 12px;text-align:right;font-size:12px;font-weight:${bold ? 700 : 500};color:${color};border:1px solid #e5e7eb;${borderDouble ? "border-top:2px solid #111827;" : ""}">${value}</td>
    </tr>`;

  const summaryRows = [
    itemDiscountAmt > 0 ? sumRow("Items Total",   fmt(itemsCatalogTotal)) : "",
    itemDiscountAmt > 0 ? sumRow("Item Discount", `−${fmt(itemDiscountAmt)}`, false, "#dc2626") : "",
    subtotalAmt > 0 ? sumRow("Subtotal",        fmt(subtotalAmt)) : "",
    manualDisc  > 0 ? sumRow("Svc Discount",     `−${fmt(manualDisc)}`, false, "#dc2626") : "",
    couponDisc  > 0 ? sumRow(`Coupon${couponCode ? ` (${couponCode})` : ""}`, `−${fmt(couponDisc)}`, false, "#dc2626") : "",
    referralDisc > 0 ? sumRow("Referral Discount", `−${fmt(referralDisc)}`, false, "#dc2626") : "",
    membershipPercentageDiscountAmt > 0 ? sumRow("Membership Discount", `−${fmt(membershipPercentageDiscountAmt)}`, false, "#dc2626") : "",
    membershipLoyaltyDiscountAmt > 0 ? sumRow("Membership Loyalty", `−${fmt(membershipLoyaltyDiscountAmt)}`, false, "#dc2626") : "",
    exCharges   > 0 ? sumRow("Extra Charges",    `+${fmt(exCharges)}`) : "",
    tipAmt      > 0 ? sumRow("Tip (Staff)",       `+${fmt(tipAmt)}`) : "",
    // Itemized per-tax lines (CGST, SGST, etc.) + a "Total Tax" subtotal —
    // e.g. "CGST 9%" / "SGST/UTGST 9%" / "Total Tax". Falls back to the old
    // single blended "GST" line for bookings saved before this. When "Show
    // GST breakup on invoice" is off, collapse straight to just the total —
    // tax is still charged and shown, just not itemized per component.
    ...(taxBreakdown.length > 0
      ? [
          ...(showTaxBreakup
            ? taxBreakdown
                .filter((t) => t.amount > 0)
                .map((t) => sumRow(
                  `${t.name} ${t.rate}%${t.inclusive ? " (incl.)" : ""}`,
                  `${t.inclusive ? "" : "+"}${fmt(t.amount)}`,
                ))
            : []),
          sumRow(
            "Total Tax",
            fmt(taxBreakdown.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0)),
            false, "#111827",
          ),
        ]
      : [gstAmt > 0 ? sumRow(`GST${gstPct > 0 ? ` (${gstPct}%)` : ""}`, `+${fmt(gstAmt)}`) : ""]),
    !isPackagePaid && Math.abs(roundOff) >= 0.005
      ? sumRow("Round Off", `${roundOff >= 0 ? "+" : "−"}${fmt(Math.abs(roundOff))}`)
      : "",
    sumRow("Grand Total", fmt(isPackagePaid ? 0 : grandTotal), true, "#111827", true),
    rewardPointsValuePaid > 0 ? sumRow("Paid from Reward Points", fmt(rewardPointsValuePaid), false, "#7c3aed") : "",
    membershipWalletUsedAmt > 0 ? sumRow("Paid via Membership Wallet", fmt(membershipWalletUsedAmt), false, "#15803d") : "",
    ewalletUsedAmt > 0 ? sumRow("Paid via eWallet", fmt(ewalletUsedAmt), false, "#2563eb") : "",
    referralCreditUsedAmt > 0 ? sumRow("Paid via Referral Credit", fmt(referralCreditUsedAmt), false, "#0891b2") : "",
    showPaymentBreakdown
      ? splitEntries.map(([method, amt]) =>
          sumRow(`Paid via ${method}`, fmt(amt), false, METHOD_COLOR[method.toLowerCase()] ?? "#111827")
        ).join("")
      : "",
    paidAmt > 0 ? sumRow("Amount Paid", fmt(paidAmt), false, "#15803d") : "",
    dueAmt  > 0 ? sumRow("Balance Due", fmt(dueAmt),  true,  "#dc2626") : "",
  ].filter(Boolean).join("");

  // ── Info helper ───────────────────────────────────────────────────────────
  const infoCell = (label: string, value: string) =>
    `<div style="margin-bottom:10px">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:2px">${label}</div>
      <div style="font-size:12px;font-weight:600;color:#111827;line-height:1.4">${value || "—"}</div>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${invoiceNo} — ${salonName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#111827;background:#d1d5db;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{position:relative;width:210mm;min-height:297mm;margin:12mm auto;background:#ffffff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}
  .inv-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:52px;font-weight:800;letter-spacing:2px;color:rgba(107,114,128,0.14);pointer-events:none;z-index:1;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Top bar: logo left, invoice title right ── */
  .inv-topbar{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 32px 20px;border-bottom:2px solid #111827}
  .inv-logo{width:68px;height:68px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;flex-shrink:0}
  .inv-logo-placeholder{width:68px;height:68px;border-radius:8px;background:#f3f4f6;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#374151;flex-shrink:0}
  .inv-salon-block{display:flex;align-items:flex-start;gap:14px;min-width:0}
  .inv-salon-name{font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.3px;margin-bottom:4px}
  /* max-width + word-break so a long address wraps onto its own second line
     instead of stretching past the page edge. */
  .inv-salon-meta{font-size:10.5px;color:#6b7280;line-height:1.8;max-width:360px}
  .inv-salon-meta span{display:block;word-break:break-word}
  .inv-title-block{text-align:right;flex-shrink:0}
  .inv-title-word{font-size:26px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:2px;line-height:1}
  .inv-meta-table{margin-top:10px;font-size:11px;color:#374151;border-collapse:collapse}
  .inv-meta-table td{padding:2px 0 2px 16px;text-align:right}
  .inv-meta-table td:first-child{color:#6b7280;font-weight:600;text-transform:uppercase;font-size:9.5px;letter-spacing:0.4px;padding-left:0;text-align:left}

  /* ── Bill To + Appointment strip ── */
  .inv-info{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e5e7eb}
  .inv-info-col{padding:16px 32px}
  .inv-info-col+.inv-info-col{border-left:1px solid #e5e7eb}
  .inv-section-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#111827;background:#f3f4f6;display:inline-block;padding:2px 8px;border-radius:3px;margin-bottom:12px}
  /* Single column — Bill To has an odd field count (Name/Phone/Email, plus
     optional GST/Membership/Referral rows), so a 2-column grid staggered
     unpredictably depending on which optional fields were present, leaving
     a field from one row sitting next to an unrelated field from the next. */
  .inv-info-grid{display:grid;grid-template-columns:1fr;gap:0}

  /* ── Payment status badge ── */
  .pay-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;border:1px solid currentColor}

  /* ── Items table ── */
  .inv-table-section{padding:0 32px 20px}
  .inv-section-header{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#111827;margin:18px 0 10px;padding-bottom:5px;border-bottom:2px solid #111827}
  table.inv-table{width:100%;border-collapse:collapse;font-size:11.5px}
  table.inv-table thead th{padding:8px 10px;background:#f9fafb;color:#111827;font-size:9.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;border:1px solid #d1d5db;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table.inv-table thead th:nth-child(1){text-align:center;width:36px}
  table.inv-table thead th:nth-child(2){text-align:left}
  table.inv-table thead th:nth-child(3){text-align:center}
  table.inv-table thead th:nth-child(4){text-align:center}
  table.inv-table thead th:nth-child(5){text-align:center}
  table.inv-table thead th:nth-child(6){text-align:center;width:36px}
  table.inv-table thead th:nth-child(7){text-align:right}
  table.inv-table thead th:nth-child(8){text-align:right}
  table.inv-table thead th:nth-child(9){text-align:right}
  table.inv-table tbody td{border:1px solid #e5e7eb}
  table.inv-table tfoot td{padding:8px 12px;font-size:11.5px;font-weight:700;color:#111827;border:1px solid #d1d5db;background:#f9fafb;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Summary + notes ── */
  .inv-bottom{display:grid;grid-template-columns:1fr auto;gap:32px;padding:0 32px 24px;align-items:start}
  .inv-notes{font-size:11px;color:#374151;line-height:1.7;border:1px solid #e5e7eb;border-radius:4px;padding:10px 14px}
  .inv-notes-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#374151;margin-bottom:5px}
  .inv-summary-table{width:240px;border-collapse:collapse}
  .inv-summary-table td{padding:6px 12px;font-size:12px;border:1px solid #e5e7eb;color:#111827}

  /* ── Footer ── */
  .inv-footer{margin-top:auto;border-top:2px solid #111827;padding:16px 32px 18px;display:flex;justify-content:space-between;align-items:center;gap:16px}
  .inv-footer-left{font-size:12px;color:#111827;flex-shrink:0}
  .inv-footer-left strong{font-size:13px;font-weight:800}
  /* flex:1 + min-width:0 lets this shrink below its content's natural width
     (flex items don't by default) so a long address wraps instead of
     stretching the row and pushing inv-footer-right off the page. */
  .inv-footer-center{font-size:10px;color:#6b7280;text-align:center;line-height:1.8;flex:1;min-width:0;word-break:break-word}
  .inv-footer-right{font-size:10px;color:#6b7280;text-align:right;line-height:1.8;flex-shrink:0}

  /* ── Screen toolbar ── */
  .print-toolbar{position:fixed;top:0;left:0;right:0;height:50px;background:#111827;display:flex;align-items:center;justify-content:space-between;padding:0 24px;z-index:9999;box-shadow:0 2px 10px rgba(0,0,0,.3)}
  .pt-brand{font-size:13px;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px}
  .pt-brand span{font-size:11px;color:rgba(255,255,255,.45);font-weight:400}
  .pt-actions{display:flex;align-items:center;gap:8px}
  .pt-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:opacity .15s;white-space:nowrap}
  .pt-btn:hover{opacity:.82}
  .pt-btn--primary{background:#2563eb;color:#fff}
  .pt-btn--ghost{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18)}
  .pt-btn--danger{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.25)}
  .pt-divider{width:1px;height:22px;background:rgba(255,255,255,.14);margin:0 4px}
  body{padding-top:50px}

  @media print{
    .print-toolbar{display:none}
    body{background:#fff;padding-top:0}
    .page{width:100%;margin:0;box-shadow:none;min-height:100vh}
    table.inv-table{page-break-inside:auto}
    table.inv-table thead{display:table-header-group}
    table.inv-table tr{page-break-inside:avoid}
    .inv-bottom{page-break-inside:avoid}
    .inv-footer{page-break-inside:avoid}
  }
  #orient-style{display:none}
</style>
<style id="orient-style">@page{size:A4 portrait;margin:0}</style>
<script>
  function doPrint(){window.print();}
  function savePdf(){window.print();}
  var _landscape=false;
  function toggleLandscape(){
    _landscape=!_landscape;
    var s=document.getElementById('orient-style');
    var btn=document.getElementById('btn-landscape');
    if(_landscape){
      s.textContent='@page{size:A4 landscape;margin:0}.page{width:297mm;min-height:210mm}';
      btn.textContent='Portrait';btn.title='Switch to Portrait';
    } else {
      s.textContent='@page{size:A4 portrait;margin:0}.page{width:210mm;min-height:297mm}';
      btn.textContent='Landscape';btn.title='Switch to Landscape';
    }
  }
</script>
</head>
<body>

<!-- Screen toolbar -->
<div class="print-toolbar">
  <div class="pt-brand">Salonox &mdash; Receipt Preview <span>${invoiceNo}</span></div>
  <div class="pt-actions">
    <button class="pt-btn pt-btn--primary" onclick="doPrint()">Print</button>
    <button class="pt-btn pt-btn--ghost"   onclick="savePdf()">Save PDF</button>
    <div class="pt-divider"></div>
    <button class="pt-btn pt-btn--ghost" id="btn-landscape" onclick="toggleLandscape()">Landscape</button>
    <div class="pt-divider"></div>
    <button class="pt-btn pt-btn--danger" onclick="window.close()">&#x2715; Close</button>
  </div>
</div>

<div class="page">
  ${!opts?.auto ? `<div class="inv-watermark">${salonName}</div>` : ""}

  <!-- ═══ TOP BAR: Salon info left · Invoice title right ═══ -->
  <div class="inv-topbar">
    <div class="inv-salon-block">
      ${logoUrl
        ? `<img class="inv-logo" src="${logoUrl}" alt="${salonName}" onerror="this.style.display='none'">`
        : `<div class="inv-logo-placeholder">${salonName.charAt(0).toUpperCase()}</div>`}
      <div>
        <div class="inv-salon-name">${salonName}</div>
        <div class="inv-salon-meta">
          ${salonAddress ? `<span>${salonAddress}</span>` : ""}
          ${salonPhone   ? `<span>Ph: ${salonPhone}</span>` : ""}
          ${salonEmail   ? `<span>${salonEmail}</span>` : ""}
          ${salonWebsite ? `<span>${salonWebsite}</span>` : ""}
          ${gst          ? `<span>GSTIN: ${gst}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="inv-title-block">
      <div class="inv-title-word">Invoice</div>
      <table class="inv-meta-table">
        <tr><td>Invoice No</td><td><strong>${invoiceNo}</strong></td></tr>
        <tr><td>Booking #</td><td>${bookingNo}</td></tr>
        <tr><td>Invoice Date</td><td>${fmtDDMMYYYY(apptDate)}</td></tr>
        <tr><td>Payment Status</td><td style="color:${payColor};font-weight:700">${rawPs}</td></tr>
      </table>
    </div>
  </div>

  <!-- ═══ BILL TO + APPOINTMENT ═══ -->
  <div class="inv-info">
    <div class="inv-info-col">
      <div class="inv-section-label">Bill To</div>
      <div class="inv-info-grid">
        ${infoCell("Name",       booking.clientName  || "Walk-In")}
        ${infoCell("Phone",      clientPhone || "—")}
        ${infoCell("Email",      clientEmail         || "—")}
        ${clientGst              ? infoCell("GST No",     clientGst)                : ""}
        ${primaryMembershipName  ? infoCell("Membership", primaryMembershipName)     : ""}
        ${referralCode           ? infoCell("Your Referral Code", referralCode)      : ""}
        ${referralEarnings !== null ? infoCell("Referral Earnings", `${fmt(Number(referralEarnings))}`) : ""}
      </div>
    </div>
    <div class="inv-info-col">
      <div class="inv-section-label">Appointment Details</div>
      <div class="inv-info-grid">
        ${infoCell("Date",           apptDate)}
        ${infoCell("Time",           apptTime)}
        ${infoCell("Staff",          allStaffDisplay)}
        ${infoCell("Payment Method", (booking as any).paymentMode || "—")}
        ${infoCell("Booking Status", (booking as any).status       || "Confirmed")}
        ${infoCell("Payment Status", `<span class="pay-badge" style="background:${payBg};color:${payColor};-webkit-print-color-adjust:exact;print-color-adjust:exact">${rawPs}</span>`)}
      </div>
    </div>
  </div>

  <!-- ═══ ITEMS TABLE ═══ -->
  <div class="inv-table-section">
    <div class="inv-section-header">Services &amp; Items</div>
    <table class="inv-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Item Name</th>
          <th>Type</th>
          <th>Staff</th>
          <th>Time</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Disc.</th>
          <th>Tax</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${allItemRows || `<tr><td colspan="10" style="text-align:center;padding:20px;color:#9ca3af;border:1px solid #e5e7eb">No items</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="9" style="text-align:right;padding:8px 12px;font-size:11px;color:#374151">Items Total</td>
          <td style="text-align:right;padding:8px 12px;font-weight:700;color:#111827">${fmt(grossItemsTotal)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- ═══ PAYMENT SUMMARY + NOTES ═══ -->
  <div class="inv-bottom">
    <div>
      ${booking.notes ? `<div class="inv-notes"><div class="inv-notes-title">Notes</div>${booking.notes}</div>` : ""}
      ${(booking as any).staffAlert ? `<div class="inv-notes" style="margin-top:8px"><div class="inv-notes-title">Staff Alert</div>${(booking as any).staffAlert}</div>` : ""}
      ${activePackages.length > 0 ? `<div class="inv-notes" style="margin-top:8px"><div class="inv-notes-title">Active Packages</div>${activePackages.map(p => `${p.packageName} — ${p.remaining}/${p.total} sessions left`).join("<br>")}</div>` : ""}
      ${activeMemberships.length > 0 ? `<div class="inv-notes" style="margin-top:8px"><div class="inv-notes-title">Active Memberships</div>${activeMemberships.map(m => `${m.membershipName}${m.expiresAt ? ` — Expires: ${fmtDate(m.expiresAt)}` : ""}`).join("<br>")}</div>` : ""}
    </div>
    <div>
      <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#111827;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #111827">Payment Summary</div>
      <table class="inv-summary-table">
        <tbody>${summaryRows}</tbody>
      </table>
    </div>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="inv-footer">
    <div class="inv-footer-left">
      <strong>Thank you for choosing ${salonName}!</strong><br>
      <span style="font-size:11px;color:#6b7280">We look forward to seeing you again.</span>
    </div>
    <div class="inv-footer-center">
      ${[salonPhone, salonEmail].filter(Boolean).join(" &nbsp;|&nbsp; ")}<br>
      ${salonAddress || ""}
      ${gst ? `<br>GSTIN: ${gst}` : ""}
    </div>
    <div class="inv-footer-right">
      This is a computer-generated receipt.<br>
      No signature required.<br>
      <strong style="color:#374151;font-size:11px">Powered by Salonox</strong>
    </div>
  </div>

</div>
</body>
</html>`;

  // Auto-print (right after payment): window.open would be popup-blocked here,
  // because the awaits before it consumed the user's click activation. A hidden
  // same-page iframe needs no popup permission and opens the print dialog directly.
  // The .print-toolbar is display:none under @media print, so the printout is clean.
  if (opts?.auto) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }
    doc.open();
    doc.write(html);
    doc.close();
    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch { /* printing unavailable — nothing else to try */ }
      // The print dialog blocks script; remove the iframe well after it's dismissed
      setTimeout(() => iframe.remove(), 60_000);
    };
    // Small delay lets the logo/images render before the dialog snapshots the page
    if (doc.readyState === "complete") setTimeout(triggerPrint, 200);
    else iframe.addEventListener("load", () => setTimeout(triggerPrint, 200));
    return;
  }

  const win = window.open("", "_blank", "width=960,height=860");
  if (!win) { alert("Please allow popups to print the receipt."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}
