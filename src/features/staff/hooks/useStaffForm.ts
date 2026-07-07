import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { createStaffThunk, updateStaffThunk, fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffById,
  selectStaffCreateError,
  selectStaffCreating,
  selectStaffUpdateError,
  selectStaffUpdating,
  selectStaffMembers,
} from "@/store/staff/staff.slice";
import type { StaffProfileFormValues } from "@/features/staff/types/staffFeature.types";
import { generateNextEmployeeCode } from "@/features/staff/utils/employeeCodeUtils";
import { mapStaffFormToRequest } from "@/features/staff/utils/staffFormMappers";
import { parseWorkingHours } from "@/features/staff/utils/timeUtils";
import { validateStaffForm } from "@/features/staff/validation/staff.validation";

const EMPTY_STAFF_FORM: StaffProfileFormValues = {
  email: "",
  fullName: "",
  gender: "",
  joining_date: "",
  notes: "",
  phone: "",
  role: "",
  work_start_time: "",
  work_end_time: "",
  employeeCode: "",
  isAutoGenerate: true,
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
  const isEditMode = Boolean(staffId);
  const submitting = creating || updating;

  const autoEmployeeCode = useMemo(() => generateNextEmployeeCode(staffMembers), [staffMembers]);

  const validation = useMemo(
    () =>
      validateStaffForm(
        {
          fullName: values.fullName,
          phone: values.phone,
          employeeCode: values.employeeCode,
          isAutoGenerate: values.isAutoGenerate,
          work_start_time: values.work_start_time,
          work_end_time: values.work_end_time,
        },
        staffMembers,
        staffId,
      ),
    [
      values.fullName,
      values.phone,
      values.employeeCode,
      values.isAutoGenerate,
      values.work_start_time,
      values.work_end_time,
      staffMembers,
      staffId,
    ],
  );

  useEffect(() => {
    if (!staffMember) {
      return;
    }

    const { startTime, endTime } = parseWorkingHours(staffMember.workingHours);

    setValues({
      email: staffMember.email === "-" ? "" : staffMember.email,
      fullName: staffMember.name,
      gender: staffMember.gender === "-" ? "" : staffMember.gender,
      joining_date: staffMember.joiningDate === "-" ? "" : staffMember.joiningDate,
      notes: staffMember.notes,
      phone: staffMember.phone === "-" ? "" : staffMember.phone,
      role: staffMember.role,
      work_start_time: startTime,
      work_end_time: endTime,
      employeeCode: staffMember.employeeCode === "-" ? "" : (staffMember.employeeCode || ""),
      isAutoGenerate: false,
    });
  }, [staffMember]);

  const updateField = (field: keyof StaffProfileFormValues, value: string | boolean) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const submit = async () => {
    if (!validation.isValid) {
      return false;
    }

    const payload = mapStaffFormToRequest(values, autoEmployeeCode);
    const action =
      isEditMode && staffId
        ? await dispatch(updateStaffThunk({ staffId, updates: payload }))
        : await dispatch(createStaffThunk(payload));
    const succeeded =
      createStaffThunk.fulfilled.match(action) || updateStaffThunk.fulfilled.match(action);

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
    error: isEditMode ? updateError : createError,
    isEditMode,
    isValid: validation.isValid,
    staffMember,
    submit,
    submitting,
    updateField,
    validationErrors: validation.errors,
    values,
    autoEmployeeCode,
  };
};
