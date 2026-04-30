import { createAsyncThunk } from "@reduxjs/toolkit";
import shiftApi from "./shiftApi";

export const fetchDailyShifts = createAsyncThunk(
  "shift/fetchDailyShifts",
  async (weekStart: string, { rejectWithValue }) => {
    try {
      const res = await shiftApi.getDailyShifts(weekStart);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch shifts"
      );
    }
  }
);

export const createShift = createAsyncThunk(
  "shift/createShift",
  async (data: Parameters<typeof shiftApi.createShift>[0], { rejectWithValue }) => {
    try {
      const res = await shiftApi.createShift(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to create shift");
    }
  }
);

export const updateShift = createAsyncThunk(
  "shift/updateShift",
  async (
    { id, data }: { id: string; data: Parameters<typeof shiftApi.updateShift>[1] },
    { rejectWithValue }
  ) => {
    try {
      const res = await shiftApi.updateShift(id, data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to update shift");
    }
  }
);

export const deleteShift = createAsyncThunk(
  "shift/deleteShift",
  async (id: string, { rejectWithValue }) => {
    try {
      await shiftApi.deleteShift(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete shift");
    }
  }
);

export const addTimeOff = createAsyncThunk(
  "shift/addTimeOff",
  async (data: Parameters<typeof shiftApi.addTimeOff>[0], { rejectWithValue }) => {
    try {
      const res = await shiftApi.addTimeOff(data);
      return { ...res.data, staffId: data.staffId, date: data.date, type: "timeoff" };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to add time off");
    }
  }
);

export const addDayOff = createAsyncThunk(
  "shift/addDayOff",
  async (data: Parameters<typeof shiftApi.addDayOff>[0], { rejectWithValue }) => {
    try {
      const res = await shiftApi.addDayOff(data);
      return { ...res.data, staffId: data.staffId, date: data.date, type: "dayoff" };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to add day off");
    }
  }
);

export const addBlockedTime = createAsyncThunk(
  "shift/addBlockedTime",
  async (data: Parameters<typeof shiftApi.addBlockedTime>[0], { rejectWithValue }) => {
    try {
      const res = await shiftApi.addBlockedTime(data);
      return { ...res.data, staffId: data.staffId, date: data.date, type: "blocked" };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to add blocked time");
    }
  }
);

export const copySchedule = createAsyncThunk(
  "shift/copySchedule",
  async (data: Parameters<typeof shiftApi.copySchedule>[0], { rejectWithValue }) => {
    try {
      const res = await shiftApi.copySchedule(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to copy schedule");
    }
  }
);
