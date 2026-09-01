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

export type AppointmentSelectedService = ServiceListItem & {
  catalogServiceId?: string;
  // The exact consumables to resend for this line: either copied from the
  // catalog recipe when selected or restored from the persisted appointment.
  consumables?: ConsumableUsageItem[];
  discount?: number;
  isPackageService?: boolean;
  quantity?: number;
  staffId?: string | null;
  staffName?: string | null;
  startTime?: string | null;
  total?: number;
};
