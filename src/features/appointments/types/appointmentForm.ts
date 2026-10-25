import type { AppointmentStatus } from "@/types/appointment";
import type { ConsumableUsageItem } from "@/types/consumable";
import type { ServiceListItem } from "@/types/service";

export type AppointmentFormState = {
  clientId: string;
  date: string;
  discount: string;
  duration: string;
  endTime: string;
  notes: string;
  paymentMethod: string;
  price: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  startTime: string;
  status: AppointmentStatus;
};

export type ClientBookingMode = "existing" | "walkIn";

export type FormErrors = Partial<Record<keyof AppointmentFormState, string>>;

// Non-service lines billed on the appointment (web parity): sent as
// product_items / membership_items / package_items instead of services.
export type AppointmentItemKind = "product" | "membership" | "package";

export type AppointmentSelectedService = ServiceListItem & {
  catalogServiceId?: string;
  itemKind?: AppointmentItemKind;
  // Original API row for an item loaded in edit mode — sent back unchanged so
  // server-only fields (package service breakdowns etc.) survive the update.
  rawItem?: Record<string, unknown>;
  consumables?: ConsumableUsageItem[];
  discount?: number;
  isPackageService?: boolean;
  quantity?: number;
  staffId?: string | null;
  staffName?: string | null;
  startTime?: string | null;
  total?: number;
};
