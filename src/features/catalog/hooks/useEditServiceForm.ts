import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import {
  fetchServiceByIdThunk,
  updateServiceThunk,
  fetchServicesThunk,
} from "../../../middleware/services/services.thunk";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import { selectAllServices } from "../../../store/selectors/slices.selectors";
import type { CatalogFormData, Service } from "../types/catalog.types.ts";

const fromApiGenderPreference = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "male" || normalized === "female" || normalized === "any") {
    return normalized;
  }
  return null;
};

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
    discountedPrice: svc.discounted_price != null ? Number(svc.discounted_price) : null,
    paddingBefore: svc.padding_before ?? 0,
    paddingAfter: svc.padding_after ?? 0,
    description: svc.description ?? "",
    active: svc.is_active ?? true,
    genderPreference: fromApiGenderPreference(svc.gender_preference),
    imageUrl: svc.image_url ?? null,
  },
  team: {
    allMembers: (svc.staff ?? []).length === 0,
    selectedMemberIds: (svc.staff ?? []).map((s) => String(s.staff_id)),
    availableMembers: [],
  },
  resources: {
    requireResource: svc.resource_required ?? false,
    selectedResourceId: "",
    availableResources: [
      { id: "r1", name: "Room 1" },
      { id: "r2", name: "Chair 1" },
    ],
  },
  addons: {
    selectedGroupIds: [],
    availableGroups: [],
  },
  onlineBooking: {
    enabled: svc.online_booking ?? true,
    onlineDescription: "",
    maxAdvanceDays: 365,
    minNoticeHours: 2,
    requireDeposit: false,
    depositAmount: 0,
  },
  portfolio: { images: [] },
  forms: {
    selectedFormIds: (svc.consultation_forms ?? []).filter((f) => f.is_selected).map((f) => f.id),
    availableForms: (svc.consultation_forms ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: f.created_at,
      values: f.values ?? undefined,
    })),
  },
  commission: {
    defaultType: "percentage",
    defaultValue: svc.commission_enabled ? 10 : 0,
    memberCommissions: [],
  },
  settings: {
    cancellationNoticeHours: 24,
    chargeCancellationFee: false,
    cancellationFeeAmount: 0,
    visibleToClients: true,
    taxable: true,
    colorLabel: "#6366f1",
  },
});

export const useEditServiceForm = (serviceId: string | number) => {
  const dispatch = useDispatch<AppDispatch>();
  const cachedServices = useSelector(selectAllServices) as Service[];

  const [formData, setFormData] = useState<CatalogFormData | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Try the Redux store first (avoids an extra network round-trip when
    // navigating from the list page where services are already loaded).
    const cached = cachedServices.find(
      (s) => String(s.id) === String(serviceId),
    );
    if (cached && hasFullServiceDetails(cached)) {
      setServiceName(cached.name);
      setFormData(mapServiceToFormData(cached));
      setFetchLoading(false);
      return;
    }

    // Not in cache — fetch from API
    const load = async () => {
      setFetchLoading(true);
      setError(null);
      const result = await dispatch(fetchServiceByIdThunk(serviceId));
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

  const validate = (data: CatalogFormData) => {
    const errors: Record<string, string[]> = {};
    if (!data.basic.name.trim()) {
      errors.basic = [...(errors.basic || []), "Service name is required"];
    }
    if (!data.basic.categoryId) {
      errors.basic = [...(errors.basic || []), "Category is required"];
    }
    if (data.basic.price === undefined || data.basic.price === null || isNaN(data.basic.price) || data.basic.price <= 0) {
      errors.basic = [...(errors.basic || []), "Price is required"];
    }
    if (!data.team.allMembers && data.team.selectedMemberIds.length === 0) {
      errors.team = [...(errors.team || []), "At least one staff member must be selected"];
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Re-run validation live once the user has attempted a submit, so inline
  // errors clear as soon as the user fixes the problem.
  useEffect(() => {
    if (isSubmitted && formData) validate(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, isSubmitted]);

  const updateField = <K extends keyof CatalogFormData>(
    section: K,
    value: CatalogFormData[K],
  ) => {
    setFormData((prev) => (prev ? { ...prev, [section]: value } : prev));
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    if (!formData) return false;
    if (!validate(formData)) return false;

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: formData.basic.name,
        description: formData.basic.description || undefined,
        category_id: formData.basic.categoryId || null,
        price: formData.basic.price,
        discounted_price: formData.basic.discountedPrice ?? null,
        duration: formData.basic.duration,
        padding_before: formData.basic.paddingBefore ?? 0,
        padding_after: formData.basic.paddingAfter ?? 0,
        is_active: formData.basic.active,
        online_booking: formData.onlineBooking.enabled,
        resource_required: formData.resources.requireResource,
        commission_enabled: formData.commission.defaultValue > 0,
        gender_preference: formData.basic.genderPreference ?? null,
        staff_ids: formData.team.allMembers
          ? []
          : formData.team.selectedMemberIds,
      };

      const resultAction = await dispatch(
        updateServiceThunk({ id: serviceId, data: payload as Partial<Service> }),
      );
      if (updateServiceThunk.fulfilled.match(resultAction)) {
        dispatch(fetchServicesThunk({ page: 1, limit: 25 }));
        dispatch(fetchCategoriesThunk());
        return true;
      } else {
        setError(resultAction.payload as string);
        return false;
      }
    } catch {
      setError("An unexpected error occurred");
      return false;
    } finally {
      setLoading(false);
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
  };
};
