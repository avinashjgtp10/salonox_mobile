import type { Sale } from "../../../types/sale.types";
import { format } from "date-fns";

interface Props {
  sales: Sale[];
  isLoading: boolean;
  selectedDate: Date;
}

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TransactionSummary({ sales, isLoading, selectedDate }: Props) {
  const completed = sales.filter((s) => s.status === "completed");
  const refunded  = sales.filter((s) => s.status === "refunded");

  const sum = (arr: Sale[], key: keyof Sale) =>
    arr.reduce((acc, s) => acc + parseFloat((s[key] as string) || "0"), 0);

  const subtotal    = sum(completed, "subtotal");
  const discounts   = sum(completed, "discount_amount");
  const tips        = sum(completed, "tip_amount");
  const taxes       = sum(completed, "tax_amount");
  const grossTotal  = sum(completed, "total_amount");
  const refundTotal = sum(refunded,  "total_amount");

  const completedQty = completed.length;
  const refundedQty  = refunded.length;

  type Row = {
    label: string;
    salesQty: number | string;
    refundQty: number | string;
    value: string;
    valueClass?: string;
    isTotal?: boolean;
  };

  const rows: Row[] = [
    {
      label: "Services",
      salesQty: completedQty,
      refundQty: refundedQty > 0 ? refundedQty : "—",
      value: fmt(subtotal),
    },
    {
      label: "Discounts",
      salesQty: "—",
      refundQty: "—",
      value: discounts > 0 ? `−${fmt(discounts)}` : `−${fmt(0)}`,
      valueClass: "dsp-tbl__red",
    },
    {
      label: "Tips",
      salesQty: "—",
      refundQty: "—",
      value: fmt(tips),
      valueClass: tips > 0 ? "dsp-tbl__green" : undefined,
    },
    {
      label: "Taxes",
      salesQty: "—",
      refundQty: "—",
      value: fmt(taxes),
    },
    {
      label: "Refund amount",
      salesQty: "—",
      refundQty: refundedQty > 0 ? refundedQty : "—",
      value: refundTotal > 0 ? `−${fmt(refundTotal)}` : fmt(0),
      valueClass: refundTotal > 0 ? "dsp-tbl__red" : undefined,
    },
  ];

  const netTotal = grossTotal - refundTotal;

  return (
    <div className="dsp-card">
      <div className="dsp-card__hd">
        <h4 className="dsp-card__title">Transaction summary</h4>
        <span className="dsp-card__badge">{format(selectedDate, "d MMM yyyy")}</span>
      </div>

      {isLoading ? (
        <div className="dsp-skeleton">
          {[...Array(5)].map((_, i) => <div key={i} className="dsp-skeleton__row" />)}
        </div>
      ) : (
        <table className="dsp-tbl">
          <thead>
            <tr>
              <th>Item type</th>
              <th className="r">Sales qty</th>
              <th className="r">Refund qty</th>
              <th className="r">Gross total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="r dsp-tbl__muted">{row.salesQty}</td>
                <td className="r dsp-tbl__muted">{row.refundQty}</td>
                <td className={`r${row.valueClass ? ` ${row.valueClass}` : ""}`}>{row.value}</td>
              </tr>
            ))}
            <tr className="dsp-tbl__row-total">
              <td>Total Sales</td>
              <td className="r">{completedQty}</td>
              <td className="r">{refundedQty > 0 ? refundedQty : "—"}</td>
              <td className={`r${netTotal < 0 ? " dsp-tbl__red" : " dsp-tbl__green"}`}>
                {fmt(netTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
