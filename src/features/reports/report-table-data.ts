import { formatReportValue, humanizeReportKey, type ReportRow } from "./report-data";
import { maskPhone } from "@/utils/maskPhone";
export type ReportColumn = { key: string; label: string };

export function reportColumns(rows: ReportRow[], preferred: readonly ReportColumn[], fields: string[]): ReportColumn[] {
  const keys = [...new Set(rows.flatMap(Object.keys))].filter((key) => !/^id$|^raw$|^isUnbilled$/i.test(key) && !/(Id|Ids)$/.test(key) && (rows.every((row) => row[key] == null) || rows.some((row) => row[key] != null && (typeof row[key] !== "object" || (Array.isArray(row[key]) && (row[key] as unknown[]).every((value) => typeof value !== "object"))))));
  const columns = [...preferred, ...fields.map((key) => ({ key, label: humanizeReportKey(key) })), ...keys.map((key) => ({ key, label: humanizeReportKey(key) }))];
  return columns.filter((column, index) => keys.includes(column.key) && columns.findIndex((item) => item.key === column.key) === index);
}

export const reportCellValue = (key: string, value: unknown) => /phone|mobile|contact(?!person)/i.test(key)
  ? value ? maskPhone(String(value)) : "—" : formatReportValue(key, value);

