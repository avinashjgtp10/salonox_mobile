// Tip Settle — staff-wise tip accrual/payout, mirroring Commission Settle's
// summary+settle pattern but simpler: a tip has no rule/category to
// configure, tip_earned rows are created automatically at checkout (see
// backend tipCalculationService.earnForSale), so this tab is purely
// summary + settle, no configuration UI at all. Shares the same
// .tc-stats/.tc-table/.tc-status/.tc-settle-btn classes as Commission Settle
// and Commission Rules (defined in CommissionsPage.scss) so all three tabs
// stay visually identical rather than three independently-drifting styles.
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import { Gift, Wallet, Calculator } from "react-bootstrap-icons";
import { Pagination } from "../../../components/ui";
import DateRangeFilter, {
  type DateRangeFilterValue, DEFAULT_DATE_RANGE_FILTER_VALUE, getDateRangePresetValue,
} from "../../../components/ui/DateRangeFilter";
import SettleTipModal, { type TipSettlementPaymentMethod } from "../components/tip/SettleTipModal";
import "../styles/TipSettleTab.scss";

const DEFAULT_TABLE_PAGE_SIZE = 10;

interface TipSummary {
  total_tips: number;
  pending_payout: number;
  paid_out: number;
  count: number;
}

interface EarnedTipByStaff {
  staff_id: string;
  staff_first_name: string;
  staff_last_name: string | null;
  total_tips: number;
  pending_payout: number;
  paid_out: number;
  transaction_count: number;
}

function fullName(first: string, last: string | null) {
  return `${first} ${last ?? ""}`.trim();
}

export default function TipSettleTab() {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;
  const { formatAmount: fmt, currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [dateRange, setDateRange] = useState<DateRangeFilterValue>(() => ({
    ...DEFAULT_DATE_RANGE_FILTER_VALUE,
    preset: "this_month",
    ...getDateRangePresetValue("this_month"),
  }));

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TipSummary | null>(null);
  const [earnedByStaff, setEarnedByStaff] = useState<EarnedTipByStaff[]>([]);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settleTarget, setSettleTarget] = useState<{ staffId: string; name: string; pending: number } | null>(null);

  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryPageSize, setSummaryPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const fetchAll = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    try {
      const params = dateRange.startDate && dateRange.endDate
        ? `&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
        : "";
      const [summaryRes, earnedRes] = await Promise.all([
        api.get(`${STAFF.TIP_SUMMARY}?salon_id=${salonId}${params}`),
        api.get(`${STAFF.TIP_EARNED}?salon_id=${salonId}${params}`),
      ]);
      setSummary(summaryRes.data?.data ?? null);
      setEarnedByStaff(earnedRes.data?.data ?? []);
      setSummaryPage(1);
    } catch (err: any) {
      showError(err?.message ?? "Failed to load tips");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId, dateRange.startDate, dateRange.endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSettle = async (staffId: string, name: string, amount: number, paymentMethod: TipSettlementPaymentMethod) => {
    setSettlingId(staffId);
    try {
      await api.post(STAFF.SETTLE_TIP(staffId), { amount, payment_method: paymentMethod });
      showSuccess(`${fmt(amount)} settled for ${name}`);
      setSettleTarget(null);
      await fetchAll();
    } catch (err: any) {
      showError(err?.response?.data?.message ?? "Failed to settle tip");
    } finally {
      setSettlingId(null);
    }
  };

  const pagedSummary = earnedByStaff.slice((summaryPage - 1) * summaryPageSize, summaryPage * summaryPageSize);

  return (
    <div className="commissions-page">
      {overlay}

      <div className="cm-header">
        <div>
          <h2 className="cm-title">Tip Settle</h2>
          <p className="cm-subtitle">Track and settle staff tip payouts</p>
        </div>
      </div>

      <div className="tc-stats">
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--pink"><Gift size={16} /></span>
          <span className="tc-stat-label">Total Tips</span>
          <strong className="tc-stat-val">{summary ? fmt(summary.total_tips) : "—"}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--green"><CurrencyIcon size={15} /></span>
          <span className="tc-stat-label">Tips Paid</span>
          <strong className="tc-stat-val">{summary ? fmt(summary.paid_out) : "—"}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--amber"><Wallet size={15} /></span>
          <span className="tc-stat-label">Pending Tips</span>
          <strong className="tc-stat-val">{summary ? fmt(summary.pending_payout) : "—"}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--violet"><Calculator size={15} /></span>
          <span className="tc-stat-label">Total Accrued</span>
          <strong className="tc-stat-val">{summary ? fmt(summary.total_tips) : "—"}</strong>
        </div>
      </div>

      <div className="ts-range-row">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="tc-toolbar">
        <span className="tc-toolbar-title">Tip Summary</span>
      </div>
      <div className="tc-table-wrap">
        {loading ? (
          <div className="cm-ov-empty"><Gift size={28} /><p>Loading…</p></div>
        ) : earnedByStaff.length === 0 ? (
          <div className="cm-ov-empty">
            <Gift size={28} />
            <p>No tips in this date range</p>
            <span className="cm-ov-empty-sub">Tips appear here after checkouts</span>
          </div>
        ) : (
          <table className="tc-table">
            <thead>
              <tr>
                <th>#</th><th>Staff Name</th><th>Total Tips ({currencyCode})</th>
                <th>Tips Paid ({currencyCode})</th><th>Pending Payout ({currencyCode})</th>
                <th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedSummary.map((e, i) => {
                const name = fullName(e.staff_first_name, e.staff_last_name);
                const status = e.pending_payout > 0 && e.paid_out > 0 ? "Partial" : e.pending_payout > 0 ? "Pending" : "Settled";
                return (
                  <tr key={e.staff_id}>
                    <td>{(summaryPage - 1) * summaryPageSize + i + 1}</td>
                    <td className="tc-table__name">{name}</td>
                    <td>{fmt(e.total_tips)}</td>
                    <td>{fmt(e.paid_out)}</td>
                    <td>{fmt(e.pending_payout)}</td>
                    <td><span className={`tc-status tc-status--${status.toLowerCase()}`}>{status}</span></td>
                    <td>
                      {e.pending_payout > 0 ? (
                        <button
                          className="tc-settle-btn"
                          disabled={settlingId === e.staff_id}
                          onClick={() => setSettleTarget({ staffId: e.staff_id, name, pending: e.pending_payout })}
                        >
                          {settlingId === e.staff_id ? "Settling…" : "Settle"}
                        </button>
                      ) : (
                        <span className="tc-view-btn">View</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {earnedByStaff.length > 0 && (
        <Pagination
          currentPage={summaryPage}
          pageSize={summaryPageSize}
          totalItems={earnedByStaff.length}
          onPageChange={setSummaryPage}
          onPageSizeChange={(size) => { setSummaryPageSize(size); setSummaryPage(1); }}
        />
      )}

      <p className="ts-footnote">Tips are collected from clients and distributed to staff as per your policy.</p>

      {settleTarget && (
        <SettleTipModal
          staffName={settleTarget.name}
          totalUnpaid={settleTarget.pending}
          formatAmount={fmt}
          onConfirm={(amount, paymentMethod) => handleSettle(settleTarget.staffId, settleTarget.name, amount, paymentMethod)}
          onClose={() => setSettleTarget(null)}
        />
      )}
    </div>
  );
}
