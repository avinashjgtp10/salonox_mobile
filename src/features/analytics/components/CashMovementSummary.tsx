import Card from "../../../components/ui/Card";
import Table from "../../../components/ui/Table";
import type { Sale } from "../../../types/sale.types";
import { format } from "date-fns";

interface Props {
  sales: Sale[];
  isLoading: boolean;
  selectedDate: Date;
}

const fmt = (n: number) => `₹${n.toFixed(2)}`;

const METHOD_LABEL: Record<string, string> = {
  cash:      "Cash",
  card:      "Card",
  upi:       "UPI",
  gift_card: "Gift card redemptions",
  split:     "Split payment",
};

export default function CashMovementSummary({ sales, isLoading, selectedDate }: Props) {
  // ── Only count non-draft, non-cancelled sales for collected amounts ─────────
  const active   = sales.filter((s) => s.status === "completed");
  const refunded = sales.filter((s) => s.status === "refunded");

  // ── Group collected amounts by payment method ─────────────────────────────
  const collected: Record<string, number> = {};
  const tips:      Record<string, number> = {};

  for (const s of active) {
    const method = s.payment_method ?? "other";
    collected[method] = (collected[method] ?? 0) + parseFloat(s.total_amount || "0");
    tips[method]      = (tips[method]      ?? 0) + parseFloat((s as any).tip_amount || "0");
  }

  // ── Refunded amounts by method ─────────────────────────────────────────────
  const refunds: Record<string, number> = {};
  for (const s of refunded) {
    const method = s.payment_method ?? "other";
    refunds[method] = (refunds[method] ?? 0) + parseFloat(s.total_amount || "0");
  }

  // ── Build rows for all known methods that appear in the data ──────────────
  const allMethods = Array.from(
    new Set([...Object.keys(collected), ...Object.keys(refunds)])
  );

  const methodRows = allMethods.map((method, idx) => ({
    id:        idx,
    type:      METHOD_LABEL[method] ?? method,
    collected: fmt(collected[method] ?? 0),
    refunded:  fmt(refunds[method]   ?? 0),
  }));

  // If no data yet, show placeholder rows
  const placeholderRows = ["Cash", "Card", "UPI", "Gift card redemptions"].map((label, idx) => ({
    id: idx,
    type: label,
    collected: "₹0.00",
    refunded:  "₹0.00",
  }));

  const totalCollected = Object.values(collected).reduce((a, b) => a + b, 0);
  const totalRefunded  = Object.values(refunds).reduce((a, b) => a + b, 0);
  const totalTips      = Object.values(tips).reduce((a, b) => a + b, 0);

  const displayRows = methodRows.length > 0 ? methodRows : placeholderRows;

  const data = [
    ...displayRows,
    {
      id: "total",
      type: "Payments collected",
      collected: fmt(totalCollected),
      refunded:  fmt(totalRefunded),
      isTotal: true,
    },
    {
      id: "tips",
      type: "Of which tips",
      collected: fmt(totalTips),
      refunded:  "—",
      isTips: true,
    },
  ];

  const columns = [
    { header: "Payment type",        key: "type"      },
    { header: "Payments collected",  key: "collected"  },
    { header: "Refunds paid",        key: "refunded", className: "text-end" },
  ];

  if (isLoading) {
    return (
      <Card title="Cash movement summary" noPadding className="mb-4">
        <div className="d-flex align-items-center justify-content-center py-5">
          <div className="spinner-border spinner-border-sm text-muted me-2" role="status" />
          <span className="text-muted small">Loading…</span>
        </div>
      </Card>
    );
  }

  return (
    <Card title={`Cash movement — ${format(selectedDate, "d MMM yyyy")}`} noPadding className="mb-4">
      <Table
        columns={columns}
        data={data}
        rowClassName={(item: any) =>
          item.isTotal ? "fw-bold bg-light" : item.isTips ? "text-muted fst-italic" : ""
        }
      />
    </Card>
  );
}
