export const FEEDBACK = {
  CONTEXT: (slug: string) => `/api/v1/feedback/context/${slug}`,
  SUBMIT:  (slug: string) => `/api/v1/feedback/submit/${slug}`,
} as const;
