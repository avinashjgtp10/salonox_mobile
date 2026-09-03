export const CLIENT = {
  CREATE: "/clients",
  DELETE: "/clients",
  DETAIL: "/clients",
  FILTER: "/clients/filter",
  LIST: "/clients",
  SEARCH: "/clients/search",
  UPDATE: "/clients",
  DUPLICATES: "/clients/duplicates",
  MERGE: "/clients/merge",
  MERGE_DUPLICATES: "/clients/merge-duplicates",
  BLOCK: "/clients/block",
  UNBLOCK: "/clients/unblock",
  WITH_HISTORY_STATS: "/clients/with-history-stats",
  // Single consolidated profile payload — client, stats, appointments, sales,
  // packages and memberships in one response. Path param is the client UUID.
  HISTORY: (clientId: string) => `/clients/${clientId}/history`,
  NOTES: (clientId: string) => `/clients/${clientId}/notes`,
} as const;
