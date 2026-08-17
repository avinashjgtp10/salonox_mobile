export const EWALLET = {
  BALANCE: (clientId: string) => `/ewallet/${clientId}/balance`,
} as const;
