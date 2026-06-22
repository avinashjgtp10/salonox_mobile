export const DEVICES = {
  LIST:            "/api/v1/devices",
  ADD:             "/api/v1/devices",
  PENDING:         "/api/v1/devices/pending",
  BY_ID:           (id: string)              => `/api/v1/devices/${id}`,
  CONNECT_PENDING: (sn: string)              => `/api/v1/devices/pending/${encodeURIComponent(sn)}/connect`,
  MAPPINGS:        (id: string)              => `/api/v1/devices/${id}/mappings`,
  MAPPING:         (id: string, mid: string) => `/api/v1/devices/${id}/mappings/${mid}`,
} as const;
