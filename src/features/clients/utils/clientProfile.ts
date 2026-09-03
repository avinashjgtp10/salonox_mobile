import type {
  ClientAppointmentRecord,
  ClientMembershipRecord,
  ClientPackageRecord,
  ClientHistoryStats,
  ClientSaleRecord,
} from "@/types/client";

// Derived Client Profile figures.
//
// Every formula here is a deliberate port of the Web Client History screen
// (salon_mgm_frontend ClientHistoryDetail.tsx) so the two platforms can never
// disagree about the same client again. Where Web and the backend `stats`
// object differ, Web wins — the backend's own `lifetime_spend` and
// `last_visit_at` are intentionally NOT used, for the reasons documented on
// each formula below.
//
// All inputs come from a single GET /clients/:id/history response. Web makes
// two extra calls (/client-packages, /client-memberships) purely to work out
// standalone purchase revenue, because of a stale comment claiming /history
// "doesn't select appointment_id" — it does (see clients.controller.ts
// getHistory, packages and memberships legs), so that revenue is computed
// here from the history payload alone and no extra request is needed.

export type ClientProfileLineEntry = {
  /** Stable list key — records are merged from several sources, ids can repeat. */
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  /** `null` when no sale_items row backs the entry — render "–", never 0. */
  discountAmount: number | null;
  taxAmount: number | null;
  invoiceNumber: string | null;
  date: string | null;
  staffId: string | null;
  source: "sale" | "appointment";
};

export type ClientProfileMetrics = {
  totalVisits: number;
  totalSpend: number;
  amountDue: number;
  averageSpend: number;
  lastVisit: string | null;
  nextAppointment: string | null;
  serviceRevenue: number;
  productRevenue: number;
  upcomingAppointments: ClientAppointmentRecord[];
  services: ClientProfileLineEntry[];
  products: ClientProfileLineEntry[];
  activeMemberships: ClientMembershipRecord[];
  pastMemberships: ClientMembershipRecord[];
  packages: ClientPackageRecord[];
  lastServiceTaken: string | null;
};

export type ClientProfileSource = {
  stats: ClientHistoryStats | null;
  appointments: ClientAppointmentRecord[];
  sales: ClientSaleRecord[];
  packages: ClientPackageRecord[];
  memberships: ClientMembershipRecord[];
};

const PACKAGE_MATCH_AMOUNT_TOLERANCE = 0.5;
const PACKAGE_MATCH_TIME_WINDOW_MS = 24 * 60 * 60 * 1000;

const toTime = (value: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const byDateDesc = (left: string | null, right: string | null) => toTime(right) - toTime(left);

/**
 * A package purchase produces both a `sales` row and a `client_packages` row
 * for the same event. Match them so the sale mirror can be excluded from the
 * walk-in visit count — otherwise buying a package inflates Total Visits.
 * Prefers the real `sale_id` link, falling back to a name/amount/time match
 * for packages predating that column being populated.
 */
const buildPackageSaleIds = (
  packages: ClientPackageRecord[],
  sales: ClientSaleRecord[],
): Set<string> => {
  const usedSaleIds = new Set<string>();
  const salesById = new Map(sales.map((sale) => [sale.id, sale]));

  packages.forEach((pkg) => {
    const linkedSale = pkg.saleId ? salesById.get(pkg.saleId) : undefined;

    if (linkedSale && !usedSaleIds.has(linkedSale.id)) {
      usedSaleIds.add(linkedSale.id);
      return;
    }

    const packageTime = toTime(pkg.createdDate);
    const matchedSale = sales.find((sale) => {
      if (usedSaleIds.has(sale.id)) return false;
      const packageItem = sale.items.find(
        (item) => item.name === pkg.packageName && item.itemType === "package",
      );
      if (!packageItem) return false;
      if (Math.abs(packageItem.totalPrice - pkg.totalAmount) > PACKAGE_MATCH_AMOUNT_TOLERANCE) return false;
      return Math.abs(toTime(sale.createdAt) - packageTime) < PACKAGE_MATCH_TIME_WINDOW_MS;
    });

    if (matchedSale) {
      usedSaleIds.add(matchedSale.id);
    }
  });

  return usedSaleIds;
};

/**
 * An appointment counts as paid if its linked sale is completed, or — with no
 * linked sale — its own payment fields say so.
 */
const buildIsAppointmentPaid = (saleByAppointmentId: Map<string, ClientSaleRecord>) =>
  (appointment: ClientAppointmentRecord) => {
    const linkedSale = saleByAppointmentId.get(appointment.id);

    return linkedSale
      ? linkedSale.status === "completed"
      : appointment.paymentStatus === "paid" || appointment.amountPaid > 0;
  };

export const buildClientProfileMetrics = ({
  stats,
  appointments,
  sales,
  packages,
  memberships,
}: ClientProfileSource): ClientProfileMetrics => {
  const now = Date.now();
  const saleByAppointmentId = new Map(
    sales.filter((sale) => sale.appointmentId).map((sale) => [sale.appointmentId as string, sale]),
  );
  const isAppointmentPaid = buildIsAppointmentPaid(saleByAppointmentId);

  // ── Total Visits ─────────────────────────────────────────────────────────
  // Backend paid/partial appointment count, plus genuine walk-in quick sales.
  // Package-purchase sale mirrors and non-completed sales are excluded — they
  // are not visits (Web: SCRUM-1109).
  const packageSaleIds = buildPackageSaleIds(packages, sales);
  const quickSales = sales.filter((sale) => !sale.appointmentId);
  const walkInVisitCount = quickSales.filter(
    (sale) => sale.status === "completed" && !packageSaleIds.has(sale.id),
  ).length;
  const totalVisits = (stats?.completedAppointments ?? 0) + walkInVisitCount;

  // ── Total Spend ──────────────────────────────────────────────────────────
  // Deliberately not stats.lifetimeSpend. eWallet and membership-wallet money
  // is not new revenue (it was recognised when the wallet was funded), and a
  // standalone package/membership purchase whose sales-row mirror failed to be
  // created would otherwise be missed entirely.
  const paidRevenue = appointments
    .filter((appointment) => appointment.status === "paid")
    .reduce(
      (sum, appointment) =>
        // netAmount is null until a completed payment populates it; fall back
        // to what was actually collected, never the full catalog total.
        sum + (appointment.netAmount !== null ? appointment.netAmount : appointment.amountPaid),
      0,
    );

  const partialRevenue = appointments
    .filter((appointment) => appointment.status === "partial")
    .reduce((sum, appointment) => {
      const walletPortion = appointment.ewalletUsed + appointment.membershipWalletUsed;
      return sum + Math.max(0, appointment.amountPaid - walletPortion);
    }, 0);

  const standalonePackageRevenue = packages
    .filter((pkg) => !pkg.appointmentId)
    .reduce((sum, pkg) => sum + (pkg.paidAmount || pkg.totalAmount), 0);

  const standaloneMembershipRevenue = memberships
    .filter((membership) => !membership.appointmentId)
    .reduce((sum, membership) => sum + membership.pricePaid, 0);

  const totalSpend =
    paidRevenue + partialRevenue + standalonePackageRevenue + standaloneMembershipRevenue;

  // ── Amount Due ───────────────────────────────────────────────────────────
  // due_amount is already net of discount/eWallet/membership-wallet, so these
  // sum directly. No Web equivalent — this card is mobile-only.
  const amountDue = appointments.reduce((sum, appointment) => sum + appointment.dueAmount, 0);

  // Kept consistent with the numerator above rather than dividing by a
  // completed-sales count that no longer matches it.
  const averageSpend = totalVisits > 0 ? totalSpend / totalVisits : 0;

  // ── Last visit ───────────────────────────────────────────────────────────
  // Most recent paid appointment OR most recent completed sale, whichever is
  // later — a walk-in with no appointment is still a visit.
  const lastPaidAppointment = appointments
    .filter((appointment) => appointment.status === "paid")
    .map((appointment) => appointment.scheduledAt)
    .sort(byDateDesc)[0] ?? null;
  const lastCompletedSale = sales
    .filter((sale) => sale.status === "completed")
    .map((sale) => sale.createdAt)
    .sort(byDateDesc)[0] ?? null;
  const lastVisit =
    !lastPaidAppointment
      ? lastCompletedSale
      : !lastCompletedSale
        ? lastPaidAppointment
        : toTime(lastPaidAppointment) >= toTime(lastCompletedSale)
          ? lastPaidAppointment
          : lastCompletedSale;

  // ── Upcoming appointments ────────────────────────────────────────────────
  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        (appointment.status === "booked" || appointment.status === "partial") &&
        toTime(appointment.scheduledAt) >= now,
    )
    .sort((left, right) => toTime(left.scheduledAt) - toTime(right.scheduledAt));

  // ── Services ─────────────────────────────────────────────────────────────
  // Sale line items first; appointment services are then merged in only when
  // they are not already represented by a sale item and are not actually a
  // package sold on that appointment.
  const servicesFromSales: ClientProfileLineEntry[] = sales
    .filter((sale) => sale.status === "completed")
    .flatMap((sale) =>
      sale.items
        .filter((item) => item.itemType === "service")
        .map((item, index) => ({
          key: `sale-service-${sale.id}-${index}`,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          invoiceNumber: sale.invoiceNumber || null,
          date: sale.createdAt,
          staffId: item.staffId,
          source: "sale" as const,
        })),
    );

  const salePackageNames = new Set(
    sales.flatMap((sale) => sale.items.filter((item) => item.itemType === "package").map((item) => item.name)),
  );
  const appointmentPackageNames = new Set(
    appointments
      .flatMap((appointment) => appointment.packageItems)
      .map((item) => item.name)
      .filter((name) => name && !salePackageNames.has(name)),
  );
  const saleServiceNames = new Set(servicesFromSales.map((entry) => entry.name));

  const servicesFromAppointments: ClientProfileLineEntry[] = appointments
    .filter(isAppointmentPaid)
    .flatMap((appointment) =>
      appointment.services
        .filter(
          (service) =>
            service.name &&
            !saleServiceNames.has(service.name) &&
            !appointmentPackageNames.has(service.name),
        )
        .map((service, index) => ({
          key: `appt-service-${appointment.id}-${index}`,
          name: service.name,
          quantity: 1,
          unitPrice: service.price,
          totalPrice: service.price,
          // No sale_items row backs this entry, so no real discount/tax figure
          // exists — null renders as "–" rather than a misleading 0.
          discountAmount: null,
          taxAmount: null,
          invoiceNumber: null,
          date: appointment.scheduledAt,
          staffId: service.staffId ?? appointment.staffId,
          source: "appointment" as const,
        })),
    );

  const services = [...servicesFromSales, ...servicesFromAppointments].sort((left, right) =>
    byDateDesc(left.date, right.date),
  );

  // ── Products ─────────────────────────────────────────────────────────────
  const products: ClientProfileLineEntry[] = sales
    .flatMap((sale) =>
      sale.items
        .filter((item) => item.itemType === "product")
        .map((item, index) => ({
          key: `sale-product-${sale.id}-${index}`,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          invoiceNumber: sale.invoiceNumber || null,
          date: sale.createdAt,
          staffId: item.staffId,
          source: "sale" as const,
        })),
    )
    .sort((left, right) => byDateDesc(left.date, right.date));

  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const pastMemberships = memberships.filter((membership) => membership.status !== "active");

  return {
    totalVisits,
    totalSpend,
    amountDue,
    averageSpend,
    lastVisit,
    nextAppointment: upcomingAppointments[0]?.scheduledAt ?? null,
    serviceRevenue: services.reduce((sum, entry) => sum + entry.totalPrice, 0),
    productRevenue: products.reduce((sum, entry) => sum + entry.totalPrice, 0),
    upcomingAppointments,
    services,
    products,
    activeMemberships,
    pastMemberships,
    packages: [...packages].sort((left, right) => byDateDesc(left.createdDate, right.createdDate)),
    // Most recent service actually taken — `services` is already date-sorted,
    // so this is a real chronological answer rather than whichever entry
    // happened to land first in a flattened timeline.
    lastServiceTaken: services[0]?.name ?? null,
  };
};
