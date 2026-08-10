import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SALES_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import { useBulkAppointmentDelete } from "./useBulkAppointmentDelete";
import { BulkDeleteBar, BulkDeleteConfirmModal } from "./BulkDeleteBar";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatPaymentMode } from "../../../utils/paymentMode";
import SaleDetailModal from "./SaleDetailModal";
import "./SalesSummaryReport.scss";

const REPORT_NAME = "Sales Summary";

const PAYMENT_STATUS_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
];

const ITEM_TYPE_OPTIONS = [
  { id: "service", label: "Service" },
  { id: "product", label: "Product" },
  { id: "membership", label: "Membership" },
  { id: "gift_card", label: "Gift Card" },
  { id: "quick", label: "Quick" },
  { id: "package", label: "Package" },
];

interface SaleRow {
  id: string;
  appointmentId: string | null;
  invoiceNo: string;
  name: string;
  contact: string;
  itemDescription: string;
  itemTypes: string;
  staffName: string;
  bill: number;
  grandTotal: number;
  discountAmount: number;
  couponCode: string;
  couponDiscount: number;
  referralDiscount: number;
  taxAmount: number;
  paid: number;
  dueAmount: number;
  description: string;
  modes: string;
  status: string;
  date: string;
  tip: number;
  ewalletUsed: number;
  membershipWalletUsed: number;
  packageUsed: number;
  rewardPointsValue: number;
  referralCreditUsed: number;
}

// dd-MM-yyyy, consistently across the table and every export (CSV/Excel/PDF
// all read the same r.date via exportRows) — toLocaleDateString("en-GB")
// gives dd/MM/yyyy (slashes), not the dash-separated format required here.
// Also used by the drill-down modal's own date so it matches the table.
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Maps a row from the independent Sales Summary API
// (POST /api/report/sales-summary — reads sales/sale_items/payments directly,
// never the Appointment API) to the table's existing SaleRow shape.
function mapAppointment(row: any): SaleRow {
  const paid = Number(row.paid_amount) || 0;
  const ewalletUsed          = Number(row.ewallet_used) || 0;
  const membershipWalletUsed = Number(row.membership_wallet_used) || 0;
  const packageUsed          = Number(row.package_used) || 0;
  const rewardPointsValue    = Number(row.reward_points_value) || 0;
  const referralCreditUsed   = Number(row.referral_credit_used) || 0;

  // 'split' now also covers Package/Membership combined with real money (e.g.
  // "Package + Cash") — see payment-method.util.ts's normalizePaymentMethod().
  // Package has no dedicated numeric column like membership_wallet_used
  // below, so its presence has to be read off payment_reference's leg names
  // whenever the method isn't the plain single-source 'package' value.
  const paymentReferenceKeys: string[] = (() => {
    if (!row.payment_reference) return [];
    try { return Object.keys(JSON.parse(row.payment_reference)); } catch { return []; }
  })();
  // packageUsed > 0 catches a MIXED bill (e.g. "Cash + Package") that the
  // method label alone would miss — the label only reads "package" when the
  // whole bill was covered by sessions.
  const isPackagePayment = String(row.payment_method ?? "").toLowerCase() === "package"
    || paymentReferenceKeys.includes("Package")
    || packageUsed > 0;
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
    invoiceNo: row.invoice_number != null ? String(row.invoice_number) : "Not billed yet",
    name: row.client_name ?? "Walk-in",
    contact: row.client_phone ?? "—",
    itemDescription: row.item_description ?? "—",
    itemTypes: row.item_types ?? "—",
    staffName: row.staff_name ?? "—",
    // The gross pre-discount subtotal (what was actually sold), not
    // row.price — that field is net-of-discount (e.g. 1139.40 or even ~0 for
    // a fully membership-covered bill), which read as a confusingly small
    // "Bill" the moment a real membership discount was involved. Reconciles
    // as Bill − Discount + GST = Paid + Membership + eWallet + Rewards +
    // Referral + Due, same composition the rest of this row already implies.
    bill: Math.round(Number(row.actual_price) || 0),
    // The actual invoice total — net-of-discount, GST-inclusive — same figure
    // the receipt's own "Grand Total" line shows (row.price = s.total_amount).
    grandTotal: Number(row.price) || 0,
    // Bill-level manual discount only (matches the existing "Discount" column's
    // pre-existing scope) — coupon/referral, now stored on the sale itself
    // (payments.service.ts), are broken out as their own fields instead of
    // being silently folded into this figure.
    discountAmount: Number(row.discount_amount) || 0,
    couponCode: row.coupon_code ?? "",
    couponDiscount: Number(row.coupon_discount_amount) || 0,
    referralDiscount: Number(row.referral_discount_amount) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    paid,
    dueAmount: Number(row.due_amount) || 0,
    description,
    modes: formatPaymentMode(row.payment_method, row.payment_reference),
    status: row.status ?? "booked",
    date: row.created_at ? formatDate(row.created_at) : "—",
    tip: Number(row.tip_amount) || 0,
    ewalletUsed,
    membershipWalletUsed,
    packageUsed,
    rewardPointsValue,
    referralCreditUsed,
  };
}

export default function SalesSummaryReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { formatAmount: money } = useCurrency();
  const today     = new Date().toISOString().slice(0, 10);
  const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [dateFrom,      setDateFrom]      = useState(weekAgo);
  const [dateTo,        setDateTo]        = useState(today);
  const [staffOptions,  setStaffOptions]  = useState<{ id: string; label: string }[]>([]);
  // Populated from filters_available.service_categories on every fetch — every
  // service category in the salon (not just ones with sales), same convention
  // as Daily Sheet's service/staff dropdowns.
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; label: string }[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<{ id: string; label: string }[]>([]);
  const [serviceOptions, setServiceOptions] = useState<{ id: string; label: string }[]>([]);
  const [staffFilterIds,      setStaffFilterIds]      = useState<string[]>([]);
  const [categoryIds,         setCategoryIds]         = useState<string[]>([]);
  const [paymentModes,        setPaymentModes]        = useState<string[]>([]);
  const [paymentStatuses,     setPaymentStatuses]     = useState<string[]>([]);
  const [itemTypes,           setItemTypes]           = useState<string[]>([]);
  const [serviceIds,          setServiceIds]          = useState<string[]>([]);
  const [search,        setSearch]        = useState("");
  const [rows,          setRows]          = useState<SaleRow[]>([]);
  const [stats,         setStats]         = useState({
    totalBill: 0, billAverage: 0, totalSale: 0, received: 0, totalTip: 0,
    totalEwallet: 0, totalMembershipWallet: 0, totalPackageUsed: 0, totalRewardValue: 0, totalReferralCredit: 0,
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
        id: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.id);
      setStaffOptions(opts);
    }).catch(() => {});
  }, [dispatch]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      // Sales Summary is a revenue report — only Paid/Partial Payment sales
      // are actual revenue. Upcoming/Cancelled/No Show/Deleted etc. must
      // never contribute to rows or the server-computed stats totals. The
      // Payment Status filter narrows within that same paid/partial set.
      // Now enforced server-side (payment_statuses, both stats and rows), so
      // no client-side re-filter of the response is needed anymore.
      const effectiveStatuses = paymentStatuses.length > 0 ? paymentStatuses : ["paid", "partial"];
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
        payment_statuses: effectiveStatuses,
      };
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (categoryIds.length > 0) body.category_ids = categoryIds;
      if (paymentModes.length > 0) body.payment_modes = paymentModes;
      if (itemTypes.length > 0) body.item_types = itemTypes;
      if (serviceIds.length > 0) body.service_ids = serviceIds;
      if (search.trim()) body.search = search.trim();
      const res = await api.post(SALES_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const list: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(list.map(mapAppointment));
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
        totalPackageUsed: Number(s.total_package) || 0,
        totalRewardValue: Number(s.total_rewards) || 0,
        totalReferralCredit: Number(s.total_referral) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.service_categories)) {
        setCategoryOptions(avail.service_categories.map((c: any) => ({ label: String(c.label ?? ""), id: String(c.id ?? "") })));
      }
      if (Array.isArray(avail.payment_modes)) {
        setPaymentModeOptions(avail.payment_modes.map((m: any) => ({ label: formatPaymentMode(String(m)), id: String(m) })));
      }
      if (Array.isArray(avail.services)) {
        setServiceOptions(avail.services.map((s2: any) => ({ label: String(s2.label ?? ""), id: String(s2.id ?? "") })));
      }
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, categoryIds, paymentModes, paymentStatuses, itemTypes, serviceIds, search, currentPage, pageSize]);

  const bulkDelete = useBulkAppointmentDelete(fetchData);
  // Only sale rows linked to a real appointment can be bulk-deleted — walk-in
  // sales with no appointment_id have nothing on the Appointment API to delete.
  const deletableIds = rows.filter(r => r.appointmentId).map(r => r.appointmentId as string);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter/search changes go back to page 1 — page/pageSize changes
  // themselves should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilterIds, categoryIds, paymentModes, paymentStatuses, itemTypes, serviceIds, search]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "category", label: "Service Category", options: categoryOptions, searchable: true },
    { key: "payment_mode", label: "Payment Mode", options: paymentModeOptions },
    { key: "payment_status", label: "Payment Status", options: PAYMENT_STATUS_OPTIONS },
    { key: "item_type", label: "Item Type", options: ITEM_TYPE_OPTIONS },
    { key: "service", label: "Service", options: serviceOptions, searchable: true },
  ], [staffOptions, categoryOptions, paymentModeOptions, serviceOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    category: categoryIds,
    payment_mode: paymentModes,
    payment_status: paymentStatuses,
    item_type: itemTypes,
    service: serviceIds,
  }), [staffFilterIds, categoryIds, paymentModes, paymentStatuses, itemTypes, serviceIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    setCategoryIds(next.category ?? []);
    setPaymentModes(next.payment_mode ?? []);
    setPaymentStatuses(next.payment_status ?? []);
    setItemTypes(next.item_type ?? []);
    setServiceIds(next.service ?? []);
  };

  const HEADERS = ["Date", "Invoice No", "Name", "Contact", "Item Types", "Staff Name", "Discount", "Coupon Code", "Coupon Discount", "Referral Discount", "GST", "Grand Total", "Paid", "Membership", "Package", "E-Wallet", "Rewards", "Referral Credit", "Due Amount", "Modes", "Status", "Description"];
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.name, r.contact, r.itemTypes, r.staffName, r.discountAmount, r.couponCode, r.couponDiscount, r.referralDiscount, r.taxAmount, r.grandTotal, r.paid, r.membershipWalletUsed, r.packageUsed, r.ewalletUsed, r.rewardPointsValue, r.referralCreditUsed, r.dueAmount, r.modes, r.status, r.description]);
  const paged = rows;

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`sales-summary-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFields from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={6} className="rp-sales-stat-row" /> : (
        <div className="rp-sra-summary-row rp-sales-stat-row">
          {[
            { label: "Total Bill",        value: stats.totalBill.toString() },
            { label: "Total Sale",        value: money(stats.totalSale) },
            { label: "Received Amount",   value: money(stats.received) },
            // Return Sales removed — no per-appointment refund data is currently
            // surfaced by GET /api/v1/appointments; revisit if/when that's added.
            { label: "Total E-Wallet",    value: money(stats.totalEwallet) },
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
              <th>Date</th>
              <th>Invoice No</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Item Types</th>
              <th>Staff Name</th>
              <th>Discount</th>
              <th>GST</th>
              <th>Grand Total</th>
              <th>Paid</th>
              <th>Membership</th>
              <th>Package</th>
              <th>E-Wallet</th>
              <th>Rewards</th>
              <th>Referral</th>
              <th>Due Amount</th>
              <th>Modes</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={20} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={20} className="rp-detail-empty-cell">No sales found</td></tr>
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
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.date}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td className="fw-semibold" onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.name}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.contact}</td>
                <td className="rp-ss-item-types" title={r.itemTypes} onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.itemTypes}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.staffName}</td>
                <td
                  onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}
                  title={[
                    r.couponDiscount > 0 ? `Coupon${r.couponCode ? ` (${r.couponCode})` : ""}: -${money(r.couponDiscount)}` : null,
                    r.referralDiscount > 0 ? `Referral: -${money(r.referralDiscount)}` : null,
                  ].filter(Boolean).join(" · ") || undefined}
                >
                  {money(r.discountAmount)}
                  {(r.couponDiscount > 0 || r.referralDiscount > 0) && (
                    <span style={{ marginLeft: 4, fontSize: 10, color: "#7c3aed", fontWeight: 700 }}>+</span>
                  )}
                </td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{money(r.taxAmount)}</td>
                <td className="fw-semibold" onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{money(r.grandTotal)}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{money(r.paid)}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.membershipWalletUsed > 0 ? money(r.membershipWalletUsed) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.packageUsed > 0 ? money(r.packageUsed) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.ewalletUsed > 0 ? money(r.ewalletUsed) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.rewardPointsValue > 0 ? money(r.rewardPointsValue) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.referralCreditUsed > 0 ? money(r.referralCreditUsed) : "—"}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{money(r.dueAmount)}</td>
                <td className="rp-ss-mode" onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.modes}</td>
                <td onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
                <td className="rp-ss-desc" title={r.description} onClick={() => r.id && setSelectedRow({ saleId: r.id, appointmentId: r.appointmentId })}>{r.description}</td>
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
