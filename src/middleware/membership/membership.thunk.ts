import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { getApiErrorMessage } from "@/services/api";
import { membershipService } from "@/services/membership.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type {
  CreateMembershipRequest,
  CreateMembershipResponse,
  DeleteMembershipResponse,
  Membership,
  MembershipExportQuery,
  MembershipExportResponse,
  MembershipListQuery,
  MembershipListResponse,
  UpdateMembershipRequest,
  UpdateMembershipResponse,
} from "@/types/membership";

export type FetchMembershipsArgs = MembershipListQuery & {
  refresh?: boolean;
  reset?: boolean;
};

export type FetchMembershipsResult = MembershipListResponse & {
  query: MembershipListQuery;
};

export type DeleteMembershipResult = {
  membershipId: string;
  response: DeleteMembershipResponse;
};

export type ExportMembershipsArgs = MembershipExportQuery;

type RejectValue = {
  message: string;
};

const reject = (error: unknown): RejectValue => ({ message: getApiErrorMessage(error) });

const hasOwn = (value: object | undefined, key: string): boolean =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

const getNextQuery = (
  state: RootState["membership"],
  args?: FetchMembershipsArgs,
): MembershipListQuery => ({
  colour: hasOwn(args, "colour") ? args?.colour : state.query.colour,
  limit: args?.limit ?? state.query.limit,
  page: args?.reset || args?.refresh ? 1 : args?.page ?? state.query.page,
  search: hasOwn(args, "search") ? args?.search : state.query.search,
  sessionType: hasOwn(args, "sessionType") ? args?.sessionType : state.query.sessionType,
  validFor: hasOwn(args, "validFor") ? args?.validFor : state.query.validFor,
});

export const getMembershipQueryKey = (query: MembershipListQuery) =>
  JSON.stringify({
    colour: query.colour ?? null,
    limit: query.limit ?? null,
    page: query.page ?? null,
    search: query.search ?? null,
    sessionType: query.sessionType ?? null,
    validFor: query.validFor ?? null,
  });

export const getMembershipExportQueryKey = (query: MembershipExportQuery = {}) =>
  JSON.stringify({
    colour: query.colour ?? null,
    search: query.search ?? null,
    sessionType: query.sessionType ?? null,
    validFor: query.validFor ?? null,
  });

export const fetchMembershipsThunk = createAsyncThunk<
  FetchMembershipsResult,
  FetchMembershipsArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>(
  "membership/fetchMemberships",
  async (args, { getState, rejectWithValue }) => {
    try {
      const query = getNextQuery(getState().membership, args);
      const response = await membershipService.getMemberships(query, selectActiveBranchId(getState()));

      return {
        ...response,
        query,
      };
    } catch (error) {
      return rejectWithValue(reject(error));
    }
  },
  {
    condition: (args, { getState }) => {
      const state = getState().membership;
      const query = getNextQuery(state, args);
      const queryKey = getMembershipQueryKey(query);
      const isBusy = state.loading || state.loadingMore || state.refreshing;

      return !(isBusy && state.currentListRequestKey === queryKey);
    },
  },
);

export const fetchMembershipByIdThunk = createAsyncThunk<
  Membership,
  string,
  { rejectValue: RejectValue; state: RootState }
>(
  "membership/fetchMembershipById",
  async (membershipId, { rejectWithValue }) => {
    try {
      return await membershipService.getMembershipById(membershipId);
    } catch (error) {
      return rejectWithValue(reject(error));
    }
  },
  {
    condition: (membershipId, { getState }) => {
      const state = getState().membership;

      return !(state.detailsLoading && state.currentDetailsMembershipId === membershipId);
    },
  },
);

export const createMembershipThunk = createAsyncThunk<
  CreateMembershipResponse,
  CreateMembershipRequest,
  { rejectValue: RejectValue; state: RootState }
>(
  "membership/createMembership",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await membershipService.createMembership(payload);

      void dispatch(fetchMembershipsThunk({ ...getState().membership.query, refresh: true, reset: true }));
      void dispatch(fetchDashboardThunk());

      return response;
    } catch (error) {
      return rejectWithValue(reject(error));
    }
  },
  {
    condition: (_, { getState }) => !getState().membership.mutationLoading,
  },
);

export const updateMembershipThunk = createAsyncThunk<
  UpdateMembershipResponse,
  { data: UpdateMembershipRequest; membershipId: string },
  { rejectValue: RejectValue; state: RootState }
>(
  "membership/updateMembership",
  async ({ data, membershipId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await membershipService.updateMembership(membershipId, data);

      void dispatch(fetchMembershipByIdThunk(membershipId));
      void dispatch(fetchMembershipsThunk({ ...getState().membership.query, refresh: true, reset: true }));
      void dispatch(fetchDashboardThunk());

      return response;
    } catch (error) {
      return rejectWithValue(reject(error));
    }
  },
  {
    condition: (_, { getState }) => !getState().membership.mutationLoading,
  },
);

export const deleteMembershipThunk = createAsyncThunk<
  DeleteMembershipResult,
  string,
  { rejectValue: RejectValue; state: RootState }
>(
  "membership/deleteMembership",
  async (membershipId, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await membershipService.deleteMembership(membershipId);

      void dispatch(fetchMembershipsThunk({ ...getState().membership.query, refresh: true, reset: true }));
      void dispatch(fetchDashboardThunk());

      return {
        membershipId,
        response,
      };
    } catch (error) {
      return rejectWithValue(reject(error));
    }
  },
  {
    condition: (membershipId, { getState }) =>
      !getState().membership.deletingMembershipIds.includes(membershipId),
  },
);

export const exportMembershipsCsvThunk = createAsyncThunk<
  MembershipExportResponse,
  ExportMembershipsArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>(
  "membership/exportCsv",
  async (query, { getState, rejectWithValue }) => {
    try {
      return await membershipService.exportCsv(query, selectActiveBranchId(getState()));
    } catch (error) {
      return rejectWithValue(reject(error));
    }
  },
  {
    condition: (query, { getState }) => {
      const state = getState().membership;
      const queryKey = getMembershipExportQueryKey(query);

      return !(state.exporting && state.currentExportFormat === "csv" && state.currentExportRequestKey === queryKey);
    },
  },
);

export const exportMembershipsExcelThunk = createAsyncThunk<
  MembershipExportResponse,
  ExportMembershipsArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>(
  "membership/exportExcel",
  async (query, { getState, rejectWithValue }) => {
    try {
      return await membershipService.exportExcel(query, selectActiveBranchId(getState()));
    } catch (error) {
      return rejectWithValue(reject(error));
    }
  },
  {
    condition: (query, { getState }) => {
      const state = getState().membership;
      const queryKey = getMembershipExportQueryKey(query);

      return !(state.exporting && state.currentExportFormat === "excel" && state.currentExportRequestKey === queryKey);
    },
  },
);

export const exportMembershipsPdfThunk = createAsyncThunk<
  MembershipExportResponse,
  ExportMembershipsArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>(
  "membership/exportPdf",
  async (query, { getState, rejectWithValue }) => {
    try {
      return await membershipService.exportPdf(query, selectActiveBranchId(getState()));
    } catch (error) {
      return rejectWithValue(reject(error));
    }
  },
  {
    condition: (query, { getState }) => {
      const state = getState().membership;
      const queryKey = getMembershipExportQueryKey(query);

      return !(state.exporting && state.currentExportFormat === "pdf" && state.currentExportRequestKey === queryKey);
    },
  },
);
