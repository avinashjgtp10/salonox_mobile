import * as XLSX from "xlsx";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import type { ProductAuditListRow, ProductAuditStatus } from "../../../types/inventory.types";

// Excel export for the Product Audit page — same columns as what's on
// screen (Audit, Notes, Auditor, Products, Differences, Status, Last
// Updated), so the export always matches the visible list.

const STATUS_LABELS: Record<ProductAuditStatus, string> = {
  in_progress: "In Progress",
  pending_review: "Pending Review",
  complete: "Complete",
  rejected: "Rejected",
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = d.getHours();
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
};

const fileStamp = () => formatDateDDMMYYYY(new Date());

export const exportProductAuditsExcel = (rows: ProductAuditListRow[]) => {
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r, i) => ({
      "#": i + 1,
      Audit: r.name ?? "",
      Notes: r.notes ?? "",
      Auditor: r.auditor_name ?? "",
      Products: Number(r.item_count) || 0,
      Differences: Number(r.diff_count) || 0,
      Status: STATUS_LABELS[r.status] ?? r.status,
      Reviewer: r.reviewer_name ?? "",
      "Rejection Reason": r.rejection_reason ?? "",
      Created: fmtDateTime(r.created_at),
      "Last Updated": fmtDateTime(r.updated_at),
    })),
  );
  sheet["!cols"] = [
    { wch: 5 }, { wch: 26 }, { wch: 24 }, { wch: 18 }, { wch: 10 },
    { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 26 }, { wch: 18 }, { wch: 18 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Product Audits");
  XLSX.writeFile(book, `product-audits-${fileStamp()}.xlsx`);
};
