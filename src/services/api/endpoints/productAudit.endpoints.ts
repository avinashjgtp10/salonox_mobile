const root = "/inventory/product-audits";
const detail = (id: string) => `${root}/${encodeURIComponent(id)}`;
export const PRODUCT_AUDIT = {
  LIST: root,
  CREATE: root,
  DETAIL: detail,
  DELETE: detail,
  ITEMS: (id: string) => `${detail(id)}/items`,
  ITEM: (id: string, itemId: string) =>
    `${detail(id)}/items/${encodeURIComponent(itemId)}`,
  SUBMIT: (id: string) => `${detail(id)}/submit`,
  APPROVE: (id: string) => `${detail(id)}/approve`,
  REJECT: (id: string) => `${detail(id)}/reject`,
  REOPEN: (id: string) => `${detail(id)}/reopen`,
  RECOGNIZE: (id: string) => `${detail(id)}/recognize`,
  BRANCHES: (salonId: string) =>
    `/branches/by-salon/${encodeURIComponent(salonId)}`,
} as const;
