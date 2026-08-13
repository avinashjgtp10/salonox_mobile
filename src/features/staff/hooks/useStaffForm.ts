import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { createStaffThunk, updateStaffThunk, fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { getApiErrorMessage } from "@/services/api";
import { staffService } from "@/services/staff.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffById,
  selectStaffCreateError,
  selectStaffCreating,
  selectStaffUpdateError,
  selectStaffUpdating,
  selectStaffMembers,
} from "@/store/staff/staff.slice";
import type { StaffProfileFormValues, StaffRoleLevel } from "@/features/staff/types/staffFeature.types";
import { generateNextEmployeeCode } from "@/features/staff/utils/employeeCodeUtils";
import { mapStaffFormToRequest, mapStaffWagesToRequest } from "@/features/staff/utils/staffFormMappers";
import { parseWorkingHours } from "@/features/staff/utils/timeUtils";
import { validateStaffForm } from "@/features/staff/validation/staff.validation";

const EMPTY_STAFF_FORM: StaffProfileFormValues = {
  address: "",
  avatarUrl: "",
  confirmPassword: "",
  designation: "",
  dob: "",
  email: "",
  employeeCode: "",
  fixedSalary: "",
  fullName: "",
  gender: "",
  holidays: "",
  hourlyRate: "",
  isAutoGenerate: true,
  isLoginEnabled: false,
  joiningDate: "",
  notes: "",
  password: "",
  phone: "",
  phoneCountry: "IN",
  roleLevel: "Staff",
  work_end_time: "",
  work_start_time: "",
  workingHoursPerDay: "",
};

const toPermissionRoleLevel = (permissionLevel?: string): StaffRoleLevel =>
  permissionLevel?.trim().toLowerCase() === "manager" ? "Manager" : "Staff";

// The backend only ever returns birthday_day/birthday_month (no year), so an
// edit-mode prefill can't reconstruct the real date of birth. A fixed
// placeholder year keeps the date picker showing the right day/month without
// implying a fabricated birth year — the user can correct the year if needed.
const DOB_PLACEHOLDER_YEAR = 2000;

const toPlaceholderDob = (day?: number | null, month?: number | null) => {
  if (!day || !month) {
    return "";
  }

  return `${DOB_PLACEHOLDER_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const useStaffForm = (staffId?: string | null) => {
  const dispatch = useAppDispatch();
  const staffMember = useAppSelector((state) => selectStaffById(state, staffId));
  const staffMembers = useAppSelector(selectStaffMembers);
  const creating = useAppSelector(selectStaffCreating);
  const createError = useAppSelector(selectStaffCreateError);
  const updating = useAppSelector(selectStaffUpdating);
  const updateError = useAppSelector(selectStaffUpdateError);
  const [values, setValues] = useState<StaffProfileFormValues>(EMPTY_STAFF_FORM);
  // A field's error is only surfaced once the user has actually interacted
  // with it (or after a Save attempt touches everything at once) — showing
  // "required" on every empty field the instant the screen opens is not
  // useful feedback, it's just noise.
  const [touched, setTouched] = useState<Partial<Record<keyof StaffProfileFormValues, boolean>>>({});
  const [duplicateEmailError, setDuplicateEmailError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const isEditMode = Boolean(staffId);
  const submitting = creating || updating;

  const autoEmployeeCode = useMemo(() => generateNextEmployeeCode(staffMembers), [staffMembers]);

  const validation = useMemo(
    () => validateStaffForm(values, staffMembers, staffId),
    [staffMembers, staffId, values],
  );

  const visibleValidationErrors = useMemo(() => {
    const visibleErrors: Record<string, string> = {};

    for (const [field, message] of Object.entries(validation.errors)) {
      if (touched[field as keyof StaffProfileFormValues]) {
        visibleErrors[field] = message;
      }
    }

    return visibleErrors;
  }, [touched, validation.errors]);

  useEffect(() => {
    if (!staffMember) {
      return;
    }

    const { startTime, endTime } = parseWorkingHours(staffMember.workingHours);

    setValues({
      address: staffMember.address ?? "",
      avatarUrl: staffMember.avatarUrl ?? "",
      confirmPassword: "",
      designation: staffMember.designation ?? "",
      dob: toPlaceholderDob(staffMember.birthdayDay, staffMember.birthdayMonth),
      email: staffMember.email === "-" ? "" : staffMember.email,
      employeeCode: staffMember.employeeCode === "-" ? "" : (staffMember.employeeCode || ""),
      fixedSalary: "",
      fullName: staffMember.name,
      gender: staffMember.gender === "-" ? "" : staffMember.gender,
      holidays: staffMember.holidays != null ? String(staffMember.holidays) : "",
      hourlyRate: "",
      isAutoGenerate: false,
      isLoginEnabled: false,
      joiningDate: staffMember.joiningDate === "-" ? "" : staffMember.joiningDate,
      notes: staffMember.notes,
      password: "",
      phone: staffMember.phone === "-" ? "" : staffMember.phone,
      phoneCountry: "IN",
      roleLevel: toPermissionRoleLevel(staffMember.permissionLevel),
      work_end_time: endTime,
      work_start_time: startTime,
      workingHoursPerDay:
        staffMember.workingHoursPerDay != null ? String(staffMember.workingHoursPerDay) : "",
    });
    setTouched({});
  }, [staffMember]);

  const updateField = <K extends keyof StaffProfileFormValues>(
    field: K,
    value: StaffProfileFormValues[K],
  ) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setTouched((currentTouched) => (currentTouched[field] ? currentTouched : { ...currentTouched, [field]: true }));

    if (field === "email" && duplicateEmailError) {
      setDuplicateEmailError(null);
    }
  };

  const uploadAvatar = async (asset: { fileName?: string | null; mimeType?: string | null; uri: string }) => {
    setAvatarUploading(true);
    setAvatarError(null);

    try {
      const response = await staffService.uploadAvatar(asset);
      updateField("avatarUrl", response.url);
      return true;
    } catch (error) {
      setAvatarError(getApiErrorMessage(error));
      return false;
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = () => {
    updateField("avatarUrl", "");
    setAvatarError(null);
  };

  const submit = async () => {
    if (!validation.isValid) {
      // Reveal every error at once, exactly like clicking Save on Web with
      // an incomplete form — not just the fields the user happened to touch.
      setTouched((currentTouched) => ({
        ...currentTouched,
        ...(Object.fromEntries(Object.keys(validation.errors).map((field) => [field, true])) as Partial<
          Record<keyof StaffProfileFormValues, boolean>
        >),
      }));

      return false;
    }

    setDuplicateEmailError(null);

    const payload = mapStaffFormToRequest(values, autoEmployeeCode);
    const wages = mapStaffWagesToRequest(values);
    const action =
      isEditMode && staffId
        ? await dispatch(updateStaffThunk({ staffId, updates: payload, wages }))
        : await dispatch(createStaffThunk({ staff: payload, wages }));
    const succeeded =
      createStaffThunk.fulfilled.match(action) || updateStaffThunk.fulfilled.match(action);

    if (!succeeded && (createStaffThunk.rejected.match(action) || updateStaffThunk.rejected.match(action))) {
      if (action.payload?.status === 409) {
        setDuplicateEmailError(action.payload.message);
      }

      return false;
    }

    if (succeeded) {
      void dispatch(
        fetchStaffThunk({
          page: 1,
          refresh: true,
        }),
      );

      const nextStaffId =
        "payload" in action && action.payload && "staffMember" in action.payload
          ? action.payload.staffMember.id
          : staffId;

      if (nextStaffId) {
        router.replace(`/team/${nextStaffId}`);
      } else {
        router.replace("/team");
      }
    }

    return succeeded;
  };

  return {
    autoEmployeeCode,
    avatarError,
    avatarUploading,
    duplicateEmailError,
    error: duplicateEmailError ?? (isEditMode ? updateError : createError),
    isEditMode,
    isValid: validation.isValid,
    removeAvatar,
    staffMember,
    submit,
    submitting,
    updateField,
    uploadAvatar,
    validationErrors: visibleValidationErrors,
    values,
  };
};
