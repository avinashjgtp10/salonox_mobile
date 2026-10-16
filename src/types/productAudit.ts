export type AuditStatus =
  "in_progress" | "pending_review" | "complete" | "rejected";
export type AuditItem = {
  id: string;
  audit_id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  measure_unit: string | null;
  category: string | null;
  system_qty: number;
  physical_qty: number | null;
  reason: string | null;
};
export type AuditHistory = {
  id: string;
  actor_name: string | null;
  action: string;
  note: string | null;
  created_at: string;
};
export type ProductAudit = {
  id: string;
  salon_id: string;
  branch_id: string;
  name: string;
  notes: string | null;
  status: AuditStatus;
  auditor_id: string;
  auditor_name: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  items: AuditItem[];
  history: AuditHistory[];
};
export type AuditListRow = Omit<ProductAudit, "items" | "history"> & {
  item_count: number;
  diff_count: number;
};
export type AuditCount = {
  item_id: string;
  physical_qty: number | null;
  reason?: string | null;
};
export type AuditFilters = {
  branch_id?: string;
  status?: AuditStatus;
  search?: string;
  page?: number;
  limit?: number;
};
export type AuditBranch = {
  id: string;
  name: string;
  is_active: boolean;
  is_main: boolean;
};
export type AuditPerson = { id: string; name: string };
export type RecognizedProduct = {
  product_id: string | null;
  name: string;
  barcode: string | null;
  brand: string | null;
  variant: string | null;
  size: string | null;
  bottle_size: number | null;
  measure_unit: string | null;
  description: string | null;
  source: "salonox" | "catalog" | "vision";
  source_label: string;
  source_url: string | null;
  confidence: number | null;
};
export type RecognitionResult = {
  candidates: RecognizedProduct[];
  warnings: string[];
};
