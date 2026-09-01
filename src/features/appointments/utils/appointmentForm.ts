import type {
  AppointmentApiService,
  AppointmentListItem,
} from "@/types/appointment";
import type { ConsumableUsageItem } from "@/types/consumable";
import type { ServiceListItem } from "@/types/service";

import type {
  AppointmentFormState,
  AppointmentSelectedService,
  FormErrors,
} from "../types/appointmentForm";
import {
  isPastDate,
  toInputDate,
  toInputTime,
  validateDate,
  validateTime,
} from "./appointmentDateTime";

export const formatCurrency = (amount: number) =>
  `Rs. ${Math.max(0, amount).toLocaleString("en-IN")}`;

const getServiceDiscount = (service: ServiceListItem) => {
  const baseDiscount = Math.max(service.discountAmount ?? 0, 0);
  const percentDiscount = Math.max(service.discountPercent ?? 0, 0);

  if (percentDiscount > 0) {
    return Math.min(service.price, (service.price * percentDiscount) / 100);
  }

  return Math.min(service.price, baseDiscount);
};

const getServiceTax = (service: ServiceListItem, taxableAmount: number) => {
  const fixedTax = Math.max(service.taxAmount ?? 0, 0);
  const taxRate = Math.max(service.taxRate ?? 0, 0);

  if (taxRate > 0) {
    return (taxableAmount * taxRate) / 100;
  }

  return fixedTax;
};

export const getServicePricingTotals = (services: ServiceListItem[]) => {
  const subtotal = services.reduce((total, service) => total + Math.max(service.price, 0), 0);
  const discount = services.reduce((total, service) => total + getServiceDiscount(service), 0);
  const tax = services.reduce((total, service) => {
    const taxableAmount = Math.max(0, service.price - getServiceDiscount(service));
    return total + getServiceTax(service, taxableAmount);
  }, 0);

  return {
    discount,
    grandTotal: Math.max(0, subtotal - discount + tax),
    subtotal,
    tax,
  };
};

export const getSelectedServiceCatalogId = (service: AppointmentSelectedService) =>
  service.catalogServiceId ?? service.id;

const toOptionalNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const toOptionalStringValue = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") {
    const stringValue = String(value).trim();
    return stringValue || undefined;
  }

  return undefined;
};

const parseConsumablesFromApi = (
  items: AppointmentApiService["consumables"],
): ConsumableUsageItem[] | undefined => {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }

  const parsed = items
    .map((item): ConsumableUsageItem | null => {
      const productId = toOptionalStringValue(item?.product_id);
      if (!productId) {
        return null;
      }

      const qty = toOptionalNumber(item?.qty) ?? 0;
      const productName = toOptionalStringValue(item?.product_name);
      const actualQty = toOptionalNumber(item?.actual_qty);

      return {
        productId,
        ...(productName ? { productName } : {}),
        qty,
        unit: toOptionalStringValue(item?.unit) ?? "",
        ...(actualQty !== undefined ? { actualQty } : {}),
      };
    })
    .filter((item): item is ConsumableUsageItem => item !== null);

  return parsed.length > 0 ? parsed : undefined;
};

export const appointmentServicesToSelectedServices = (
  appointment?: AppointmentListItem,
): AppointmentSelectedService[] => {
  const rawServices = Array.isArray(appointment?.raw.services)
    ? appointment.raw.services
    : [];

  if (rawServices.length > 0) {
    return rawServices.map((service: AppointmentApiService, index) => {
      const catalogServiceId =
        toOptionalStringValue(service.service_id) ??
        toOptionalStringValue(service.id) ??
        `existing-service-${index + 1}`;
      const price = toOptionalNumber(service.price) ?? 0;

      return {
        catalogServiceId,
        category: null,
        categoryId: null,
        consumables: parseConsumablesFromApi(service.consumables),
        createdAt: null,
        discount: toOptionalNumber(service.discount),
        durationMinutes:
          toOptionalNumber(service.duration_minutes) ??
          toOptionalNumber(service.duration) ??
          null,
        id: `${catalogServiceId}:${index}`,
        isActive: true,
        isPackageService: Boolean(service.is_package_service),
        name:
          toOptionalStringValue(service.name) ??
          toOptionalStringValue(service.title) ??
          appointment?.serviceName ??
          "Service",
        price,
        quantity:
          toOptionalNumber(service.quantity) ??
          toOptionalNumber(service.qty) ??
          1,
        staffId: toOptionalStringValue(service.staff_id) ?? appointment?.staffId ?? null,
        staffName: toOptionalStringValue(service.staff_name) ?? appointment?.staffName ?? null,
        startTime:
          toOptionalStringValue(service.time) ??
          toOptionalStringValue(service.start_time) ??
          null,
        total: toOptionalNumber(service.total),
      };
    });
  }

  if (!appointment?.serviceName) {
    return [];
  }

  return [
    {
      catalogServiceId: appointment.serviceId || "existing-service",
      category: null,
      categoryId: null,
      createdAt: null,
      durationMinutes: appointment.durationMinutes,
      id: appointment.serviceId || "existing-service",
      isActive: true,
      name: appointment.serviceName,
      price: appointment.amount,
      quantity: 1,
      staffId: appointment.staffId || null,
      staffName: appointment.staffName || null,
      total: appointment.amount,
    },
  ];
};

export const formatDurationLabel = (durationMinutes: number | null) =>
  durationMinutes && durationMinutes > 0 ? `${durationMinutes} min` : "Duration pending";

export const validateForm = (
  form: AppointmentFormState,
  options?: { allowedPastDate?: string; requireClient?: boolean },
): FormErrors => {
  const errors: FormErrors = {};
  const trimmedDiscount = form.discount.trim();
  const discount = trimmedDiscount === "" ? 0 : Number(trimmedDiscount);
  const price = Number(form.price.trim() || 0);

  if (options?.requireClient !== false && !form.clientId) {
    errors.clientId = "Select a client.";
  }

  if (!form.serviceId.trim()) {
    errors.serviceName = "Select a service.";
  }

  if (!form.staffId) {
    errors.staffId = "Select the staff.";
  }

  if (!validateDate(form.date)) {
    errors.date = "Use YYYY-MM-DD.";
  } else if (isPastDate(form.date) && form.date !== options?.allowedPastDate) {
    errors.date = "Past dates cannot be booked.";
  }

  if (!validateTime(form.startTime)) {
    errors.startTime = "Use HH:mm.";
  }

  if (trimmedDiscount && (!Number.isFinite(discount) || discount < 0)) {
    errors.discount = "Discount cannot be negative.";
  } else if (price > 0 && discount > price) {
    errors.discount = "Discount cannot be greater than the price.";
  }

  return errors;
};

export const appointmentToForm = (appointment?: AppointmentListItem): AppointmentFormState => ({
  clientId: appointment?.clientId ?? "",
  date: toInputDate(appointment?.scheduledAt ?? null),
  discount: appointment?.discount ? String(appointment.discount) : "0",
  duration: appointment?.durationMinutes ? String(appointment.durationMinutes) : "",
  endTime: toInputTime(appointment?.endTime ?? null),
  notes: appointment?.notes ?? "",
  paymentMethod: appointment?.paymentMethod && appointment.paymentMethod !== "-" ? appointment.paymentMethod : "Cash",
  price: appointment?.amount ? String(appointment.amount) : "",
  serviceId: appointment?.serviceId ?? "",
  serviceName: appointment?.serviceName ?? "",
  staffId: appointment?.staffId ?? "",
  startTime: toInputTime(appointment?.startTime ?? appointment?.scheduledAt ?? null),
  status: appointment?.status ?? "Confirmed",
});
