import { useState, useEffect } from "react";
import { X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SALES_REPORT } from "../../../services/api/endpoints";
import { Loader } from "../../../components/ui";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatPaymentMode } from "../../../utils/paymentMode";
import { computeBillBreakdown } from "../../../components/shared/billBreakdown";
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
// staffName, when passed, scopes the items table to just that staff member's
// line items — used by Staff Sales report, where each row is already one
// staff's contribution to the sale, not the whole invoice. Other callers
// that omit it still see every line item (their rows represent the whole
// sale, not one staff's slice of it).
export default function SaleDetailModal({ saleId, staffName, onClose }: { saleId: string; staffName?: string | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { formatAmount: money, currencySymbol } = useCurrency();

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
                <div className="sd-value">{staffName ?? data.sale.staff_name ?? "—"}</div>
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

            <div className="sd-items-table-wrap">
              <table className="sd-items-table">
                <thead>
                  <tr>
                    <th>Item</th><th>Type</th><th>Qty</th><th>Unit Price</th>
                    <th>Discount</th><th>Total</th><th>Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const items = staffName
                      ? (data.items ?? []).filter((it: any) => it.staff_name === staffName)
                      : (data.items ?? []);
                    return items.length === 0 ? (
                      <tr><td colSpan={7} className="sd-empty-cell">No line items</td></tr>
                    ) : items.map((it: any) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>{it.item_type}</td>
                      <td>{it.quantity}</td>
                      <td>{money(it.unit_price)}</td>
                      <td>{money(it.discount_amount)}</td>
                      <td>{money(it.total_price)}</td>
                      <td>{it.staff_name ?? "—"}</td>
                    </tr>
                  ));
                  })()}
                </tbody>
              </table>
            </div>

            <div className="sd-totals">
              {(() => {
                // Same waterfall + row list ViewBillModal uses (see
                // components/shared/billBreakdown.ts) — this used to just
                // show a single flat "Tax" figure with no per-tax-name
                // breakdown at all, computed independently of the Calendar
                // view's own inline math, which is exactly how the two could
                // (and did) disagree. Rows for figures already shown in the
                // Payment Breakdown section below (wallet/eWallet/reward
                // points) are still fed into the waterfall for a correct
                // Round Off, but filtered out of what renders here to avoid
                // showing the same figure twice.
                const hasGranularDiscount = data.sale.manual_discount_amount > 0
                  || data.sale.coupon_discount_amount > 0 || data.sale.referral_discount_amount > 0;
                const { rows } = computeBillBreakdown({
                  currencySymbol,
                  subtotal: data.sale.subtotal || 0,
                  couponDiscount: data.sale.coupon_discount_amount || 0,
                  couponCode: data.sale.coupon_code,
                  taxBreakdown: data.payment?.tax_breakdown,
                  legacyGstAmount: data.sale.tax_amount || 0,
                  exCharges: data.sale.ex_charges || 0,
                  discountAmount: hasGranularDiscount ? (data.sale.manual_discount_amount || 0) : (data.sale.discount_amount || 0),
                  referralDiscount: data.sale.referral_discount_amount || 0,
                  membershipWalletUsed: data.payment?.membership_wallet_used || 0,
                  ewalletUsed: data.payment?.ewallet_used || 0,
                  rewardPointsValue: data.payment?.reward_points_value || 0,
                  grandTotal: data.sale.total_amount || 0,
                });
                const hiddenLabels = new Set(["Membership Wallet Used", "eWallet Used", "Reward Points Used"]);
                return rows
                  .filter(([label]) => !hiddenLabels.has(label))
                  .map(([label, value], i) => (
                    <div key={i} className="sd-row">
                      <span>{label}</span><span>{value}</span>
                    </div>
                  ));
              })()}
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
                  <div className="sd-row"><span>Referral Credit</span><span>{money(data.payment.referral_credit_used)}</span></div>
                </>
              )}
              {/* Display/record-only — never part of Total/Paid/Due above. */}
              {data.sale.tip_amount > 0 && (
                <div className="sd-row"><span>Staff Tip</span><span>{money(data.sale.tip_amount)}</span></div>
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
