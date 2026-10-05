import type {
  ClientAppointmentRecord,
  ClientMembershipRecord,
  ClientPackageRecord,
  ClientHistoryStats,
  ClientSaleRecord,
} from "@/types/client";


export type ClientProfileLineEntry = {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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

  const packageSaleIds = buildPackageSaleIds(packages, sales);
  const quickSales = sales.filter((sale) => !sale.appointmentId);
  const walkInVisitCount = quickSales.filter(
    (sale) => sale.status === "completed" && !packageSaleIds.has(sale.id),
  ).length;
  const totalVisits = (stats?.completedAppointments ?? 0) + walkInVisitCount;

  const paidRevenue = appointments
    .filter((appointment) => appointment.status === "paid")
    .reduce(
      (sum, appointment) =>
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

  const amountDue = appointments.reduce((sum, appointment) => sum + appointment.dueAmount, 0);

  const averageSpend = totalVisits > 0 ? totalSpend / totalVisits : 0;

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

  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        (appointment.status === "booked" || appointment.status === "partial") &&
        toTime(appointment.scheduledAt) >= now,
    )
    .sort((left, right) => toTime(left.scheduledAt) - toTime(right.scheduledAt));

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
    lastServiceTaken: services[0]?.name ?? null,
  };
};
