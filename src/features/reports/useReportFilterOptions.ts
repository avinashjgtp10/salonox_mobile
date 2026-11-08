import { useEffect, useMemo, useRef, useState } from "react";
import type { FilterOption } from "@/components/ui/FilterSheet";
import { serviceService } from "@/services/service.service";
import { staffService } from "@/services/staff.service";
import { productService } from "@/services/product.service";
import { api, getApiErrorMessage } from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { clientService } from "@/services/client.service";
import { packageService } from "@/services/package.service";
import { membershipService } from "@/services/membership.service";
import { REPORT_FILTER_FIELDS } from "./report-filters";
import type { ReportSlug } from "./report-config";

export type ReportOption = FilterOption & { categoryId?: string | null };
export function toReportOptions(value: unknown): ReportOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [{ id: item, label: item }];
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = row.id ?? row.value ?? row.name;
    const label = row.label ?? row.name ?? row.fullName;
    return id != null && typeof label === "string" ? [{ id: String(id), label, categoryId: typeof row.categoryId === "string" ? row.categoryId : null }] : [];
  });
}

export function useReportFilterOptions(slug: ReportSlug, data: Record<string, unknown> | null | undefined, visible: boolean) {
  const salonId = useAppSelector(selectActiveBranchId);
  const [loaded, setLoaded] = useState<Record<string, ReportOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const cache = useRef<{ scope: string; options: Record<string, ReportOption[]> }>({ scope: "", options: {} });
  const available = useMemo(() => {
    const raw = data?.filtersAvailable;
    if (!raw || typeof raw !== "object") return {} as Record<string, ReportOption[]>;
    const result = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, toReportOptions(value)]));
    if (!result.categories && result.serviceCategories) result.categories = result.serviceCategories;
    if (!result.categories && result.productCategories) result.categories = result.productCategories;
    if (!result.sources && result.clientSources) result.sources = result.clientSources;
    if (!result.paymentModes && result.paymentMethods) result.paymentModes = result.paymentMethods;
    return result;
  }, [data?.filtersAvailable]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const scope = `${salonId ?? ""}:${slug}`;
    if (cache.current.scope !== scope) cache.current = { scope, options: {} };
    const cached = cache.current.options;
    setLoaded(cached); setLoading(true); setError(null);
    const sources = new Set((REPORT_FILTER_FIELDS[slug] ?? []).map((field) => field.source));
    const needs = (key: string) => sources.has(key) && !cached[key] && !available[key]?.length;
    const tasks: [string, () => Promise<ReportOption[]>][] = [];
    if (needs("staff")) tasks.push(["staff", async () => {
      const all: ReportOption[] = [];
      let page = 1;
      while (true) {
        if (cancelled) return all;
        const result = await staffService.getStaff({ page, limit: 100 }, salonId);
        all.push(...result.staffMembers.map((row) => ({ id: row.id, label: row.name })));
        if (!result.pagination.hasMore) break;
        if (result.pagination.nextPage <= page || !result.staffMembers.length) throw new Error("Unable to load all staff");
        page = result.pagination.nextPage;
      }
      return all;
    }]);
    if (needs("categories")) tasks.push(["categories", async () => serviceService.getCategories(["product-retail", "product-margin", "product-inventory", "stock-movement", "slow-moving-products", "fast-moving-products", "purchase-vs-sales", "consumable-usage"].includes(slug) ? "product" : "service", salonId).then((rows) => rows.map((row) => ({ id: row.id, label: row.name })))]);
    if (needs("brands")) tasks.push(["brands", async () => productService.fetchBrands(salonId).then((rows) => rows.map((row) => ({ id: row.id, label: row.name })))]);
    if (needs("services")) tasks.push(["services", async () => {
      const all: ReportOption[] = [];
      let offset = 0;
      while (true) {
        if (cancelled) return all;
        const result = await serviceService.getServices({ offset, limit: 100, search: "", sort_by: "created_at", sort_order: "desc" }, salonId);
        all.push(...result.services.map((row) => ({ id: row.id, label: row.name, categoryId: row.categoryId })));
        if (!result.pagination.hasMore) break;
        if (result.pagination.nextOffset <= offset || !result.services.length) throw new Error("Unable to load all services");
        offset = result.pagination.nextOffset;
      }
      return all;
    }]);
    if (needs("products")) tasks.push(["products", async () => {
      const all: ReportOption[] = [];
      let offset = 0;
      while (!cancelled) {
        const result = await productService.fetchProducts({ offset, limit: 100, search: "", sort_by: "name", sort_order: "asc" }, salonId);
        all.push(...result.products.map((row) => ({ id: row.id, label: row.name })));
        if (!result.pagination.hasMore) break;
        if (result.pagination.nextOffset <= offset || !result.products.length) throw new Error("Unable to load all products");
        offset = result.pagination.nextOffset;
      }
      return all;
    }]);
    if (needs("clients")) tasks.push(["clients", async () => {
      const all: ReportOption[] = [];
      let offset = 0;
      while (!cancelled) {
        const result = await clientService.getClients({ offset, limit: 100, search: "", sort_by: "created_at", sort_order: "desc" }, salonId);
        all.push(...result.clients.map((row) => ({ id: row.id, label: row.fullName })));
        if (!result.pagination.hasMore) break;
        if (result.pagination.nextOffset <= offset || !result.clients.length) throw new Error("Unable to load all clients");
        offset = result.pagination.nextOffset;
      }
      return all;
    }]);
    if (needs("packages")) tasks.push(["packages", async () => packageService.getAllActiveCatalogPackages({}, salonId).then((items) => items.map((item) => ({ id: item.id, label: item.name })))]);
    if (needs("memberships")) tasks.push(["memberships", async () => {
      const all: ReportOption[] = [];
      for (let page = 1; !cancelled; page += 1) {
        const result = await membershipService.getMemberships({ page, limit: 100 }, salonId);
        all.push(...result.items.map((item) => ({ id: item.id, label: item.name })));
        if (all.length >= result.total) break;
        if (!result.items.length) throw new Error("Unable to load all memberships");
      }
      return all;
    }]);
    if (needs("suppliers")) tasks.push(["suppliers", async () => {
      const result = await api.get("/inventory/suppliers");
      return toReportOptions(result.data.data);
    }]);
    void Promise.allSettled(tasks.map(async ([key, load]) => [key, await load()] as const)).then((results) => {
      if (cancelled) return;
      const next: Record<string, ReportOption[]> = { ...cached };
      const failures: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") next[result.value[0]] = result.value[1];
        else failures.push(`${tasks[index][0]}: ${getApiErrorMessage(result.reason)}`);
      });
      cache.current = { scope, options: next };
      setLoaded(next);
      if (failures.length) setError(`Unable to load ${failures.join("; ")}`);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug, salonId, visible, retry, available]);
  return { options: { ...available, ...loaded }, loading, error, retry: () => setRetry((value) => value + 1) };
}
