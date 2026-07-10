import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_V1_BASE_URL } from "../baseUrl";

export type PackageStatus = "Active" | "Draft" | "Inactive";

export interface PackageOffer {
  id?: string;
  name?: string;
  couponCode: string;
  discount: number;
  type: "Percent (%)" | "Fixed (₹)";
  startDate?: string;
  endDate?: string;
  minOrder?: number;
  active: boolean;
}

export interface PackageService {
  serviceId: number;
  name: string;
  price: number;
}

export interface Package {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  durationMinutes: number;
  category: string;
  status: PackageStatus;
  colour: string;
  serviceIds?: string[];
  offers?: PackageOffer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePackageDTO {
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  durationMinutes: number;
  category: string;
  status: PackageStatus;
  colour: string;
  serviceIds?: string[];
  offers?: PackageOffer[];
}

export interface UpdatePackageDTO extends Partial<CreatePackageDTO> {}

export interface PackagesListQuery {
  category?: string;
  status?: PackageStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PackagesListResponse {
  items: Package[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const packagesApi = createApi({
  reducerPath: "packagesApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_V1_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as any;
      const token = state?.auth?.accessToken;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Package"],

  endpoints: (builder) => ({

    listPackages: builder.query<PackagesListResponse, PackagesListQuery>({
      query: (params = {}) => ({ url: "/packages", params }),
      transformResponse: (res: ApiResponse<PackagesListResponse>) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Package" as const, id })),
              { type: "Package", id: "LIST" },
            ]
          : [{ type: "Package", id: "LIST" }],
    }),

    getPackageById: builder.query<Package, string>({
      query: (id) => `/packages/${id}`,
      transformResponse: (res: ApiResponse<Package>) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Package", id }],
    }),

    createPackage: builder.mutation<Package, CreatePackageDTO>({
      query: (body) => ({ url: "/packages", method: "POST", body }),
      transformResponse: (res: ApiResponse<Package>) => res.data,
      invalidatesTags: [{ type: "Package", id: "LIST" }],
    }),

    updatePackage: builder.mutation<Package, { id: string; data: UpdatePackageDTO }>({
      query: ({ id, data }) => ({ url: `/packages/${id}`, method: "PATCH", body: data }),
      transformResponse: (res: ApiResponse<Package>) => res.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Package", id },
        { type: "Package", id: "LIST" },
      ],
    }),

    deletePackage: builder.mutation<void, string>({
      query: (id) => ({ url: `/packages/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Package", id },
        { type: "Package", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListPackagesQuery,
  useLazyListPackagesQuery,
  useGetPackageByIdQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} = packagesApi;

// ─── Client Package (sold / assigned to a client) ────────────────────────────

export interface ClientPackageService {
  serviceId: string;
  serviceName: string;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  price: number;
  sessionHistory: Array<{
    sessionNo: number;
    date: string;
    staff: string;
    status: string;
  }>;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  clientName: string;
  mobile?: string;
  email?: string;
  packageName: string;
  category: string;
  branch: string;
  createdDate: string;
  expiryDate: string | null;
  status: string;
  basePrice: number;
  gstPercentage: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  services: ClientPackageService[];
  paymentMethod: string;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
}

export interface CreateClientPackageDTO {
  clientId: string;
  packageName: string;
  category?: string;
  branch?: string;
  expiryDate: string;
  basePrice: number;
  gstPercentage: number;
  discount: number;
  paymentMethod: string;
  services: Array<{
    serviceName: string;
    totalSessions: number;
    price: number;
  }>;
}

export interface ClientPackagesListQuery {
  clientId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ClientPackagesListResponse {
  items: ClientPackage[];
  total: number;
}

export interface UpdateClientPackageDTO {
  packageName?:    string;
  expiryDate?:     string;
  paymentMethod?:  string;
  basePrice?:      number;
  gstPercentage?:  number;
  discount?:       number;
  services?: Array<{
    serviceId:      string;
    serviceName?:   string;
    totalSessions?: number;
    price?:         number;
  }>;
}

export interface CompleteSessionDTO {
  serviceId: string;
  staffName: string;
  appointmentId?: string;
}

export const clientPackagesApi = createApi({
  reducerPath: "clientPackagesApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_V1_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as any;
      const token = state?.auth?.accessToken;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["ClientPackage"],

  endpoints: (builder) => ({

    listClientPackages: builder.query<ClientPackagesListResponse, ClientPackagesListQuery>({
      query: (params = {}) => ({ url: "/client-packages", params }),
      transformResponse: (res: ApiResponse<ClientPackagesListResponse>) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "ClientPackage" as const, id })),
              { type: "ClientPackage", id: "LIST" },
            ]
          : [{ type: "ClientPackage", id: "LIST" }],
    }),

    getClientPackageById: builder.query<ClientPackage, string>({
      query: (id) => `/client-packages/${id}`,
      transformResponse: (res: ApiResponse<ClientPackage>) => res.data,
      providesTags: (_result, _error, id) => [{ type: "ClientPackage", id }],
    }),

    createClientPackage: builder.mutation<ClientPackage, CreateClientPackageDTO>({
      query: (body) => ({ url: "/client-packages", method: "POST", body }),
      transformResponse: (res: ApiResponse<ClientPackage>) => res.data,
      invalidatesTags: [{ type: "ClientPackage", id: "LIST" }],
    }),

    updateClientPackage: builder.mutation<ClientPackage, { id: string; data: UpdateClientPackageDTO }>({
      query: ({ id, data }) => ({ url: `/client-packages/${id}`, method: "PATCH", body: data }),
      transformResponse: (res: ApiResponse<ClientPackage>) => res.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "ClientPackage", id },
        { type: "ClientPackage", id: "LIST" },
      ],
    }),

    completeClientPackageSession: builder.mutation<
      ClientPackage,
      { id: string; body: CompleteSessionDTO }
    >({
      query: ({ id, body }) => ({
        url: `/client-packages/${id}/sessions/complete`,
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<ClientPackage>) => res.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "ClientPackage", id },
        { type: "ClientPackage", id: "LIST" },
      ],
    }),

    deleteClientPackage: builder.mutation<void, string>({
      query: (id) => ({ url: `/client-packages/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "ClientPackage", id },
        { type: "ClientPackage", id: "LIST" },
      ],
    }),

  }),
});

export const {
  useListClientPackagesQuery,
  useGetClientPackageByIdQuery,
  useCreateClientPackageMutation,
  useUpdateClientPackageMutation,
  useCompleteClientPackageSessionMutation,
  useDeleteClientPackageMutation,
} = clientPackagesApi;

// ─── Package Templates ────────────────────────────────────────────────────────

export interface PackageTemplateService {
  id:            string;
  templateId:    string;
  serviceName:   string;
  totalSessions: number;
  price:         number;
}

export interface PackageTemplate {
  id:             string;
  salonId:        string;
  name:           string;
  expiryMonths:   number | null;
  /** Exact day-count for the picked expiry date — the precise source of truth;
   *  expiryMonths is kept only as a rounded, human-friendly label. */
  expiryDays:     number | null;
  neverExpires:   boolean;
  basePrice:      number;
  gstPercentage:  number;
  discount:       number;
  paymentMethod:  string;
  createdAt:      string;
  services:       PackageTemplateService[];
}

export interface CreatePackageTemplateDTO {
  name:           string;
  expiryMonths?:  number | null;
  expiryDays?:    number | null;
  neverExpires?:  boolean;
  basePrice:      number;
  gstPercentage?: number;
  discount?:      number;
  paymentMethod?: string;
  services: Array<{
    serviceName:   string;
    totalSessions: number;
    price:         number;
  }>;
}

export interface UpdatePackageTemplateDTO extends Partial<CreatePackageTemplateDTO> {}

export const packageTemplatesApi = createApi({
  reducerPath: "packageTemplatesApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_V1_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as any;
      const token = state?.auth?.accessToken;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["PackageTemplate"],
  endpoints: (builder) => ({

    listPackageTemplates: builder.query<PackageTemplate[], void>({
      query: () => "/package-templates",
      transformResponse: (res: ApiResponse<PackageTemplate[]>) => res.data,
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: "PackageTemplate" as const, id })), { type: "PackageTemplate", id: "LIST" }]
          : [{ type: "PackageTemplate", id: "LIST" }],
    }),

    createPackageTemplate: builder.mutation<PackageTemplate, CreatePackageTemplateDTO>({
      query: (body) => ({ url: "/package-templates", method: "POST", body }),
      transformResponse: (res: ApiResponse<PackageTemplate>) => res.data,
      invalidatesTags: [{ type: "PackageTemplate", id: "LIST" }],
    }),

    updatePackageTemplate: builder.mutation<PackageTemplate, { id: string; data: UpdatePackageTemplateDTO }>({
      query: ({ id, data }) => ({ url: `/package-templates/${id}`, method: "PATCH", body: data }),
      transformResponse: (res: ApiResponse<PackageTemplate>) => res.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "PackageTemplate", id },
        { type: "PackageTemplate", id: "LIST" },
      ],
    }),

    deletePackageTemplate: builder.mutation<void, string>({
      query: (id) => ({ url: `/package-templates/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "PackageTemplate", id },
        { type: "PackageTemplate", id: "LIST" },
      ],
    }),

  }),
});

export const {
  useListPackageTemplatesQuery,
  useLazyListPackageTemplatesQuery,
  useCreatePackageTemplateMutation,
  useUpdatePackageTemplateMutation,
  useDeletePackageTemplateMutation,
} = packageTemplatesApi;