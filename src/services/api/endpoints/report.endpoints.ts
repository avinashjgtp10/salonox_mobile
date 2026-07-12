export const REPORT = {
  DETAIL: (category: string, params: string) =>
    `/api/v1/reports/${category}/detail?${params}`,
} as const;
