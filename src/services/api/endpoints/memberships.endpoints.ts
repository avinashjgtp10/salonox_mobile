import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_V1_BASE_URL } from "../baseUrl";

export interface IncludedService {
  serviceId: string;
  serviceName: string;
  durationMinutes?: number;
}

export interface Membership {
  id: string;
  name: string;
  description?: string;
  includedServices: IncludedService[];
  sessionType: string;
  numberOfSessions?: number;
  validFor: string;
  price: number;
  taxRate?: number;
  colour: string;
  enableOnlineSales: boolean;
  enableOnlineRedemption: boolean;
  termsAndConditions?: string;
  appliesToProducts?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Optional client association (if backend supports it)
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  client?: { id?: string; name?: string; first_name?: string; last_name?: string; phone_number?: string; phone?: string; };
}

export interface CreateMembershipDTO {
  name: string;
  description?: string;
  includedServices: IncludedService[];
  sessionType: string;
  numberOfSessions?: number;
  validFor: string;
  price: number;
  taxRate?: number;
  colour: string;
  enableOnlineSales: boolean;
  enableOnlineRedemption: boolean;
  termsAndConditions?: string;
  appliesToProducts?: boolean;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
}

export interface UpdateMembershipDTO extends Partial<CreateMembershipDTO> {}

export interface MembershipsListQuery {
  sessionType?: string;
  colour?: string;
  validFor?: string;
  page?: number;
  limit?: number;
}

export interface MembershipsListResponse {
  items: Membership[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const membershipsApi = createApi({
  reducerPath: "membershipsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_V1_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as any;
      const token = state?.auth?.accessToken;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Membership"],

  endpoints: (builder) => ({

    listMemberships: builder.query<MembershipsListResponse, MembershipsListQuery>({
      query: (params = {}) => ({ url: "/memberships", params }),
      transformResponse: (res: ApiResponse<MembershipsListResponse>) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Membership" as const, id })),
              { type: "Membership", id: "LIST" },
            ]
          : [{ type: "Membership", id: "LIST" }],
    }),

    getMembershipById: builder.query<Membership, string>({
      query: (id) => `/memberships/${id}`,
      transformResponse: (res: ApiResponse<Membership>) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Membership", id }],
    }),

    createMembership: builder.mutation<Membership, CreateMembershipDTO>({
      query: (body) => ({ url: "/memberships", method: "POST", body }),
      transformResponse: (res: ApiResponse<Membership>) => res.data,
      invalidatesTags: [{ type: "Membership", id: "LIST" }],
    }),

    updateMembership: builder.mutation<Membership, { id: string; data: UpdateMembershipDTO }>({
      query: ({ id, data }) => ({ url: `/memberships/${id}`, method: "PATCH", body: data }),
      transformResponse: (res: ApiResponse<Membership>) => res.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Membership", id },
        { type: "Membership", id: "LIST" },
      ],
    }),

    deleteMembership: builder.mutation<void, string>({
      query: (id) => ({ url: `/memberships/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Membership", id },
        { type: "Membership", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListMembershipsQuery,
  useGetMembershipByIdQuery,
  useCreateMembershipMutation,
  useUpdateMembershipMutation,
  useDeleteMembershipMutation,
} = membershipsApi;
