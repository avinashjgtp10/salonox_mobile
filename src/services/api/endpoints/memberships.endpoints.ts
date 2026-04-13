import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
  createdAt: Date;
  updatedAt: Date;
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
    baseUrl: (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000") + "/api/v1",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
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
