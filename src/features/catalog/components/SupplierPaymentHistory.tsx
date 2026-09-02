import React, { useCallback, useEffect, useState } from "react";
import { CashStack } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import type { SupplierPayment } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Pagination from "../../../components/ui/Pagination";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";

const PAGE_SIZE = 10;

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

interface SupplierPaymentHistoryProps {
  supplierId: string;
  /** Bumped by the parent whenever a new payout is recorded, to trigger a refetch. */
  refreshKey?: number;
}

// Payment history tab, parametrized by supplierId so it doubles as a
// standalone list later if needed — mirrors PurchaseHistoryListPage's
// list+pagination shape (phist-table styling reused via shared class names).
const SupplierPaymentHistory: React.FC<SupplierPaymentHistoryProps> = ({ supplierId, refreshKey }) => {
  const { formatAmount } = useCurrency();
  const { showError } = useStatusOverlay();

  const [rows, setRows] = useState<SupplierPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(INVENTORY.SUPPLIER_PAYMENTS(supplierId), {
        params: { page, limit: pageSize },
      });
      setRows(res.data?.data?.data ?? []);
      setTotal(res.data?.data?.total ?? 0);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Couldn't load payment history");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [supplierId, page, pageSize, showError]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="phist-page">
      <table className="phist-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Method</th>
            <th>Note</th>
            <th className="phist-num">Amount</th>
            <th className="phist-num">Balance After</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                <td><Skeleton width="50%" height={13} /></td>
                <td><Skeleton width="60%" height={13} /></td>
                <td><Skeleton width="70%" height={13} /></td>
                <td><Skeleton width="40%" height={13} /></td>
                <td><Skeleton width="40%" height={13} /></td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="phist-empty-cell">
                <EmptyState icon={<CashStack size={32} />} title="No payments recorded yet." />
              </td>
            </tr>
          ) : (
            rows.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.payment_date)}</td>
                <td>{METHOD_LABEL[p.payment_method] || p.payment_method}</td>
                <td>{p.note || "—"}</td>
                <td className="phist-num fw-semibold">{formatAmount(Number(p.amount) || 0)}</td>
                <td className="phist-num">{formatAmount(Number(p.running_balance_after) || 0)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {total > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          className="phist-pagination"
        />
      )}
    </div>
  );
};

export default SupplierPaymentHistory;
