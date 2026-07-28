import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportableStaff {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  phone?: string;
  job_title?: string;
  permission_level?: string;
  is_active?: boolean;
}

const PERMISSION_LABELS: Record<string, string> = {
  no_access: "No Access",
  basic:     "Basic",
  low:       "Low",
  medium:    "Medium",
  high:      "High",
  manager:   "Manager",
};

const d = (v: unknown) => (v == null || v === "" ? "—" : String(v));

const COLS: { header: string; fn: (s: ExportableStaff) => string }[] = [
  { header: "Name",   fn: (s) => d(`${s.first_name || ""} ${s.last_name || ""}`.trim()) },
  { header: "Email",  fn: (s) => d(s.email) },
  { header: "Phone",  fn: (s) => d(s.phone_number || s.phone) },
  { header: "Role",   fn: (s) => d(s.job_title || PERMISSION_LABELS[s.permission_level || ""] || "Staff") },
  { header: "Status", fn: (s) => (s.is_active === false ? "Inactive" : "Active") },
];

export const exportStaffPDF = (staff: ExportableStaff[]): Blob => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Staff Members", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const now = new Date();
  const generatedAt = `${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  doc.text(`Generated: ${generatedAt}`, 14, 25);

  autoTable(doc, {
    head: [COLS.map((c) => c.header)],
    body: staff.map((s) => COLS.map((c) => c.fn(s))),
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
