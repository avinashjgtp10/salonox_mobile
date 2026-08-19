export const BRANCH_OWNER = {
  SALONS:      "/api/v1/branch-owner/salons",
  SALON_ENTER: (id: string) => `/api/v1/branch-owner/salons/${id}/enter`,
} as const;
