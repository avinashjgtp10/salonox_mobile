import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { ChevronLeft, Search, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SALES_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, Loader } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import { useBulkAppointmentDelete } from "./useBulkAppointmentDelete";
import { BulkDeleteBar, BulkDeleteConfirmModal } from "./BulkDeleteBar";
import "./SalesSummaryReport.scss";

const REPORT_NAME = "Sales Summary";

interface SaleRow {
  id: string;
  appointmentId: string | null;
  invoiceNo: string;
  name: string;
  contact: string;
  itemDescription: string;
  itemTypes: string;
  actualPrice: number;
  price: number;
  paid: number;
  dueAmount: number;
  description: string;
  modes: string;
  status: string;
  date: string;
  tip: number;
  ewalletUsed: number;
  membershipWalletUsed: number;
  rewardPointsValue: number;
  referralCreditUsed: number;
}

// Maps a row from the independent Sales Summary API
// (POST /api/report/sales-summary — reads sales/sale_items/payments directly,
// never the Appointment API) to the table's existing SaleRow shape.
function mapAppointment(row: any): SaleRow {
  const paid = Number(row.paid_amount) || 0;
  const ewalletUsed          = Number(row.ewallet_used) || 0;
  const membershipWalletUsed = Number(row.membership_wallet_used) || 0;
  const rewardPointsValue    = Number(row.reward_points_value) || 0;
  const referralCreditUsed   = Number(row.referral_credit_used) || 0;

  const isPackagePayment = String(row.payment_method ?? "").toLowerCase() === "package";
  const paymentSources = [
    isPackagePayment           ? "Package"       : null,
    membershipWalletUsed > 0   ? "Membership"    : null,
    ewalletUsed > 0             ? "eWallet"        : null,
    rewardPointsValue > 0      ? "Reward Points"  : null,
  ].filter((s): s is string => s !== null);
  if (paymentSources.length === 0 && row.payment_method) paymentSources.push(String(row.payment_method));
  const description = paymentSources.length > 0 ? paymentSources.join(", ") : "—";

  return {
    id: String(row.id ?? ""),
    appointmentId: row.appointment_id ? String(row.appointment_id) : null,
    invoiceNo: row.invoice_number != null ? String(row.invoice_number) : String(row.id ?? "—"),
    name: row.client_name ?? "Walk-in",
    contact: row.client_phone ?? "—",
    itemDescription: row.item_description ?? "—",
    itemTypes: row.item_types ?? "—",
    actualPrice: Math.round(Number(row.actual_price) || 0),
    price: Math.round(Number(row.price) || 0),
    paid,
    dueAmount: Number(row.due_amount) || 0,
    description,
    modes: row.payment_method ?? "—",
    status: row.status ?? "booked",
    date: String(row.created_at ?? "").slice(0, 10),
    tip: Number(row.tip_amount) || 0,
    ewalletUsed,
    membershipWalletUsed,
    rewardPointsValue,
    referralCreditUsed,
  };
}

// Independent single-sale drill-down — fetches GET /api/report/sales-summary/:saleId
// directly (never the Appointment API), since walk-in sales have no appointment
// to look up via AppointmentDetailModal.
function SaleDetailModal({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const money = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

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
                <div className="sd-value">{String(data.sale.created_at).slice(0, 10)}</div>
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

export default function SalesSummaryReport({ onBack }: { onBack: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const today     = new Date().toISOString().slice(0, 10);
  const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [dateFrom,      setDateFrom]      = useState(weekAgo);
  const [dateTo,        setDateTo]        = useState(today);
  const [staffFilter,   setStaffFilter]   = useState("All");
  const [staffOptions,  setStaffOptions]  = useState<{ label: string; value: string }[]>([{ label: "All Staff", value: "All" }]);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [categoryFilter,  setCategoryFilter]  = useState("All");
  // Populated from filters_available.service_categories on every fetch — every
  // service category in the salon (not just ones with sales), same convention
  // as Daily Sheet's service/staff dropdowns.
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([{ label: "All Categories", value: "All" }]);
  const [showCategoryDrop, setShowCategoryDrop] = useState(false);
  const [search,        setSearch]        = useState("");
  const [rows,          setRows]          = useState<SaleRow[]>([]);
  const [stats,         setStats]         = useState({
    totalBill: 0, billAverage: 0, totalSale: 0, received: 0, totalTip: 0,
    totalEwallet: 0, totalMembershipWallet: 0, totalRewardValue: 0, totalReferralCredit: 0,
  });
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [pageSize,      setPageSize]      = useState(25);
  const [selectedRow,   setSelectedRow]   = useState<{ saleId: string; appointmentId: string | null } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All Staff", value: "All" }, ...opts]);
    }).catch(() => {});
  }, [dispatch]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
        // Sales Summary is a revenue report — only Paid/Partial Payment sales
        // are actual revenue. Upcoming/Cancelled/No Show/Deleted etc. must
        // never contribute to rows or the server-computed stats totals.
        statuses: ["paid", "partial"],
      };
      if (staffFilter !== "All") body.staff_id = staffFilter;
      if (categoryFilter !== "All") body.category_id = categoryFilter;
      if (search.trim()) body.search = search.trim();
      const res = await api.post(SALES_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const list: any[] = Array.isArray(data?.rows) ? data.rows : [];
      // Defensive client-side filter in addition to the statuses param above —
      // only Paid/Partial Payment sales are revenue and belong in this report
      // (table + export), regardless of what the backend returns.
      const eligible = list.filter(r => ["paid", "partial"].includes(String(r.status ?? "").toLowerCase()));
      setRows(eligible.map(mapAppointment));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalBill: Number(s.total_bill) || 0,
        billAverage: Number(s.bill_average) || 0,
        totalSale: Number(s.total_sale) || 0,
        received: Number(s.received_amount) || 0,
        totalTip: Number(s.total_tip) || 0,
        totalEwallet: Number(s.total_ewallet) || 0,
        totalMembershipWallet: Number(s.total_membership) || 0,
        totalRewardValue: Number(s.total_rewards) || 0,
        totalReferralCredit: Number(s.total_referral) || 0,
      });
      const cats = data?.filters_available?.service_categories;
      if (Array.isArray(cats)) {
        setCategoryOptions([
          { label: "All Categories", value: "All" },
          ...cats.map((c: any) => ({ label: String(c.label ?? ""), value: String(c.id ?? "") })),
        ]);
      }
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilter, categoryFilter, search, currentPage, pageSize]);

  const bulkDelete = useBulkAppointmentDelete(fetchData);
  // Only sale rows linked to a real appointment can be bulk-deleted — walk-in
  // sales with no appointment_id have nothing on the Appointment API to delete.
  const deletableIds = rows.filter(r => r.appointmentId).map(r => r.appointmentId as string);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter/search changes go back to page 1 — page/pageSize changes
  // themselves should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilter, categoryFilter, search]);

  useEffect(() => {
    const close = () => { setShowStaffDrop(false); setShowCategoryDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Invoice No", "Name", "Contact", "Description", "Item Types", "Actual Price", "Price", "Paid", "E-Wallet", "Membership", "Rewards", "Referral", "Due Amount", "Modes", "Status", "Date"];
  const exportRows = () => rows.map(r => [r.invoiceNo, r.name, r.contact, r.description, r.itemTypes, r.actualPrice, r.price, r.paid, r.ewalletUsed, r.membershipWalletUsed, r.rewardPointsValue, r.referralCreditUsed, r.dueAmount, r.modes, r.status, r.date]);
  const paged = rows;

  const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`sales-summary-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff</label>
          <button className="rp-detail-select" onClick={() => { setShowStaffDrop(v => !v); setShowCategoryDrop(false); }}>
            {(staffOptions.find(o => o.value === staffFilter)?.label ?? "All Staff").slice(0, 16)}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showStaffDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {staffOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(o.value); setShowStaffDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Service Category</label>
          <button className="rp-detail-select" onClick={() => { setShowCategoryDrop(v => !v); setShowStaffDrop(false); }}>
            {(categoryOptions.find(o => o.value === categoryFilter)?.label ?? "All Categories").slice(0, 16)}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showCategoryDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {categoryOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === categoryFilter ? "active" : ""}`}
                  onClick={() => { setCategoryFilter(o.value); setShowCategoryDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="dark" className="rp-ss-run-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={9} className="rp-sales-stat-row" /> : (
        <div className="rp-sra-summary-row rp-sales-stat-row">
          {[
            { label: "Total Bill",        value: stats.totalBill.toString() },
            { label: "Bill Average",      value: money(stats.billAverage) },
            { label: "Total Sale",        value: money(stats.totalSale) },
            { label: "Received Amount",   value: money(stats.received) },
            // Return Sales removed — no per-appointment refund data is currently
            // surfaced by GET /api/v1/appointments; revisit if/when that's added.
            { label: "Total Tip",         value: money(stats.totalTip) },
            { label: "Total E-Wallet",    value: money(stats.totalEwallet) },
            { label: "Total Membership",  value: money(stats.totalMembershipWallet) },
            { label: "Total Rewards",     value: money(stats.totalRewardValue) },
            { label: "Total Referral",    value: money(stats.totalReferralCredit) },
          ].map(c => (
            <div key={c.label} className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{c.value}</div>
              <div className="rp-sra-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Invoice, name or phone"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <BulkDeleteBar count={bulkDelete.selectedIds.size} onDeleteClick={() => bulkDelete.setShowConfirm(true)} />

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th className="rp-row-checkbox-col">
                <input
                  type="checkbox"
                  className="rp-row-checkbox"
                  checked={deletableIds.length > 0 && deletableIds.every(id => bulkDelete.selectedIds.has(id))}
                  onChange={() => bulkDelete.toggleAll(deletableIds)}
                  disabled={deletableIds.length === 0}
                />
              </th>
              <th>Invoice No</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Description</th>
              <th>Item Types</th>
              <th>Actual Price</th>
              <th>Price</th>
              <th>Paid</th>
              <th>E-Wallet</th>
              <th>Membership</th>
              <th>Rewards</th>
              <th>Referral</th>
              <th>Due Amount</th>
              <th>Modes</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={17} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={17} className="rp-detail-empty-cell">No sales found</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i} className="rp-appt-row">
                <td className="rp-row-checkbox-col" onClick={e => e.stopPropagation()}>
                  {r.appointmentId && (
                    <input
                      type="checkbox"
                      className="rp-row-checkbox"
                      checked={bulkDelete.selectedIds.has(r.appointmentId)}
                      onChange={() => bulkDelete.toggleOne(r.appointmentId as string)}
                    />
                  )}
                </td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td className="fw-semibold" onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.name}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.contact}</td>
                <td className="rp-ss-desc" title={r.description} onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.description}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.itemTypes}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{money(r.actualPrice)}</td>
                <td className="fw-semibold" onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{money(r.price)}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{money(r.paid)}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.ewalletUsed > 0 ? money(r.ewalletUsed) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.membershipWalletUsed > 0 ? money(r.membershipWalletUsed) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.rewardPointsValue > 0 ? money(r.rewardPointsValue) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.referralCreditUsed > 0 ? money(r.referralCreditUsed) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{money(r.dueAmount)}</td>
                <td className="rp-ss-mode" onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.modes}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />

      {selectedRow && (
        selectedRow.appointmentId ? (
          <AppointmentDetailModal
            appointmentId={selectedRow.appointmentId}
            onClose={() => setSelectedRow(null)}
          />
        ) : (
          <SaleDetailModal
            saleId={selectedRow.saleId}
            onClose={() => setSelectedRow(null)}
          />
        )
      )}

      <BulkDeleteConfirmModal
        show={bulkDelete.showConfirm}
        count={bulkDelete.selectedIds.size}
        deleting={bulkDelete.deleting}
        error={bulkDelete.error}
        onCancel={() => { bulkDelete.setShowConfirm(false); bulkDelete.setError(null); }}
        onConfirm={bulkDelete.confirmDelete}
      />
    </div>
  );
}
