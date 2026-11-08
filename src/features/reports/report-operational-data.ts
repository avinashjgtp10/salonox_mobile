import { api } from "@/services/api";
import type { ReportConfig } from "./report-config";
import type { GenericReportRequest, GenericReportResponse } from "@/services/report.service";

type Row = Record<string, unknown>;
const record = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(record) : [];
const camel = (row: Row): Row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value]));
const number = (value: unknown) => Number(value) || 0;
const selected = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
const matches = (value: unknown, selection: unknown) => !selected(selection).length || selected(selection).includes(String(value));

/** Read-only adapters for web reports backed by existing operational APIs. */
export async function getOperationalReport(source: NonNullable<ReportConfig["source"]>, request: GenericReportRequest): Promise<GenericReportResponse> {
  let all: Row[] = [];
  let stats: Row = {};
  let filtersAvailable: Row = {};
  const params: Row = Object.fromEntries(Object.entries({ start_date: request.start_date, end_date: request.end_date }).filter(([, value]) => value));

  if (source === "commissions" || source === "tips") {
    const staffIds = selected(request.staff_ids);
    if (staffIds.length) params.staff_ids = staffIds.join(",");
    if (request.category) params.category = request.category;
    const base = source === "commissions" ? "/staff/commissions" : "/staff/tips";
    const [earned, summary] = await Promise.all([
      api.get(`${base}/earned`, { params: { ...params, ...(request.status ? { status: request.status } : {}) } }),
      api.get(`${base}/summary`, { params }),
    ]);
    all = rows(earned.data.data).map((raw) => ({
      ...camel(raw), staffName: [raw.staff_first_name, raw.staff_last_name].filter(Boolean).join(" ") || "—",
      items: raw.categories ?? [], transactions: number(raw.transaction_count),
      revenue: number(raw.total_revenue), earned: number(source === "commissions" ? raw.total_earned : raw.total_tips),
      pending: number(raw.pending_payout), paid: number(raw.paid_out),
    }));
    stats = camel(record(summary.data.data));
  } else if (source === "attendance") {
    const response = await api.get("/attendance/range", { params });
    const data = record(response.data.data);
    filtersAvailable.staff = rows(data.staff).map((staff) => ({ id: String(staff.id), label: staff.full_name }));
    all = rows(data.records).map<Row>((raw) => ({ ...camel(raw), date: raw.date ?? raw.attendance_date, breakSeconds: number(raw.total_break_seconds) }))
      .filter((row) => matches(row.staffId, request.staff_ids) && matches(row.status, request.statuses));
    stats = { totalRecords: all.length, present: all.filter((row) => row.status === "present").length, absent: all.filter((row) => row.status === "absent").length };
  } else if (source === "suppliers") {
    const response = await api.get("/inventory/suppliers");
    all = rows(response.data.data).map((raw) => ({ ...camel(raw), name: raw.name, contactPerson: [raw.first_name, raw.last_name].filter(Boolean).join(" ") || "—", phone: raw.mobile_number || raw.telephone_number || "—" }));
    filtersAvailable = {
      cities: [...new Set(all.map((row) => row.city).filter(Boolean))],
      countries: [...new Set(all.map((row) => row.country).filter(Boolean))],
    };
    all = all.filter((row) => matches(row.city, request.city) && matches(row.country, request.country));
    stats = { totalSuppliers: all.length };
  } else if (source === "purchases") {
    const page = Math.max(1, Number(request.page) || 1);
    const limit = Math.max(1, Number(request.limit) || 10);
    const response = await api.get("/inventory/product-inventory/purchases", { params: { page, limit, search: request.search || undefined, supplier_id: request.supplier_id || undefined } });
    const data = record(response.data.data);
    const total = number(data.total);
    return { rows: rows(data.data).map(camel), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, stats: { totalPurchases: total } };
  }

  const search = String(request.search ?? "").trim().toLowerCase();
  if (search) all = all.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search)));
  return { rows: all, stats, filtersAvailable, pagination: { page: 1, limit: all.length || 10, total: all.length, totalPages: 1 } };
}
