export const SALES = {
  CHECKOUT: (saleId: string) => `/sales/${saleId}/checkout`,
  CREATE: "/sales",
  DELETE: (saleId: string) => `/sales/${saleId}`,
  DETAIL: (saleId: string) => `/sales/${saleId}`,
  EXPORT: "/sales/export",
  EXPORT_CSV: "/sales/export/csv",
  EXPORT_EXCEL: "/sales/export/excel",
  EXPORT_PDF: "/sales/export/pdf",
  INIT: "/sales/init",
  LIST: "/sales",
  SUMMARY: "/sales/summary",
  UPDATE: (saleId: string) => `/sales/${saleId}`,
} as const;
