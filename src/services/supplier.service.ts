import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type ProductSupplierOption = { id: string; name: string; is_active: boolean };

export const supplierService = {
  async list(): Promise<ProductSupplierOption[]> {
    const { data } = await api.get<ApiResponse<ProductSupplierOption[]>>("/inventory/suppliers");
    return (data.data ?? []).filter((supplier) => supplier.is_active !== false);
  },
  async create(name: string): Promise<ProductSupplierOption> {
    const { data } = await api.post<ApiResponse<ProductSupplierOption>>("/inventory/suppliers", { name: name.trim() });
    if (!data.data?.id) throw new Error("Supplier response did not include an id.");
    return data.data;
  },
};
