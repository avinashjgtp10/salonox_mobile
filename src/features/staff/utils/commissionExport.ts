import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

interface CommissionExportRow {
  staff_name?: string;
  category?: string;
  revenue_amount?: number | string;
  commission_kind?: string;
  commission_rate?: number | string;
  commission_amount?: number | string;
  status?: string;
  earned_date?: string;
}

const d = (v: unknown) => (v == null || v === "" ? "—" : String(v));

const COLS: { header: string; fn: (r: CommissionExportRow) => string }[] = [
  { header: "Staff Name",         fn: (r) => d(r.staff_name) },
  { header: "Category",           fn: (r) => d(r.category) },
  { header: "Revenue Amount",     fn: (r) => d(r.revenue_amount) },
  { header: "Commission Kind",    fn: (r) => d(r.commission_kind) },
  { header: "Commission Rate",    fn: (r) => d(r.commission_rate) },
  { header: "Commission Amount",  fn: (r) => d(r.commission_amount) },
  { header: "Status",             fn: (r) => d(r.status) },
  { header: "Earned Date",        fn: (r) => d(r.earned_date) },
];

export const exportCommissionsPDF = (rows: CommissionExportRow[], month?: string): Blob => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Commission Report", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const now = new Date();
  const generatedAt = `${formatDateDDMMYYYY(now)} ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  doc.text(`${month ? `Month: ${month}  ·  ` : ""}Generated: ${generatedAt}`, 14, 25);

  autoTable(doc, {
    head: [COLS.map((c) => c.header)],
    body: rows.map((r) => COLS.map((c) => c.fn(r))),
    startY: 30,
    styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak", textColor: [30, 30, 30] },
    headStyles: {
      fillColor: [237, 233, 254],
      textColor: [55, 48, 163],
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [196, 181, 253],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    bodyStyles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
  });

  return doc.output("blob");
};
