import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_V1_BASE_URL } from "../baseUrl";

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
  durationMinutes: number; // in minutes
  category: string;
  status: "Active" | "Draft" | "Inactive";
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
  status: "Active" | "Draft" | "Inactive";
  colour: string;
  serviceIds?: string[];
  offers?: PackageOffer[];
}

export interface UpdatePackageDTO extends Partial<CreatePackageDTO> {}

export interface PackagesListQuery {
  category?: string;
  status?: string;
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
  useGetPackageByIdQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} = packagesApi;
