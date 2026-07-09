import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import {
  createConsultationFormThunk,
  createServiceThunk,
  fetchServicesThunk,
  updateConsultationFormThunk,
} from "../../../middleware/services/services.thunk";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import type { CatalogFormData, Service } from "../types/catalog.types.ts";

const initialData: CatalogFormData = {
  basic: {
    name: "",
    categoryId: "",
    duration: 30,
    price: 0,
    discountedPrice: null,
    paddingBefore: 0,
    paddingAfter: 0,
    description: "",
    active: true,
    genderPreference: null,
    imageUrl: null,
  },
  team: {
    allMembers: true,
    selectedMemberIds: [],
    availableMembers: [],
  },
  resources: {
    requireResource: false,
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
    enabled: true,
    onlineDescription: "",
    maxAdvanceDays: 365,
    minNoticeHours: 2,
    requireDeposit: false,
    depositAmount: 0,
  },
  portfolio: {
    images: [],
  },
  forms: {
    selectedFormIds: [],
    availableForms: [],
  },
  commission: {
    defaultType: "percentage",
    defaultValue: 0,
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
};

export const useServiceForm = (_type: "single" | "bundle") => {
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState<CatalogFormData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateField = <K extends keyof CatalogFormData>(
    section: K,
    value: CatalogFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [section]: value }));
  };

  const validate = () => {
    const errors: Record<string, string[]> = {};

    // Basic details validation
    if (!formData.basic.name.trim()) {
      errors.basic = [...(errors.basic || []), "Service name is required"];
    }
    if (!formData.basic.categoryId) {
      errors.basic = [...(errors.basic || []), "Category is required"];
    }
    if (
      formData.basic.price === undefined ||
      formData.basic.price === null ||
      isNaN(formData.basic.price) ||
      formData.basic.price <= 0
    ) {
      errors.basic = [...(errors.basic || []), "Price is required"];
    }

    // Team members validation
    if (
      !formData.team.allMembers &&
      formData.team.selectedMemberIds.length === 0
    ) {
      errors.team = [
        ...(errors.team || []),
        "At least one team member must be selected",
      ];
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Re-run validation live once the user has attempted a submit, so inline
  // errors clear as soon as the user fixes the problem.
  useEffect(() => {
    if (isSubmitted) validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, isSubmitted]);

  const handleSubmit = async () => {
    setIsSubmitted(true);
    const isValid = validate();
    if (!isValid) return false;

    setLoading(true);
    setError(null);

    try {
      // Map formData to Backend Service shape
      const payload: Partial<Service> = {
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
        staff_ids: formData.team.allMembers
          ? []
          : formData.team.selectedMemberIds,
        gender_preference: formData.basic.genderPreference ?? null,
        image_url: formData.basic.imageUrl ?? null,
      };

      const resultAction = await dispatch(createServiceThunk(payload));
      if (createServiceThunk.fulfilled.match(resultAction)) {
        // Consultation forms are their own sub-resource on the backend and
        // couldn't be created until the service itself had an id — push any
        // that were filled in locally now that one exists.
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

        // Refresh the services list and categories in Redux state so the list
        // page shows up-to-date data immediately when the user navigates back.
        dispatch(fetchServicesThunk({ page: 1, limit: 25 }));
        dispatch(fetchCategoriesThunk());
        return true;
      } else {
        setError(resultAction.payload as string);
        return false;
      }
    } catch (err) {
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
    loading,
    error,
    validationErrors,
    isSubmitted,
  };
};

