import type { Sale } from "../../../types/sale.types";
import { format } from "date-fns";
import { formatCurrency } from "../../../utils/format";

interface Props {
  sales: Sale[];
  isLoading: boolean;
  selectedDate: Date;
}

const METHOD_CONFIG: Record<string, { label: string; color: string }> = {
  cash:          { label: "Cash",                  color: "#16a34a" },
  card:          { label: "Card",                  color: "#2563eb" },
  upi:           { label: "UPI",                   color: "#7c3aed" },
  gift_card:     { label: "Gift card redemptions", color: "#d97706" },
  split:         { label: "Split payment",         color: "#0891b2" },
  bank_transfer: { label: "Bank transfer",         color: "#0f766e" },
  wallet:        { label: "Wallet",                color: "#db2777" },
};

export default function CashMovementSummary({ sales, isLoading, selectedDate }: Props) {
  const active   = sales.filter((s) => s.status === "completed");
  const refunded = sales.filter((s) => s.status === "refunded");

  const collected: Record<string, number> = {};
  const tips:      Record<string, number> = {};

  for (const s of active) {
    const method = s.payment_method ?? "other";
    collected[method] = (collected[method] ?? 0) + parseFloat(s.total_amount || "0");
    tips[method]      = (tips[method]      ?? 0) + parseFloat(s.tip_amount || "0");
  }

  const refunds: Record<string, number> = {};
  for (const s of refunded) {
    const method = s.payment_method ?? "other";
    refunds[method] = (refunds[method] ?? 0) + parseFloat(s.total_amount || "0");
  }

  const allMethods = Array.from(
    new Set([...Object.keys(collected), ...Object.keys(refunds)])
  );

  const methodRows = allMethods.map((method) => ({
    method,
    label:     METHOD_CONFIG[method]?.label ?? method,
    color:     METHOD_CONFIG[method]?.color ?? "#94a3b8",
    collected: collected[method] ?? 0,
    refunded:  refunds[method]   ?? 0,
  }));

  const placeholderMethods = ["cash", "card", "upi", "gift_card"];
  const displayRows = methodRows.length > 0
    ? methodRows
    : placeholderMethods.map((m) => ({
        method: m,
        label:  METHOD_CONFIG[m].label,
        color:  METHOD_CONFIG[m].color,
        collected: 0,
        refunded:  0,
      }));

  const totalCollected = Object.values(collected).reduce((a, b) => a + b, 0);
  const totalRefunded  = Object.values(refunds).reduce((a, b) => a + b, 0);
  const totalTips      = Object.values(tips).reduce((a, b) => a + b, 0);

  return (
    <div className="dsp-card">
      <div className="dsp-card__hd">
        <h4 className="dsp-card__title">Cash movement</h4>
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
              <th>Payment type</th>
              <th className="r">Payments collected</th>
              <th className="r">Refunds paid</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.method}>
                <td>
                  <span className="dsp-method">
                    <span className="dsp-method__dot" style={{ background: row.color }} />
                    {row.label}
                  </span>
                </td>
                <td className={`r${row.collected > 0 ? " dsp-tbl__green" : " dsp-tbl__muted"}`}>
                  {formatCurrency(row.collected)}
                </td>
                <td className={`r${row.refunded > 0 ? " dsp-tbl__red" : " dsp-tbl__muted"}`}>
                  {formatCurrency(row.refunded)}
                </td>
              </tr>
            ))}

            <tr className="dsp-tbl__row-total">
              <td>Payments collected</td>
              <td className="r">{formatCurrency(totalCollected)}</td>
              <td className={`r${totalRefunded > 0 ? " dsp-tbl__red" : ""}`}>
                {formatCurrency(totalRefunded)}
              </td>
            </tr>

            <tr className="dsp-tbl__row-tips">
              <td>Of which tips</td>
              <td className="r">{formatCurrency(totalTips)}</td>
              <td className="r">—</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
