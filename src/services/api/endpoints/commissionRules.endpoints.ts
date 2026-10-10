export const COMMISSION_RULES = {
  BASE: "/commission-rules",
  BY_ID: (ruleId: string) => `/commission-rules/${ruleId}`,
  PROGRESS: (ruleId: string) => `/commission-rules/${ruleId}/progress`,
  STATUS: (ruleId: string) => `/commission-rules/${ruleId}/status`,
} as const;
