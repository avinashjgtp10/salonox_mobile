import type { CustomPackageLineItem } from "../../../components/packages/PackageCreateForm";
import type { PackageItem } from "../types/booking.types";

// Single source of truth for turning a built-but-unsold custom package
// (PackageCreateForm's lineItemMode output) into the PackageItem shape a
// bill's own packageRows expect. Used both when "+ Sell Package" adds
// straight into an already-open bill (AppointmentModal.tsx) and when the
// standalone Catalogue "Sell Package" form hands one off across a page
// navigation to Quick Sale (PackageModule.tsx → QuickSalePage.tsx) — kept in
// one place so the two paths can't quietly drift apart on what fields a
// custom row actually needs.
export function customPackageLineItemToPackageRow(item: CustomPackageLineItem, time: string): PackageItem {
  return {
    id: "",
    packageId: "",
    packageName: item.name,
    price: item.price,
    qty: 1,
    discount: 0,
    total: item.price,
    staffId: item.staffId || "",
    time,
    isCustom: true,
    customExpiry: { neverExpires: item.neverExpires, expiryDate: item.expiryDate },
    services: item.services.map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      totalSessions: s.totalSessions,
      price: s.price,
    })),
  };
}
