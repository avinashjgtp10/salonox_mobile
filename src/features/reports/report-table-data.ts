import { formatReportValue, humanizeReportKey, type ReportRow } from "./report-data";
import { maskPhone } from "@/utils/maskPhone";
import { applyTaxName, isBlankTaxValue, isTaxColumnKey, type TaxName } from "@/utils/taxLabels";
export type ReportColumn = { key: string; label: string };

// taxName renames the tax columns for the salon's country; the data keys
// themselves (gstAmount, totalGst) are untouched, only what the header reads.
export function reportColumns(rows: ReportRow[], preferred: readonly ReportColumn[], fields: string[], taxName: TaxName = "GST"): ReportColumn[] {
  const keys = [...new Set(rows.flatMap(Object.keys))].filter((key) => !/^id$|^raw$|^isUnbilled$/i.test(key) && !/(Id|Ids)$/.test(key) && (rows.every((row) => row[key] == null) || rows.some((row) => row[key] != null && (typeof row[key] !== "object" || (Array.isArray(row[key]) && (row[key] as unknown[]).every((value) => typeof value !== "object"))))));
  const columns = [...preferred, ...fields.map((key) => ({ key, label: humanizeReportKey(key) })), ...keys.map((key) => ({ key, label: humanizeReportKey(key) }))];
  // A salon that charges no tax — tax switched off, or a country where it
  // does not apply — gets zeros back for every tax field. A column of zeros
  // tells the owner nothing, so it is dropped rather than printed empty.
  const taxReported = (key: string) => rows.some((row) => !isBlankTaxValue(row[key]));

  return columns
    .filter((column, index) => keys.includes(column.key) && columns.findIndex((item) => item.key === column.key) === index)
    .filter((column) => !isTaxColumnKey(column.key) || taxReported(column.key))
    .map((column) => ({ ...column, label: applyTaxName(column.label, taxName) }));
}

export const reportCellValue = (key: string, value: unknown, multilineDate = false) => {
  if (key === "totalContacts") return formatReportValue(key, value);
  if (/phone|mobile|contact(?!person)/i.test(key)) return value ? maskPhone(String(value)) : "—";
  return formatReportValue(key, value, multilineDate);
};

