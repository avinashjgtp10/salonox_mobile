import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { salonCommissionsService, type CommissionExportRow } from "@/services/salonCommissions.service";
import { formatAppDate } from "@/utils/dateTime";

export type CommissionExportFormat = "csv" | "excel" | "pdf";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const money = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const formatExportMonth = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  return formatAppDate(new Date(year, monthIndex - 1, 1));
};

// The web builds its PDF client-side from the same JSON rows; this does the same with expo-print.
const buildPdfHtml = (month: string, rows: CommissionExportRow[]) => {
  const total = rows.reduce((sum, row) => sum + row.commissionAmount, 0);
  const body = rows.length
    ? rows.map((row) => `<tr>
        <td>${escapeHtml(row.staffName)}</td><td>${escapeHtml(row.category)}</td>
        <td class="num">${money(row.revenueAmount)}</td>
        <td>${row.commissionKind === "fixed" ? "Fixed" : `${row.commissionRate}%`}</td>
        <td class="num">${money(row.commissionAmount)}</td>
        <td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.earnedDate)}</td>
      </tr>`).join("")
    : `<tr><td colspan="7" class="empty">No commissions in this month.</td></tr>`;

  return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, Roboto, sans-serif; color: #1f1a1f; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 4px; } p { color: #6b6470; margin: 0 0 16px; }
      table { border-collapse: collapse; width: 100%; font-size: 11px; }
      th, td { border-bottom: 1px solid #e6e0e6; padding: 6px 4px; text-align: left; }
      th { background: #f5eff3; } .num { text-align: right; } .empty { text-align: center; color: #6b6470; }
    </style></head><body>
    <h1>Commissions — ${escapeHtml(formatExportMonth(month))}</h1>
    <p>${rows.length} record${rows.length === 1 ? "" : "s"} · Total commission Rs. ${money(total)}</p>
    <table><thead><tr><th>Staff</th><th>Category</th><th class="num">Revenue</th><th>Rate</th>
      <th class="num">Commission</th><th>Status</th><th>Earned</th></tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
};

/** Exports one month (YYYY-MM) of salon commissions and opens the share sheet. */
export async function shareCommissionExport(month: string, format: CommissionExportFormat) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is unavailable on this device. Please export from the web app.");
  }

  if (format === "pdf") {
    const rows = await salonCommissionsService.exportRows(month);
    const { uri } = await Print.printToFileAsync({ html: buildPdfHtml(month, rows) });
    await Sharing.shareAsync(uri, { dialogTitle: "Export commissions", mimeType: "application/pdf", UTI: "com.adobe.pdf" });
    return;
  }

  if (format === "excel") {
    const data = await salonCommissionsService.exportExcel(month);
    const file = new File(Paths.cache, `commissions_${month}.xlsx`);
    file.create({ overwrite: true });
    file.write(new Uint8Array(data));
    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Export commissions",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
    return;
  }

  const csv = await salonCommissionsService.exportCsv(month);
  const file = new File(Paths.cache, `commissions_${month}.csv`);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    dialogTitle: "Export commissions",
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
  });
}
