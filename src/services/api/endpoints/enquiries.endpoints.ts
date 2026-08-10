export const ENQUIRY = {
  BASE: "/api/v1/enquiries",
  LIST: (params: string) => `/api/v1/enquiries${params ? `?${params}` : ""}`,
  BY_ID: (id: string) => `/api/v1/enquiries/${id}`,
} as const;
