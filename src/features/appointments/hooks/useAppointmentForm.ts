import { TextInput } from "@/components/ui/AppTypography";
import { CLIENT_SEARCH_DEBOUNCE_MS, CLIENT_SEARCH_MIN_LETTERS, CLIENT_SEARCH_RESULT_LIMIT, STAFF_AVAILABILITY_REALTIME_ENTITIES } from "@/features/appointments/constants/appointmentConstants";
import { useAllStaffMembers } from "@/features/appointments/hooks/useAllStaffMembers";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import type { AppointmentFormState, AppointmentItemKind, AppointmentSelectedService, ClientBookingMode, FormErrors } from "@/features/appointments/types/appointmentForm";
import { addMinutesToTime, combineDateTime, getDefaultTimeSlots, minutesToDisplayTime, parseClockToMinutes, toInputDate, toInputTime, validateDate, validateTime } from "@/features/appointments/utils/appointmentDateTime";
import { appointmentServicesToSelectedServices, appointmentToForm, getSelectedServiceCatalogId, getServicePricingTotals, validateForm } from "@/features/appointments/utils/appointmentForm";
import { APPOINTMENT_VALIDATION_FIELD_ORDER, getAppointmentPaymentStatus } from "@/features/appointments/utils/appointmentScreenHelpers";
import { fetchServiceCatalog } from "@/features/appointments/utils/serviceCatalog";
import { realtimePayloadMatchesStaff, staffIdMatches } from "@/features/appointments/utils/staffAssignment";
import { localItemTime } from "@/features/quickSale/utils/itemTime";
import { useAppForeground } from "@/hooks/useAppForeground";
import { useAppToast } from "@/hooks/useAppToast";
import { useValidationScroll } from "@/hooks/useValidationScroll";
import { createAppointmentThunk, fetchAppointmentByIdThunk, updateAppointmentThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchClientByIdThunk, fetchClientsThunk } from "@/middleware/client/client.thunk";
import { fetchStaffAvailabilityThunk } from "@/middleware/staff/staffAvailability.thunk";
import { getApiErrorMessage } from "@/services/api";
import { appointmentStatusToApiValue } from "@/services/appointment.service";
import { clientService } from "@/services/client.service";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";
import { clearAppointmentToast, selectAppointmentById, selectAppointmentMutating, selectAppointmentMutationError } from "@/store/appointment/appointment.slice";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectClients } from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectStaffMembers } from "@/store/staff/staff.slice";
import { selectStaffAvailability, selectStaffAvailabilityError, selectStaffAvailabilityLoading } from "@/store/staff/staffAvailability.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { CreateAppointmentRequest, UpdateAppointmentRequest } from "@/types/appointment";
import type { ClientListItem } from "@/types/client";
import type { ServiceListItem } from "@/types/service";
import type { StaffAvailabilitySlot } from "@/types/staffAvailability";
import type { Href } from "expo-router";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard } from "react-native";

export type AppointmentFormSlot = { date: string; time: string; staffId?: string };

// `embedded` is set when the form opens in the Calendar's slot-tap modal.
export function useAppointmentForm(mode: 'create' | 'edit', embedded?: { initialSlot: AppointmentFormSlot; onRequestClose: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const dispatch = useAppDispatch();
  useAllStaffMembers();
  const toast = useAppToast();
  const params = useLocalSearchParams<{ clientId?: string; id?: string }>();
  const appointmentId = params.id;
  const returnedClientId = typeof params.clientId === "string" ? params.clientId : "";
  const existingAppointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const mutating = useAppSelector(selectAppointmentMutating);
  const mutationError = useAppSelector(selectAppointmentMutationError);
  const clients = useAppSelector(selectClients);
  const staffMembers = useAppSelector(selectStaffMembers);
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const { scrollToField, scrollToFirstError, scrollViewRef, setFieldRef } = useValidationScroll(APPOINTMENT_VALIDATION_FIELD_ORDER);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);
  // A Calendar slot tap opens the form with that slot's date, time and staff.
  const initialSlot = mode === "create" ? embedded?.initialSlot : undefined;
  const [presetTime] = useState(() => initialSlot && validateTime(initialSlot.time) ? initialSlot.time : "");
  const [form, setForm] = useState<AppointmentFormState>(() => {
    const initial = appointmentToForm(existingAppointment);
    if (!initialSlot) return initial;
    return {
      ...initial,
      date: validateDate(initialSlot.date) ? initialSlot.date : initial.date,
      staffId: initialSlot.staffId || initial.staffId,
      startTime: presetTime || initial.startTime,
    };
  });
  const [clientBookingMode, setClientBookingMode] = useState<ClientBookingMode>("existing");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<ClientListItem[]>([]);
  const [clientResultsError, setClientResultsError] = useState<string | null>(null);
  const [clientResultsLoading, setClientResultsLoading] = useState(false);
  const clientCacheRef = useRef(new Map<string, ClientListItem[] | Promise<ClientListItem[]>>());
  const clientSearchInputRef = useRef<TextInput | null>(null);
  const serviceSearchInputRef = useRef<TextInput | null>(null);
  const clientRequestIdRef = useRef(0);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceListItem[]>([]);
  const [serviceCatalogError, setServiceCatalogError] = useState<string | null>(null);
  const [serviceCatalogLoading, setServiceCatalogLoading] = useState(false);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [serviceCatalogRetryKey, setServiceCatalogRetryKey] = useState(0);
  const [selectedServices, setSelectedServices] = useState<AppointmentSelectedService[]>([]);
  const [sendAppointmentSms, setSendAppointmentSms] = useState(true);
  const [sendAppointmentEmail, setSendAppointmentEmail] = useState(true);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const submittingRef = useRef(false);
  const [selectedClientRecord, setSelectedClientRecord] = useState<ClientListItem | undefined>(
    undefined,
  );
  const selectedClient = useMemo(
    () => selectedClientRecord ?? clients.find((client) => client.id === form.clientId),
    [clients, form.clientId, selectedClientRecord],
  );
  const selectedStaff = useMemo(
    () => staffMembers.find((staffMember) => staffIdMatches(staffMember, form.staffId)),
    [form.staffId, staffMembers],
  );
  const staffAvailability = useAppSelector((state) => selectStaffAvailability(state, form.staffId, form.date));
  const staffAvailabilityLoading = useAppSelector((state) =>
    selectStaffAvailabilityLoading(state, form.staffId, form.date),
  );
  const staffAvailabilityError = useAppSelector((state) =>
    selectStaffAvailabilityError(state, form.staffId, form.date),
  );
  const totalServiceDuration = useMemo(
    () => selectedServices.reduce((total, service) => total + Math.max(service.durationMinutes ?? 0, 0), 0),
    [selectedServices],
  );
  const servicePricingTotals = useMemo(
    () => getServicePricingTotals(selectedServices),
    [selectedServices],
  );
  const totalServicePrice = servicePricingTotals.grandTotal;
  const defaultTimeSlots = useMemo(() => getDefaultTimeSlots(form.date), [form.date]);
  const allowedPastEditDate = mode === "edit" && existingAppointment
    ? toInputDate(existingAppointment.scheduledAt)
    : undefined;
  const originalEditSlot = useMemo<StaffAvailabilitySlot | null>(() => {
    if (!existingAppointment || mode !== "edit") return null;

    const originalDate = toInputDate(existingAppointment.scheduledAt);
    const originalStart = toInputTime(existingAppointment.startTime ?? existingAppointment.scheduledAt);
    const originalEnd = toInputTime(existingAppointment.endTime);
    const sameStaff = form.staffId === existingAppointment.staffId ||
      Boolean(selectedStaff && staffIdMatches(selectedStaff, existingAppointment.staffId));

    if (form.date !== originalDate || !sameStaff || !validateTime(originalStart)) return null;

    return {
      display: minutesToDisplayTime(parseClockToMinutes(originalStart) ?? 0),
      endTime: validateTime(originalEnd) ? originalEnd : addMinutesToTime(originalDate, originalStart, existingAppointment.durationMinutes ?? 30),
      value: originalStart,
    };
  }, [existingAppointment, form.date, form.staffId, mode, selectedStaff]);
  const availableSlots = useMemo<StaffAvailabilitySlot[]>(
    () => {
      if (!validateDate(form.date)) {
        return [];
      }

      // Any time of day can be booked, whichever staff member is selected.
      const slots = defaultTimeSlots;

      // The Calendar grid uses 15-minute slots, so keep a tapped time that
      // isn't on the default half-hour list selectable.
      const presetSlot: StaffAvailabilitySlot | null = presetTime ? {
        display: minutesToDisplayTime(parseClockToMinutes(presetTime) ?? 0),
        endTime: addMinutesToTime(form.date, presetTime, 30),
        value: presetTime,
      } : null;
      const extraSlots = [originalEditSlot, presetSlot].filter((slot): slot is StaffAvailabilitySlot =>
        Boolean(slot) && !slots.some((existing) => existing.value === slot?.value));

      if (!extraSlots.length) return slots;

      return [...slots, ...extraSlots].sort((left, right) => left.value.localeCompare(right.value));
    },
    [defaultTimeSlots, form.date, originalEditSlot, presetTime],
  );
  // Resolves a picked time to its slot, also when the time falls inside a slot rather than on its start.
  const findSlotForTime = useCallback(
    (time: string): StaffAvailabilitySlot | undefined => {
      const exactSlot = availableSlots.find((slot) => slot.value === time);

      if (exactSlot) return exactSlot;

      const minutes = parseClockToMinutes(time);

      if (minutes === null) return undefined;

      const containingSlot = availableSlots.find((slot) => {
        const slotStart = parseClockToMinutes(slot.value);
        const slotEnd = parseClockToMinutes(slot.endTime);

        return slotStart !== null && slotEnd !== null && minutes > slotStart && minutes < slotEnd;
      });

      return containingSlot
        ? { ...containingSlot, display: minutesToDisplayTime(minutes), value: time }
        : undefined;
    },
    [availableSlots],
  );
  const staffInactiveReason = !selectedStaff
    ? null
    : selectedStaff.status === "Inactive" || selectedStaff.availability === "Offline"
      ? "This staff member is inactive."
      : selectedStaff.status === "On Leave" || selectedStaff.availability === "On Leave"
        ? "This staff member is on leave."
        : null;
  const availabilityBlockReason =
    staffAvailability?.isOnLeave
      ? "This staff member is on leave for the selected date."
      : staffAvailability?.isHoliday
        ? "This staff member is off on the selected date."
        : staffInactiveReason;
  const schedulerLoading = staffAvailabilityLoading;
  const schedulerError = staffAvailabilityError;
  const workingHoursLabel = staffAvailability?.workingHoursLabel ?? selectedStaff?.workingHours ?? "-";
  const shiftStartLabel = staffAvailability?.shiftStartLabel ?? "-";
  const shiftEndLabel = staffAvailability?.shiftEndLabel ?? "-";
  const checkedInLabel = staffAvailability?.checkedInLabel ?? "-";
  const checkedOutLabel = staffAvailability?.checkedOutLabel ?? "-";
  const onLeaveLabel = staffAvailability?.onLeaveLabel ?? (staffAvailability?.isOnLeave ? "Yes" : "-");
  const holidayLabel = staffAvailability?.holidayLabel ?? (staffAvailability?.isHoliday ? "Holiday" : "-");
  const availabilityLabel =
    schedulerLoading
      ? "Checking"
      : staffAvailability?.availabilityLabel
        ? staffAvailability.availabilityLabel
        : form.staffId && !availabilityBlockReason && availableSlots.length > 0
          ? "Available"
          : form.staffId
            ? "Busy"
            : "-";
  const staffAvailabilityStatus = staffAvailability?.currentStatusLabel
    ? staffAvailability.currentStatusLabel
    : staffInactiveReason
      ? "Inactive"
      : schedulerLoading
        ? "Checking"
        : availableSlots.length > 0
          ? "Available"
          : form.staffId
            ? "Busy"
            : "Select staff";
  const slotDisabledReason = !validateDate(form.date)
    ? "Select a date to view times."
    : form.staffId && availabilityBlockReason
      ? availabilityBlockReason
      : null;
  useEffect(() => {
    if (!__DEV__ || !form.staffId) {
      return;
    }

  }, [
    availabilityBlockReason,
    availabilityLabel,
    availableSlots.length,
    checkedInLabel,
    checkedOutLabel,
    form.date,
    form.staffId,
    holidayLabel,
    onLeaveLabel,
    schedulerError,
    schedulerLoading,
    selectedStaff,
    staffAvailability,
    shiftEndLabel,
    shiftStartLabel,
    slotDisabledReason,
    staffAvailabilityStatus,
    workingHoursLabel,
  ]);
  const refreshStaffAvailability = useCallback(() => {
    setAvailabilityRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    void dispatch(fetchClientsThunk({ limit: 50, offset: 0, reset: true }));
  }, [dispatch]);

  // Prefetch the catalog as soon as the form opens so the service picker doesn't wait on the network.
  useEffect(() => {
    let cancelled = false;

    setServiceCatalogLoading(true);
    setServiceCatalogError(null);
    fetchServiceCatalog(activeBranchId).then(
      (catalog) => {
        if (cancelled) return;
        setServiceCatalog(catalog);
        setServiceCatalogLoading(false);
      },
      (error) => {
        if (cancelled) return;
        setServiceCatalogError(getApiErrorMessage(error));
        setServiceCatalogLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [activeBranchId, serviceCatalogRetryKey]);

  // Retry when the picker is opened after a failed load.
  useEffect(() => {
    if (servicePickerVisible && serviceCatalogError && !serviceCatalogLoading) {
      setServiceCatalogRetryKey((current) => current + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicePickerVisible]);

  useFocusEffect(
    useCallback(() => {
      refreshStaffAvailability();
    }, [refreshStaffAvailability]),
  );

  useAppForeground(refreshStaffAvailability);

  useEffect(
    () =>
      addRealtimeEntityChangedListener(({ entity, payload }) => {
        if (
          form.staffId &&
          STAFF_AVAILABILITY_REALTIME_ENTITIES.has(entity) &&
          realtimePayloadMatchesStaff(payload, form.staffId)
        ) {
          refreshStaffAvailability();
        }
      }),
    [form.staffId, refreshStaffAvailability],
  );

  useEffect(() => {
    if (!form.staffId || !validateDate(form.date)) {
      return;
    }

    void dispatch(fetchStaffAvailabilityThunk({ date: form.date, staffId: form.staffId }));
  }, [activeBranchId, availabilityRefreshKey, dispatch, form.date, form.staffId]);

  useEffect(() => {
    if (!form.startTime) {
      return;
    }

    const selectedSlot = findSlotForTime(form.startTime);
    setForm((current) => current.endTime === (selectedSlot?.endTime ?? "") ? current : {
      ...current,
      endTime: selectedSlot?.endTime ?? "",
    });
  }, [findSlotForTime, form.startTime]);

  useEffect(() => {
    const trimmedSearch = clientSearch.trim();

    if (
      !clientDropdownOpen ||
      clientBookingMode !== "existing" ||
      trimmedSearch.length < CLIENT_SEARCH_MIN_LETTERS
    ) {
      clientRequestIdRef.current += 1;
      setClientResultsLoading(false);
      setClientResultsError(null);
      setClientResults([]);
      return;
    }

    const queryKey = `${activeBranchId ?? "default"}:${trimmedSearch.toLowerCase()}`;
    const cached = clientCacheRef.current.get(queryKey);

    const applyResults = (requestId: number, matchingClients: ClientListItem[]) => {
      if (clientRequestIdRef.current !== requestId) {
        return;
      }

      setClientResults(matchingClients);
      setClientResultsError(null);
      setClientResultsLoading(false);
    };

    const applyFailure = (requestId: number, error: unknown) => {
      if (clientRequestIdRef.current !== requestId) {
        return;
      }

      setClientResultsError(getApiErrorMessage(error));
      setClientResults([]);
      setClientResultsLoading(false);
    };

    if (cached) {
      const requestId = clientRequestIdRef.current + 1;
      clientRequestIdRef.current = requestId;
      setClientResultsError(null);

      if (Array.isArray(cached)) {
        setClientResultsLoading(false);
        setClientResults(cached);
      } else {
        setClientResultsLoading(true);
        cached.then(
          (matchingClients) => applyResults(requestId, matchingClients),
          (error) => applyFailure(requestId, error),
        );
      }

      return;
    }

    const requestId = clientRequestIdRef.current + 1;
    clientRequestIdRef.current = requestId;
    setClientResultsLoading(true);
    setClientResultsError(null);

    const timeout = setTimeout(() => {
      const searchPromise = clientService
        .searchClients(
          {
            inactive: false,
            limit: CLIENT_SEARCH_RESULT_LIMIT,
            offset: 0,
            search: trimmedSearch,
            sort_by: "full_name",
            sort_order: "asc",
          },
          activeBranchId,
        )
        .then((response) => response.clients);

      clientCacheRef.current.set(queryKey, searchPromise);

      searchPromise.then(
        (matchingClients) => {
          clientCacheRef.current.set(queryKey, matchingClients);
          applyResults(requestId, matchingClients);
        },
        (error) => {
          clientCacheRef.current.delete(queryKey);
          applyFailure(requestId, error);
        },
      );
    }, CLIENT_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [activeBranchId, clientBookingMode, clientDropdownOpen, clientSearch]);

  useEffect(() => {
    if (mode === "edit" && appointmentId && !existingAppointment) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointmentId, dispatch, existingAppointment, mode]);

  useEffect(() => {
    if (existingAppointment) {
      setForm(appointmentToForm(existingAppointment));
      setSelectedServices(appointmentServicesToSelectedServices(existingAppointment));
      setClientBookingMode("existing");
      setClientSearch(existingAppointment.clientName);
      setClientDropdownOpen(false);
      setServiceDropdownOpen(false);
    }
  }, [existingAppointment]);

  useEffect(() => {
    if (!returnedClientId || mode !== "create") {
      return;
    }

    let cancelled = false;
    setClientBookingMode("existing");
    setClientDropdownOpen(false);
    setForm((current) => ({
      ...current,
      clientId: returnedClientId,
    }));
    setErrors((current) => ({ ...current, clientId: undefined }));

    const existingClient = clients.find((client) => client.id === returnedClientId);

    if (existingClient) {
      setSelectedClientRecord(existingClient);
      setClientSearch("");
      return;
    }

    void dispatch(fetchClientByIdThunk(returnedClientId)).then((result) => {
      if (!cancelled && fetchClientByIdThunk.fulfilled.match(result)) {
        setSelectedClientRecord(result.payload);
        setClientSearch("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clients, dispatch, mode, returnedClientId]);

  useEffect(() => {
    const firstService = selectedServices.find((service) => !service.itemKind);
    const firstServiceId = firstService ? getSelectedServiceCatalogId(firstService) : "";
    const nextDuration = selectedServices.reduce(
      (total, service) => total + Math.max(service.durationMinutes ?? 0, 0),
      0,
    );
    const nextPrice = getServicePricingTotals(selectedServices).grandTotal;

    setForm((current) => {
      const next = {
        ...current,
        duration: nextDuration > 0 ? String(nextDuration) : "",
        price: String(nextPrice),
        serviceId: firstServiceId,
        serviceName: (firstService ? selectedServices.filter((service) => !service.itemKind) : selectedServices)
          .map((service) => service.name)
          .join(", "),
      };

      if (selectedServices.length === 0) {
        next.endTime = "";
      }

      return next;
    });
  }, [selectedServices]);

  const updateForm = (key: keyof AppointmentFormState, value: string) => {
    setForm((current) => {
      if (key === "date" && current.date !== value) {
        return {
    ...current,
    date: value,
    endTime: "",
    startTime: "",
  };
      }

      return { ...current, [key]: value };
    });
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      ...(key === "date" ? { startTime: undefined } : {}),
    }));
    setFormSubmitError(null);
  };

  const dismissServiceDropdown = () => {
    setServiceDropdownOpen(false);
  };

  const dismissClientDropdown = () => {
    setClientDropdownOpen(false);
  };

  const handleSelectWalkInClient = () => {
    if (mode !== "create") {
      return;
    }

    setClientBookingMode("walkIn");
    setClientDropdownOpen(false);
    setClientSearch("Walk-in Client");
    setSelectedClientRecord(undefined);
    setForm((current) => ({
      ...current,
      clientId: "",
    }));
    setErrors((current) => ({ ...current, clientId: undefined }));
    setFormSubmitError(null);
  };

  const handleSelectExistingClientMode = () => {
    setClientBookingMode("existing");
    setClientDropdownOpen(true);
    if (clientSearch === "Walk-in Client") {
      setClientSearch("");
    }
  };

  const handleClientSearchChange = (value: string) => {
    setClientBookingMode("existing");
    setClientSearch(value);
    setClientDropdownOpen(Boolean(value.trim()));
    setSelectedClientRecord(undefined);
    setForm((current) => ({
      ...current,
      clientId: "",
    }));
    setErrors((current) => ({ ...current, clientId: undefined }));
  };

  const handleSelectClient = (client: ClientListItem) => {
    setClientBookingMode("existing");
    setClientSearch("");
    setClientDropdownOpen(false);
    setSelectedClientRecord(client);
    setForm((current) => ({
      ...current,
      clientId: client.id,
    }));
    setErrors((current) => ({ ...current, clientId: undefined }));
    setFormSubmitError(null);
  };

  const handleNewClient = () => {
    // The new-client screen can't open over the modal; it returns to the
    // full-screen booking form instead.
    embedded?.onRequestClose();
    router.push({ pathname: "/clients/new", params: { returnTo: "booking" } } as Href);
  };

  const handleSelectService = (service: ServiceListItem) => {
    serviceSearchInputRef.current?.blur();
    clientSearchInputRef.current?.blur();
    Keyboard.dismiss();
    setSelectedServices((current) => {
      const isSameService = (selectedService: AppointmentSelectedService) =>
        !selectedService.itemKind && getSelectedServiceCatalogId(selectedService) === service.id;
      if (current.some(isSameService)) {
        return current.filter((selectedService) => !isSameService(selectedService));
      }

      const consumables: AppointmentSelectedService["consumables"] = service.consumablesUsed?.length
        ? service.consumablesUsed.map((item) => ({ ...item, actualQty: item.qty }))
        : undefined;

      return [...current, { ...service, ...(consumables ? { consumables } : {}) }];
    });
    setServiceDropdownOpen(false);
    setErrors((current) => ({
      ...current,
      duration: undefined,
      price: undefined,
      serviceName: undefined,
    }));
  };

  // Products / memberships / packages: tap to add, tap again to remove.
  const handleToggleCatalogItem = (
    kind: AppointmentItemKind,
    item: { categoryId?: string | null; id: string; name: string; price: number },
  ) => {
    setSelectedServices((current) => {
      const existing = current.find(
        (selected) => selected.itemKind === kind && getSelectedServiceCatalogId(selected) === item.id,
      );
      if (existing) {
        return current.filter((selected) => selected !== existing);
      }

      return [
        ...current,
        {
          catalogServiceId: item.id,
          category: null,
          categoryId: item.categoryId ?? null,
          createdAt: null,
          durationMinutes: null,
          id: `${kind}:${item.id}`,
          isActive: true,
          itemKind: kind,
          name: item.name,
          price: Math.max(0, Number(item.price) || 0),
          quantity: 1,
        },
      ];
    });
    setErrors((current) => ({ ...current, serviceName: undefined, duration: undefined }));
  };

  const handleRemoveSelectedService = (serviceId: string) => {
    setSelectedServices((current) => current.filter((service) => service.id !== serviceId));
  };

  // Per-row staff / time, like the web's Services & Items table.
  const handleSetItemStaff = (itemId: string, staffId: string, staffName: string) => {
    setSelectedServices((current) => current.map((item) => item.id === itemId ? { ...item, staffId, staffName } : item));
  };

  const handleSetItemTime = (itemId: string, startTime: string) => {
    setSelectedServices((current) => current.map((item) => item.id === itemId ? { ...item, startTime } : item));
  };

  const handleSelectStaff = (staffId: string) => {
    setForm((current) => ({
      ...current,
      endTime: "",
      staffId: current.staffId === staffId ? "" : staffId,
    }));
    setErrors((current) => ({ ...current, staffId: undefined, startTime: undefined }));
  };

  const handleServicePickerContinue = () => {
    if (!form.staffId) {
      setErrors((current) => ({ ...current, staffId: "Select the staff." }));
      return;
    }

    setServicePickerVisible(false);
  };

  const handleSelectSlot = (startTime: string) => {
    const selectedSlot = findSlotForTime(startTime);

    setForm((current) => ({
      ...current,
      endTime: selectedSlot?.endTime ?? "",
      startTime,
    }));
    setErrors((current) => ({
      ...current,
      endTime: undefined,
      startTime: undefined,
    }));
  };

  const handleSubmit = async () => {
    if (submittingRef.current || mutating) {
      return;
    }

    const clientId = form.clientId;
    const isWalkInClient = mode === "create" && clientBookingMode === "walkIn";
    const nextErrors = validateForm(form, {
      allowedPastDate: allowedPastEditDate,
      requireClient: !isWalkInClient,
    });
    // Web parity: a product / membership / package-only booking is valid.
    const hasCatalogItems = selectedServices.some((service) => service.itemKind);
    if (hasCatalogItems) {
      delete nextErrors.serviceName;
    }
    if (form.staffId && (schedulerLoading || slotDisabledReason || availableSlots.length === 0)) {
      nextErrors.startTime = schedulerLoading
        ? "Availability is still loading. Please wait a moment."
        : slotDisabledReason ?? "No available times. Choose another date or staff member.";
    }

    setErrors(nextErrors);
    setFormSubmitError(null);

    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstError(nextErrors);
      return;
    }

    if (!clientId && !isWalkInClient) {
      setFormSubmitError("Select a client or choose Walk-in Client before creating the appointment.");
      return;
    }

    const selectedSlot = findSlotForTime(form.startTime);

    if (!selectedSlot) {
      setErrors((current) => ({
        ...current,
        startTime: "Select an available time slot.",
      }));
      scrollToField("startTime");
      return;
    }

    if (form.staffId && schedulerLoading) {
      setFormSubmitError("Availability is still loading. Please wait a moment.");
      return;
    }

    const selectedServicesDuration = selectedServices.reduce(
      (total, service) => total + Math.max(Math.trunc(service.durationMinutes ?? 0), 0),
      0,
    );
    const formDurationNumber = Number(form.duration);
    const durationMinutes =
      selectedServicesDuration > 0
        ? selectedServicesDuration
        : Number.isInteger(formDurationNumber) && formDurationNumber > 0
          ? formDurationNumber
          : hasCatalogItems
            ? 30
            : 0;

    if (durationMinutes <= 0) {
      setErrors((current) => ({
        ...current,
        duration: "Selected service duration is required.",
      }));
      scrollToField("duration");
      return;
    }

    const priceNumber = Number(form.price || 0);
    const calculatedPrice = Number.isFinite(priceNumber) && priceNumber >= 0 ? priceNumber : 0;
    const calculatedDiscount = Math.max(
      Number.isFinite(Number(form.discount || 0)) ? Number(form.discount || 0) : 0,
      servicePricingTotals.discount,
    );
    const calculatedEndTime = selectedSlot.endTime ?? form.endTime;
    const itemTime = (item: AppointmentSelectedService) => localItemTime(item.startTime);
    const serviceItems = selectedServices
      .filter((service) => !service.itemKind)
      .map((service) => {
        const serviceId = getSelectedServiceCatalogId(service).trim();

        if (!serviceId) {
          return null;
        }

        const quantity = Math.max(1, Math.trunc(service.quantity ?? 1));

        return {
          ...(service.consumables?.length
            ? {
              consumables: service.consumables.map((c) => ({
                actual_qty: c.actualQty ?? c.qty,
                product_id: c.productId,
                qty: c.qty,
                unit: c.unit,
              })),
            }
            : {}),
          ...(service.discount !== undefined ? { discount: service.discount } : {}),
          ...(service.durationMinutes ? { duration: service.durationMinutes } : {}),
          ...(service.isPackageService ? { is_package_service: true } : {}),
          name: service.name,
          price: service.price,
          quantity,
          service_id: serviceId,
          staff_id: service.staffId ?? form.staffId,
          staff_name: service.staffName ?? selectedStaff?.name,
          time: itemTime(service) ?? selectedSlot.value,
          total: service.total ?? service.price * quantity,
        };
      })
      .filter((service): service is NonNullable<typeof service> => Boolean(service));

    const itemStartTime = combineDateTime(form.date, selectedSlot.value);
    // Only a row's own staff / time, so an untouched edit-mode row keeps its saved values.
    const rowOverrides = (item: AppointmentSelectedService) => ({
      ...(item.staffId ? { staff_id: item.staffId, staff_name: item.staffName ?? undefined } : {}),
      ...(itemTime(item) ? { start_time: combineDateTime(form.date, itemTime(item)!) } : {}),
    });
    const toCatalogLine = (item: AppointmentSelectedService) => {
      const quantity = Math.max(1, Math.trunc(item.quantity ?? 1));
      return {
        ...(item.discount !== undefined ? { discount: item.discount } : {}),
        name: item.name,
        price: item.price,
        quantity,
        staff_id: form.staffId || undefined,
        staff_name: selectedStaff?.name,
        start_time: itemStartTime,
        total: item.total ?? item.price * quantity,
        ...rowOverrides(item),
      };
    };
    const catalogLines = (kind: AppointmentItemKind) =>
      selectedServices.filter((item) => item.itemKind === kind);
    const productItems = catalogLines("product").map((item) => ((item.rawItem ? { ...item.rawItem, ...rowOverrides(item) } : null) ?? {
      ...toCatalogLine(item),
      ...(item.categoryId ? { category_id: item.categoryId } : {}),
      product_id: getSelectedServiceCatalogId(item),
    }) as NonNullable<CreateAppointmentRequest["product_items"]>[number]);
    const membershipItems = catalogLines("membership").map((item) => ((item.rawItem ? { ...item.rawItem, ...rowOverrides(item) } : null) ?? {
      ...toCatalogLine(item),
      membership_id: getSelectedServiceCatalogId(item),
    }) as NonNullable<CreateAppointmentRequest["membership_items"]>[number]);
    const packageItems = catalogLines("package").map((item) => ((item.rawItem ? { ...item.rawItem, ...rowOverrides(item) } : null) ?? {
      ...toCatalogLine(item),
      package_id: getSelectedServiceCatalogId(item),
    }) as NonNullable<CreateAppointmentRequest["package_items"]>[number]);

    const payload: Omit<CreateAppointmentRequest, "salon_id"> = {
      duration_minutes: durationMinutes,
      end_time: combineDateTime(form.date, calculatedEndTime || selectedSlot.value),
      ...(calculatedDiscount > 0 ? { discount: calculatedDiscount } : {}),
      notes: form.notes.trim() || undefined,
      price: calculatedPrice,
      scheduled_at: combineDateTime(form.date, selectedSlot.value),
      service_id: form.serviceId.trim() || undefined,
      service_name: form.serviceName.trim() || undefined,
      services: serviceItems,
      membership_items: membershipItems,
      package_items: packageItems,
      product_items: productItems,
      staff_id: form.staffId,
      start_time: combineDateTime(form.date, selectedSlot.value),
      status: appointmentStatusToApiValue(form.status),
    };

    if (!isWalkInClient) {
      payload.client_id = clientId;
    }

    if (mode === "edit") {
      payload.discount = calculatedDiscount;
      payload.payment_method = form.paymentMethod;
    }

    submittingRef.current = true;

    // A paid/partial bill's status is owned by its payments: the backend
    // re-derives Paid/Partial from the edited total, so never send ours.
    const { status: _status, ...updatesWithoutStatus } = payload;
    const keepsBillStatus = Boolean(existingAppointment && getAppointmentPaymentStatus(existingAppointment) !== "Unpaid");

    const result =
      mode === "create"
        ? await dispatch(createAppointmentThunk(payload))
        : appointmentId
          ? await dispatch(
            updateAppointmentThunk({
              appointmentId,
              updates: (keepsBillStatus ? updatesWithoutStatus : payload) as Omit<UpdateAppointmentRequest, "salon_id">,
            }),
          )
          : null;

    if (!result) {
      submittingRef.current = false;
      return;
    }

    if (createAppointmentThunk.rejected.match(result) || updateAppointmentThunk.rejected.match(result)) {
      submittingRef.current = false;
      return;
    }

    const savedId = result.payload.appointment.id;
    // Booked from the Calendar: the new appointment appearing on the grid is
    // the confirmation, so just close without a toast.
    if (embedded) {
      dispatch(clearAppointmentToast());
      embedded.onRequestClose();
      return;
    }
    toast.showSuccess(mode === "create" ? "Appointment created successfully." : "Appointment updated successfully.");
    // Mutation thunks already refresh the list and dashboard. Navigate using
    // their cached appointment without repeating requests on the outgoing form.
    router.replace(`/appointments/${savedId}` as Href);
  };


  return { styles, activeBranchId, handleToggleCatalogItem, serviceCatalogError, serviceCatalogLoading, setServicePickerVisible, handleServicePickerContinue, handleSelectService, handleSelectStaff, handleSetItemStaff, handleSetItemTime, form, selectedServices, errors, staffMembers, serviceCatalog, servicePickerVisible, scrollViewRef, clientDropdownOpen, serviceDropdownOpen, dismissClientDropdown, dismissServiceDropdown, setFieldRef, clientBookingMode, handleNewClient, handleClientSearchChange, handleSelectClient, handleSelectExistingClientMode, handleSelectWalkInClient, clientResults, clientResultsError, clientResultsLoading, clientSearch, clientSearchInputRef, selectedClient, updateForm, slotDisabledReason, schedulerLoading, handleSelectSlot, availableSlots, Colors, handleRemoveSelectedService, servicePricingTotals, totalServiceDuration, totalServicePrice, selectedStaff, setSendAppointmentSms, sendAppointmentSms, setSendAppointmentEmail, sendAppointmentEmail, formSubmitError, mutationError, mutating, handleSubmit };
}
