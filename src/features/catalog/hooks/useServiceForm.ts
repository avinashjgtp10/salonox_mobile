import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import {
  createConsultationFormThunk,
  createServiceThunk,
  fetchServiceByIdThunk,
  fetchServicesThunk,
  updateConsultationFormThunk,
  updateServiceThunk,
} from "../../../middleware/services/services.thunk";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import { selectAllServices } from "../../../store/selectors/slices.selectors";
import type { CatalogFormData, Service, ConsumableUsagePayloadItem } from "../types/catalog.types.ts";
import { toTitleCase } from "../../../utils/titleCase";

// One hook for create AND edit, mirroring ProductFormPage's single-page
// approach. They used to be two hooks with two payload builders, which had
// already drifted — `image_url` was sent on create but not on update. A single
// builder makes that class of divergence impossible.

const emptyForm = (): CatalogFormData => ({
  basic: {
    name: "",
    categoryId: "",
    duration: 30,
    price: 0,
    description: "",
    active: true,
    reminderAfterDays: null,
  },
  team: {
    selectedMemberIds: [],
  },
  consumables: {
    items: [],
  },
  onlineBooking: {
    enabled: true,
  },
  commission: {
    // Off by default: a new service earns under the staff's existing commission
    // rules, same as every service created before this field existed.
    enabled: false,
    kind: "percentage",
    value: 0,
  },
  forms: {
    selectedFormIds: [],
    availableForms: [],
  },
});

// The LIST endpoint never includes `staff` (only the single GET-by-ID
// endpoint does), so its presence tells us whether team assignment data
// is actually available on this record.
const hasFullServiceDetails = (svc: Service) =>
  Object.prototype.hasOwnProperty.call(svc, "staff");

const mapServiceToFormData = (svc: Service): CatalogFormData => ({
  basic: {
    name: svc.name ?? "",
    categoryId: String(svc.category_id ?? ""),
    duration: svc.duration ?? 30,
    price: Number(svc.price ?? 0),
    description: svc.description ?? "",
    active: svc.is_active ?? true,
    reminderAfterDays: svc.reminder_after_days ?? null,
  },
  team: {
    selectedMemberIds: (svc.staff ?? []).map((s) => String(s.staff_id)),
  },
  consumables: {
    items: (svc.consumables_used ?? []).map((c) => ({
      id: crypto.randomUUID(),
      productId: c.product_id,
      productName: c.product_name ?? "",
      qty: c.qty,
      unit: c.unit,
    })),
  },
  onlineBooking: {
    enabled: svc.online_booking ?? true,
  },
  commission: {
    // A null rate is the marker for "no override" — the checkbox reflects
    // whether one is set, not whether commission is paid at all.
    enabled: svc.commission_rate !== null && svc.commission_rate !== undefined,
    kind: svc.commission_kind ?? "percentage",
    value: Number(svc.commission_rate ?? 0),
  },
  forms: {
    selectedFormIds: (svc.consultation_forms ?? []).filter((f) => f.is_selected).map((f) => f.id),
    availableForms: (svc.consultation_forms ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: f.created_at,
      values: f.values ?? undefined,
    })),
  },
});

// Every key here maps to a real column the backend will actually persist.
// Five fields that used to be sent — discounted_price, padding_before,
// padding_after, gender_preference, image_url — have no column at all; the
// API dropped them silently and still returned 201. They are gone rather than
// left to look functional.
const buildPayload = (formData: CatalogFormData, allStaffIds: string[]) => {
  const selected = formData.team.selectedMemberIds;
  // "Everyone is ticked" is stored as NO service_staff rows, not as a row per
  // staff member. Both mean the same thing for booking today, but writing an
  // explicit row for each person freezes the list: hire someone next month and
  // they'd be excluded from every service until each one was edited by hand.
  // Sending [] keeps the service genuinely open to all staff, including future
  // ones. Any partial selection is sent as-is.
  const isEveryone =
    allStaffIds.length > 0 &&
    selected.length === allStaffIds.length &&
    allStaffIds.every((id) => selected.includes(id));

  return {
    name: toTitleCase(formData.basic.name.trim()),
    description: formData.basic.description || undefined,
    category_id: formData.basic.categoryId || null,
    price: formData.basic.price,
    // price_type is deliberately not sent — the form has no control for it, so
    // sending a hardcoded "fixed" would overwrite whatever a service already
    // has. Omitting it leaves the existing value alone on edit and takes the
    // column default on create.
    duration: formData.basic.duration,
    is_active: formData.basic.active,
    reminder_after_days: formData.basic.reminderAfterDays,
    online_booking: formData.onlineBooking.enabled,
    // Both null clears the override on edit, so unticking the box genuinely
    // hands the service back to the staff-level commission rules rather than
    // leaving a stale rate behind. The backend rejects one without the other.
    commission_rate: formData.commission.enabled ? formData.commission.value : null,
    commission_kind: formData.commission.enabled ? formData.commission.kind : null,
    // On update the backend calls replaceStaff([]) for an empty array, so this
    // genuinely clears the assignment rather than leaving stale rows behind.
    staff_ids: isEveryone ? [] : selected,
    consumables_used: formData.consumables.items.map(
      (i): ConsumableUsagePayloadItem => ({
        product_id: i.productId,
        qty: i.qty,
        unit: i.unit,
      }),
    ),
  };
};

export const useServiceForm = (serviceId?: string | number, allStaffIds: string[] = []) => {
  const dispatch = useDispatch<AppDispatch>();
  const isEdit = serviceId !== undefined && serviceId !== null && String(serviceId) !== "";
  const cachedServices = useSelector(selectAllServices) as Service[];

  const [formData, setFormData] = useState<CatalogFormData>(emptyForm());
  const [serviceName, setServiceName] = useState("");
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Synchronous guard — the `loading` state above can't stop a second click
  // that lands in the same tick as the first (e.g. a fast double-click, or a
  // duplicate touch+click event on mobile) before React re-renders the Save
  // button as disabled. A ref updates immediately, so the second call sees
  // it and bails before ever dispatching a second create/update request.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (cachedServices.length === 0) {
      dispatch(fetchServicesThunk({ page: 1, limit: 500 }));
    }
  }, [dispatch, cachedServices.length]);

  useEffect(() => {
    if (!isEdit) return;
    // Try the Redux store first (avoids an extra network round-trip when
    // navigating from the list page where services are already loaded).
    const cached = cachedServices.find((s) => String(s.id) === String(serviceId));
    if (cached && hasFullServiceDetails(cached)) {
      setServiceName(cached.name);
      setFormData(mapServiceToFormData(cached));
      setFetchLoading(false);
      return;
    }

    const load = async () => {
      setFetchLoading(true);
      setError(null);
      const result = await dispatch(fetchServiceByIdThunk(serviceId as string));
      if (fetchServiceByIdThunk.fulfilled.match(result)) {
        const svc = result.payload as Service;
        setServiceName(svc.name);
        setFormData(mapServiceToFormData(svc));
      } else {
        setError("Failed to load service data.");
      }
      setFetchLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const updateField = <K extends keyof CatalogFormData>(
    section: K,
    value: CatalogFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [section]: value }));
  };

  const validate = (data: CatalogFormData) => {
    const errors: Record<string, string[]> = {};
    if (!data.basic.name.trim()) {
      errors.basic = [...(errors.basic || []), "Service name is required"];
    }
    if (!data.basic.categoryId) {
      errors.basic = [...(errors.basic || []), "Category is required"];
    }
    if (
      data.basic.price === undefined || data.basic.price === null ||
      isNaN(data.basic.price) || data.basic.price <= 0
    ) {
      errors.basic = [...(errors.basic || []), "Price is required"];
    }

    // Duplicate check on (Service Name + Duration + Price)
    const formName = data.basic.name.trim().toLowerCase();
    const formDuration = Number(data.basic.duration);
    const formPrice = Number(data.basic.price);

    if (formName && formDuration > 0 && formPrice >= 0) {
      const isDuplicate = cachedServices.some((svc) => {
        if (isEdit && String(svc.id) === String(serviceId)) {
          return false;
        }
        const svcName = (svc.name || "").trim().toLowerCase();
        const svcDuration = Number(svc.duration ?? 30);
        const svcPrice = Number(svc.price ?? 0);

        return (
          svcName === formName &&
          svcDuration === formDuration &&
          svcPrice === formPrice
        );
      });

      if (isDuplicate) {
        errors.basic = [
          ...(errors.basic || []),
          "A service with the same name, duration, and price already exists.",
        ];
      }
    }

    // No staff validation: an empty selection is valid and means "all staff".

    // Only checked when the override is switched on — off means the field is
    // irrelevant, not invalid.
    if (data.commission.enabled) {
      const v = data.commission.value;
      if (v === undefined || v === null || isNaN(v) || v <= 0) {
        errors.commission = [...(errors.commission || []), "Commission value is required"];
      } else if (data.commission.kind === "percentage" && v > 100) {
        errors.commission = [...(errors.commission || []), "Percentage cannot exceed 100"];
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Re-run validation live once the user has attempted a submit, so inline
  // errors clear as soon as the user fixes the problem.
  useEffect(() => {
    if (isSubmitted) validate(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, isSubmitted]);

  const handleSubmit = async () => {
    setIsSubmitted(true);
    if (!validate(formData)) return false;

    if (isSubmittingRef.current) return false;
    isSubmittingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const payload = buildPayload(formData, allStaffIds);

      if (isEdit) {
        const resultAction = await dispatch(
          updateServiceThunk({ id: serviceId as string, data: payload as Partial<Service> }),
        );
        if (!updateServiceThunk.fulfilled.match(resultAction)) {
          setError(resultAction.payload as string);
          return false;
        }
      } else {
        const resultAction = await dispatch(createServiceThunk(payload as Partial<Service>));
        if (!createServiceThunk.fulfilled.match(resultAction)) {
          setError(resultAction.payload as string);
          return false;
        }
        // Consultation forms are their own sub-resource and can't be created
        // until the service has an id — push any filled in locally now that
        // one exists. On the edit path FormsTab writes directly via its own
        // thunks (it already has a serviceId), so this only runs on create.
        const newServiceId = resultAction.payload.id;
        for (const form of formData.forms.availableForms) {
          const created = await dispatch(
            createConsultationFormThunk({ serviceId: newServiceId, name: form.name }),
          );
          if (createConsultationFormThunk.fulfilled.match(created)) {
            const isSelected = formData.forms.selectedFormIds.includes(form.id);
            if (form.values || !isSelected) {
              await dispatch(
                updateConsultationFormThunk({
                  serviceId: newServiceId,
                  formId: created.payload.id,
                  data: { is_selected: isSelected, values: form.values ?? null },
                }),
              );
            }
          }
        }
      }

      // Refresh the list and categories so the list page is up to date the
      // moment the user navigates back.
      dispatch(fetchServicesThunk({ page: 1, limit: 25 }));
      dispatch(fetchCategoriesThunk());
      return true;
    } catch {
      setError("An unexpected error occurred");
      return false;
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return {
    formData,
    updateField,
    handleSubmit,
    fetchLoading,
    loading,
    error,
    validationErrors,
    isSubmitted,
    serviceName,
    isEdit,
  };
};
