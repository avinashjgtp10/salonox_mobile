import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { attendanceService } from "@/services/attendance.service";
import { getCurrentCalendarMonthRange } from "@/services/salonCommissions.service";
import { salesService } from "@/services/sales.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type { AttendanceRecord } from "@/types/attendance";
import type { StaffSaleItem } from "@/types/sales";

type RejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

const toRejectValue = (error: unknown): RejectValue => ({
  message: error instanceof ApiError ? error.message : getApiErrorMessage(error),
  responseBody: error instanceof ApiError ? error.responseData : undefined,
  status: error instanceof ApiError ? error.status : undefined,
});

export const fetchStaffSaleHistoryThunk = createAsyncThunk<
  { items: StaffSaleItem[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffHistory/fetchSales", async (staffId, { rejectWithValue }) => {
  try {
    const range = getCurrentCalendarMonthRange();
    const { items } = await salesService.getStaffItems(staffId, {
      endDate: range.end_date,
      startDate: range.start_date,
    });

    return { items, staffId };
  } catch (error) {
    console.error("[StaffHistory] Fetch sale history failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchStaffAttendanceHistoryThunk = createAsyncThunk<
  { records: AttendanceRecord[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffHistory/fetchAttendance", async (staffId, { getState, rejectWithValue }) => {
  try {
    const range = getCurrentCalendarMonthRange();
    const { records } = await attendanceService.getForStaff(staffId, {
      endDate: range.end_date,
      salonId: selectActiveBranchId(getState()),
      startDate: range.start_date,
    });

    return { records, staffId };
  } catch (error) {
    console.error("[StaffHistory] Fetch attendance history failed", {
      staffId,
      ...toRejectValue(error),
    });

    return rejectWithValue(toRejectValue(error));
  }
});
