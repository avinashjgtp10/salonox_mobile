import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF_SALES_REPORT } from "../../../services/api/endpoints";
import { Pagination, Loader } from "../../../components/ui";
import { useCurrency } from "../../../hooks/useCurrency";
import "./StaffHistoryModal.scss";

interface StaffHistoryRow {
  id: string;
  date: string;
  description: string;
  itemType: string;
  totalSales: number;
  paid: number;
  due: number;
  commission: number;
  paymentMode: string;
  status: string;
}

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function mapRow(row: any): StaffHistoryRow {
  return {
    id: String(row.id ?? ""),
    date: row.created_at ? formatDate(row.created_at) : "—",
    description: row.item_description || "—",
    itemType: row.item_types || "—",
    totalSales: Number(row.price) || 0,
    paid: Number(row.paid_amount) || 0,
    due: Number(row.due_amount) || 0,
    commission: Number(row.commission_amount) || 0,
    paymentMode: row.payment_method || "—",
    status: row.status || "booked",
  };
}

// Drill-down opened by clicking a staff name in the Staff Sales report —
// scoped to that one staff member, same date range currently applied on the
// parent report. Reuses the same POST /api/report/staff-sales endpoint
// (single staff_id), never a new backend call.
export default function StaffHistoryModal({
  staffId, staffName, dateFrom, dateTo, onClose,
}: {
  staffId: string; staffName: string; dateFrom: string; dateTo: string; onClose: () => void;
}) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [rows, setRows] = useState<StaffHistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalSale: 0, totalPaid: 0, totalDue: 0, totalCommission: 0 });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body = { start_date: dateFrom, end_date: dateTo, staff_id: staffId, page: currentPage, limit: pageSize };
      const res = await api.post(STAFF_SALES_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalSale: Number(s.total_sale) || 0,
        totalPaid: Number(s.total_paid) || 0,
        totalDue: Number(s.total_due) || 0,
        totalCommission: Number(s.total_commission) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") { setRows([]); setTotal(0); }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [staffId, dateFrom, dateTo, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="modal-box shm-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{staffName} — Sales History</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="shm-range">{dateFrom} to {dateTo}</div>

        {loading ? (
          <Loader message="Loading staff history..." />
        ) : (
          <>
            <div className="shm-stats-row">
              <div className="shm-stat"><div className="shm-stat-val">{formatAmount(stats.totalSale)}</div><div className="shm-stat-label">Total Sales</div></div>
              <div className="shm-stat"><div className="shm-stat-val">{formatAmount(stats.totalPaid)}</div><div className="shm-stat-label">Paid</div></div>
              <div className="shm-stat"><div className="shm-stat-val">{formatAmount(stats.totalDue)}</div><div className="shm-stat-label">Due</div></div>
              <div className="shm-stat"><div className="shm-stat-val">{formatAmount(stats.totalCommission)}</div><div className="shm-stat-label">Commission</div></div>
            </div>

            <div className="shm-table-wrap">
              <table className="shm-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Item Type</th><th>Description</th>
                    <th>Total Sales ({currencySymbol})</th><th>Paid ({currencySymbol})</th>
                    <th>Due ({currencySymbol})</th><th>Commission ({currencySymbol})</th>
                    <th>Payment Mode</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={9} className="shm-empty">No sales found for this staff member in the selected date range.</td></tr>
                  ) : rows.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.itemType}</td>
                      <td>{r.description}</td>
                      <td>{formatAmount(r.totalSales)}</td>
                      <td>{formatAmount(r.paid)}</td>
                      <td>{formatAmount(r.due)}</td>
                      <td>{formatAmount(r.commission)}</td>
                      <td>{r.paymentMode}</td>
                      <td><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
              onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
          </>
        )}
      </div>
    </div>
  );
}
