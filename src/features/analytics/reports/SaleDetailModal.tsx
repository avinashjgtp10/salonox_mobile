import { useState, useEffect } from "react";
import { X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SALES_REPORT } from "../../../services/api/endpoints";
import { Loader } from "../../../components/ui";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatPaymentMode } from "../../../utils/paymentMode";
import "./SaleDetailModal.scss";

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Single-sale drill-down, shared by any report that needs to show a sale's
// full per-item breakdown (each item carries its own `staff_name`, so this
// is also how a multi-staff sale — one staff on the service, another on a
// retail product — becomes visible instead of collapsing to a single name).
// Fetches GET /api/report/sales-summary/:saleId directly (never the
// Appointment API), since walk-in sales have no appointment to look up.
export default function SaleDetailModal({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { formatAmount: money } = useCurrency();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    api.get(SALES_REPORT.DETAIL(saleId))
      .then(r => { if (alive) setData(r.data?.data ?? null); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [saleId]);

  return (
    <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="modal-box sd-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sale {data?.sale?.invoice_number ?? saleId}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {loading ? (
          <Loader message="Loading sale details..." />
        ) : error || !data?.sale ? (
          <div className="sd-error">Could not load this sale.</div>
        ) : (
          <>
            <div className="sd-header-row">
              <div>
                <div className="sd-label">Client</div>
                <div className="sd-value">{data.sale.client_name ?? "Walk-in"}</div>
                <div className="sd-sub">{data.sale.client_phone ?? "—"}</div>
              </div>
              <div>
                <div className="sd-label">Staff</div>
                <div className="sd-value">{data.sale.staff_name ?? "—"}</div>
              </div>
              <div>
                <div className="sd-label">Date</div>
                <div className="sd-value">{data.sale.created_at ? formatDate(data.sale.created_at) : "—"}</div>
              </div>
              <div>
                <div className="sd-label">Status</div>
                <span className={`rp-status-badge rp-status-${data.sale.status}`}>{data.sale.status}</span>
              </div>
            </div>

            <table className="sd-items-table">
              <thead>
                <tr>
                  <th>Item</th><th>Type</th><th>Qty</th><th>Unit Price</th>
                  <th>Discount</th><th>Total</th><th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {(!data.items || data.items.length === 0) ? (
                  <tr><td colSpan={7} className="sd-empty-cell">No line items</td></tr>
                ) : data.items.map((it: any) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td>{it.item_type}</td>
                    <td>{it.quantity}</td>
                    <td>{money(it.unit_price)}</td>
                    <td>{money(it.discount_amount)}</td>
                    <td>{money(it.total_price)}</td>
                    <td>{it.staff_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="sd-totals">
              <div className="sd-row"><span>Subtotal</span><span>{money(data.sale.subtotal)}</span></div>
              <div className="sd-row"><span>Discount</span><span>{money(data.sale.discount_amount)}</span></div>
              <div className="sd-row"><span>Tax</span><span>{money(data.sale.tax_amount)}</span></div>
              <div className="sd-row"><span>Tip</span><span>{money(data.sale.tip_amount)}</span></div>
              <div className="sd-row sd-row--total"><span>Total</span><span>{money(data.sale.total_amount)}</span></div>
            </div>

            <div className="sd-payment">
              <div className="sd-label">Payment Breakdown</div>
              <div className="sd-row"><span>Payment Mode</span><span>{formatPaymentMode(data.sale.payment_method, data.sale.payment_reference)}</span></div>
              {data.payment == null ? (
                <div className="sd-no-payment">
                  No linked payment record — this sale has no linked appointment,
                  so wallet/reward/referral amounts can't be attributed to it.
                </div>
              ) : (
                <>
                  <div className="sd-row"><span>Paid</span><span>{money(data.payment.paid_amount)}</span></div>
                  <div className="sd-row"><span>Due</span><span>{money(data.payment.due_amount)}</span></div>
                  <div className="sd-row"><span>E-Wallet</span><span>{money(data.payment.ewallet_used)}</span></div>
                  <div className="sd-row"><span>Membership</span><span>{money(data.payment.membership_wallet_used)}</span></div>
                  <div className="sd-row"><span>Rewards</span><span>{money(data.payment.reward_points_value)}</span></div>
                  <div className="sd-row"><span>Referral</span><span>{money(data.payment.referral_credit_used)}</span></div>
                </>
              )}
            </div>

            {data.sale.notes && (
              <div className="sd-notes">
                <div className="sd-label">Notes</div>
                <div className="sd-value">{data.sale.notes}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
