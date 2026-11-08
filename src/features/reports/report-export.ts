import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { reportService } from "@/services/report.service";
import { normalizeReportRequest } from "./report-request";
import type { ReportConfig, ReportFilters } from "./report-config";
import type { ReportRow } from "./report-data";
import { getOperationalReport } from "./report-operational-data";
import { reportCellValue, type ReportColumn } from "./report-table-data";

const asRows = (value: unknown): ReportRow[] => Array.isArray(value) ? value.filter((row): row is ReportRow => row !== null && typeof row === "object") : [];

export function reportCsv(columns: ReportColumn[], rows: ReportRow[]): string {
  const escape = (value: string) => '"' + (/^[=+@\t\r-]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
  return "\uFEFF" + [columns.map((column) => column.label), ...rows.map((row) => columns.map((column) => reportCellValue(column.key, row[column.key])))].map((row) => row.map(escape).join(",")).join("\r\n");
}

export async function loadCompleteReport(config: ReportConfig, filters: ReportFilters, loadedRows: ReportRow[]): Promise<ReportRow[]> {
  let all = loadedRows;
  if (config.source !== "consumables") {
    const request = { ...normalizeReportRequest(config.slug, filters), page: 1, limit: 100, is_export: true };
    const read = async (page: number) => config.source
      ? getOperationalReport(config.source, { ...request, page })
      : reportService.getReport(config.endpoint as `/api/report/${string}`, { ...request, page });
    const first = await read(1);
    all = asRows(first.rows);
    const pagination = first.pagination as { total?: number; totalPages?: number } | undefined;
    if (all.length < (pagination?.total ?? all.length)) {
      for (let page = 2; page <= (pagination?.totalPages ?? 1); page += 1) {
        const next = asRows((await read(page)).rows);
        if (!next.length) throw new Error("The complete report could not be exported.");
        all.push(...next);
      }
    }
    if (pagination?.total !== undefined && all.length < pagination.total) throw new Error("The complete report could not be loaded.");
  }
  return all;
}

export async function exportReportCsv(config: ReportConfig, filters: ReportFilters, columns: ReportColumn[], loadedRows: ReportRow[]) {
  const all = await loadCompleteReport(config, filters, loadedRows);
  if (!FileSystem.cacheDirectory) throw new Error("Export storage is unavailable.");
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is unavailable.");
  const uri = `${FileSystem.cacheDirectory}SalonOX-${config.slug}-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(uri, reportCsv(columns, all), { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text", dialogTitle: config.title });
}
