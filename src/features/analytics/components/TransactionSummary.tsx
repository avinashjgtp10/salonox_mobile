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

export default function TransactionSummary({ sales, isLoading, selectedDate }: Props) {
  // ── Completed sales only (for positive amounts) ───────────────────────────
  const completed = sales.filter((s) => s.status === "completed");
  const refunded  = sales.filter((s) => s.status === "refunded");

  // ── Helpers ───────────────────────────────────────────────────────────────
  const sum = (arr: Sale[], key: keyof Sale) =>
    arr.reduce((acc, s) => acc + parseFloat((s[key] as string) || "0"), 0);

  // Sale-level financial fields available in list response
  const subtotal   = sum(completed, "subtotal");
  const discounts  = sum(completed, "discount_amount");
  const tips       = sum(completed, "tip_amount");
  const taxes      = sum(completed, "tax_amount");
  const grossTotal = sum(completed, "total_amount");
  const refundTotal= sum(refunded,  "total_amount");

  const completedQty = completed.length;
  const refundedQty  = refunded.length;

  const columns = [
    { header: "Item type",   key: "type"      },
    { header: "Sales qty",   key: "salesQty"  },
    { header: "Refund qty",  key: "refundQty" },
    { header: "Gross total", key: "total", className: "text-end" },
  ];

  const data = [
    { id: 0,       type: "Services",               salesQty: completedQty, refundQty: refundedQty, total: fmt(subtotal)   },
    { id: 1,       type: "Discounts",               salesQty: "-",          refundQty: "-",         total: `-${fmt(discounts)}` },
    { id: 2,       type: "Tips",                    salesQty: "-",          refundQty: "-",         total: fmt(tips)       },
    { id: 3,       type: "Taxes",                   salesQty: "-",          refundQty: "-",         total: fmt(taxes)      },
    { id: 4,       type: "Refund amount",           salesQty: "-",          refundQty: refundedQty, total: fmt(refundTotal) },
    {
      id: "total",
      type: "Total Sales",
      salesQty: completedQty,
      refundQty: refundedQty,
      total: fmt(grossTotal - refundTotal),
      isTotal: true,
    },
  ];

  if (isLoading) {
    return (
      <Card title="Transaction summary" noPadding className="mb-4">
        <div className="d-flex align-items-center justify-content-center py-5">
          <div className="spinner-border spinner-border-sm text-muted me-2" role="status" />
          <span className="text-muted small">Loading…</span>
        </div>
      </Card>
    );
  }

  return (
    <Card title={`Transaction summary — ${format(selectedDate, "d MMM yyyy")}`} noPadding className="mb-4">
      <Table
        columns={columns}
        data={data}
        rowClassName={(item: any) => (item.isTotal ? "fw-bold bg-light" : "")}
      />
    </Card>
  );
}
