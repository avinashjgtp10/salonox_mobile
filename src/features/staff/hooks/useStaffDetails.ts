import { useCallback, useEffect } from "react";

import {
  fetchEmergencyContactsThunk,
  fetchStaffAddressesThunk,
  fetchStaffByIdThunk,
} from "@/middleware/staff/staff.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectEmergencyContactListState,
  selectEmergencyContactsByStaffId,
  selectStaffAddressListState,
  selectStaffAddressesByStaffId,
  selectStaffById,
  selectStaffDetailsError,
  selectStaffDetailsLoading,
} from "@/store/staff/staff.slice";
import { isValidStaffId } from "@/utils/staffIds";

export const useStaffDetails = (staffId?: string | null) => {
  const dispatch = useAppDispatch();
  const staffMember = useAppSelector((state) => selectStaffById(state, staffId));
  const detailsLoading = useAppSelector(selectStaffDetailsLoading);
  const detailsError = useAppSelector(selectStaffDetailsError);
  const addressListState = useAppSelector((state) => selectStaffAddressListState(state, staffId));
  const addresses = useAppSelector((state) => selectStaffAddressesByStaffId(state, staffId));
  const emergencyContactListState = useAppSelector((state) =>
    selectEmergencyContactListState(state, staffId),
  );
  const emergencyContacts = useAppSelector((state) =>
    selectEmergencyContactsByStaffId(state, staffId),
  );

  const refresh = useCallback(() => {
    if (!staffId) {
      return;
    }

    void dispatch(fetchStaffByIdThunk(staffId));
    if (!isValidStaffId(staffId)) {
      return;
    }

    void dispatch(
      fetchStaffAddressesThunk({
        limit: addressListState?.query.limit ?? 10,
        page: 1,
        refresh: true,
        staffId,
      }),
    );
    void dispatch(
      fetchEmergencyContactsThunk({
        limit: emergencyContactListState?.query.limit ?? 10,
        page: 1,
        refresh: true,
        staffId,
      }),
    );
  }, [addressListState?.query.limit, dispatch, emergencyContactListState?.query.limit, staffId]);

  useEffect(() => {
    if (!staffId) {
      return;
    }

    void dispatch(fetchStaffByIdThunk(staffId));
    if (!isValidStaffId(staffId)) {
      return;
    }

    void dispatch(
      fetchStaffAddressesThunk({
        limit: addressListState?.query.limit ?? 10,
        page: 1,
        reset: true,
        staffId,
      }),
    );
    void dispatch(
      fetchEmergencyContactsThunk({
        limit: emergencyContactListState?.query.limit ?? 10,
        page: 1,
        reset: true,
        staffId,
      }),
    );
  }, [addressListState?.query.limit, dispatch, emergencyContactListState?.query.limit, staffId]);

  return {
    addresses,
    addressListState,
    detailsError,
    detailsLoading,
    emergencyContactListState,
    emergencyContacts,
    refresh,
    staffMember,
  };
};
