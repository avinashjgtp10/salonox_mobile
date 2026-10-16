import { api } from "@/services/api";
import { PRODUCT_AUDIT as E, STAFF } from "@/services/api/endpoints";
import { asRecord, toSafeNumber, toSafeString } from "@/utils/apiNormalize";
import type { ApiResponse } from "@/types/auth";
import type {
  AuditBranch,
  AuditCount,
  AuditFilters,
  AuditListRow,
  AuditPerson,
  ProductAudit,
  RecognitionResult,
} from "@/types/productAudit";

export const productAuditService = {
  // Same slim, paginated roster used by the web auditor/reviewer pickers.
  async people(signal?: AbortSignal): Promise<AuditPerson[]> {
    const people = new Map<string, AuditPerson>();
    for (let page = 1; ; page++) {
      const response = await api.get(STAFF.LIST, { params: { fields: "list", page, limit: 200 }, signal });
      const data = response.data.data;
      const record = asRecord(data);
      const rows = Array.isArray(record.items) ? record.items : Array.isArray(data) ? data : [];
      for (const value of rows) {
        const row = asRecord(value);
        const id = toSafeString(row.user_id);
        if (id) people.set(id, { id, name: [toSafeString(row.first_name), toSafeString(row.last_name)].filter(Boolean).join(" ") || "Unnamed staff" });
      }
      const total = toSafeNumber(asRecord(record.pagination).total);
      if (!rows.length || page * 200 >= total) break;
    }
    return [...people.values()];
  },
  async list(filters: AuditFilters) {
    return (
      await api.get<ApiResponse<{ data: AuditListRow[]; total: number }>>(
        E.LIST,
        { params: filters },
      )
    ).data.data;
  },
  async get(id: string) {
    return (await api.get<ApiResponse<ProductAudit>>(E.DETAIL(id))).data.data;
  },
  async create(body: {
    branch_id: string;
    name: string;
    notes?: string;
    auditor_id?: string;
  }) {
    return (await api.post<ApiResponse<ProductAudit>>(E.CREATE, body)).data
      .data;
  },
  async delete(id: string) {
    await api.delete(E.DELETE(id));
  },
  async addItems(id: string, productIds: string[]) {
    return (
      await api.post<ApiResponse<ProductAudit>>(E.ITEMS(id), {
        product_ids: productIds,
      })
    ).data.data;
  },
  async attachProduct(id: string, productId: string, physicalQty: number | null) {
    // A previous attempt may have attached the product before saving its count
    // failed. Check first so retry does not depend on duplicate-add behavior.
    let audit = await productAuditService.get(id);
    if (audit.status !== "in_progress")
      throw new Error("This audit is no longer editable. Reopen it before adding products.");
    let item = audit.items.find((row) => row.product_id === productId);
    if (!item) {
      audit = await productAuditService.addItems(id, [productId]);
      item = audit.items.find((row) => row.product_id === productId);
    }
    if (!item)
      throw new Error("Product was not returned in the audit. Retry adding it.");
    if (physicalQty !== null) {
      return productAuditService.updateItem(id, item.id, {
        physical_qty: physicalQty,
        reason: "Physical quantity entered when adding the product",
      });
    }
    return audit;
  },
  async removeItem(id: string, itemId: string) {
    return (await api.delete<ApiResponse<ProductAudit>>(E.ITEM(id, itemId)))
      .data.data;
  },
  async updateItem(
    id: string,
    itemId: string,
    body: Omit<AuditCount, "item_id">,
  ) {
    return (
      await api.patch<ApiResponse<ProductAudit>>(E.ITEM(id, itemId), body)
    ).data.data;
  },
  async submit(id: string, items?: AuditCount[]) {
    return (await api.post<ApiResponse<ProductAudit>>(E.SUBMIT(id), { items }))
      .data.data;
  },
  async approve(id: string, reviewerId?: string) {
    return (
      await api.post<ApiResponse<ProductAudit>>(E.APPROVE(id), {
        reviewer_id: reviewerId,
      })
    ).data.data;
  },
  async reject(id: string, reason: string, reviewerId?: string) {
    return (
      await api.post<ApiResponse<ProductAudit>>(E.REJECT(id), {
        reason,
        reviewer_id: reviewerId,
      })
    ).data.data;
  },
  async reopen(id: string) {
    return (await api.post<ApiResponse<ProductAudit>>(E.REOPEN(id))).data.data;
  },
  async branches(salonId: string) {
    return (
      await api.get<ApiResponse<AuditBranch[]>>(E.BRANCHES(salonId))
    ).data.data.filter((b) => b.is_active);
  },
  async recognize(
    id: string,
    body: {
      barcode?: string;
      query?: string;
      image?: { base64: string; mime_type: string };
    },
    signal?: AbortSignal,
  ) {
    return (
      await api.post<ApiResponse<RecognitionResult>>(E.RECOGNIZE(id), body, {
        timeout: 120000,
        signal,
      })
    ).data.data;
  },
};
