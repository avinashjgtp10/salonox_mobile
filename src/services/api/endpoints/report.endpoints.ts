export const REPORT = {
  APPOINTMENT_DETAIL_TABLE: (params: string) =>
    `/api/v1/reports/appointment-detail/table?${params}`,
  DAILY_SHEET_TABLE: (params: string) =>
    `/api/v1/reports/daily-sheet/table?${params}`,
  REWARD_POINTS_TABLE: (params: string) =>
    `/api/v1/reports/reward-points/table?${params}`,
} as const;
