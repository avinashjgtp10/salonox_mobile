import React, { useMemo, useState } from "react";
import PlainStatCard from "./PlainStatCard";
import Pagination from "../../../components/ui/Pagination";
import TabToolbar from "./TabToolbar";
import { useTableSearchSort } from "../hooks/useTableSearchSort";
import type { DateRangeFilterValue } from "../../../components/ui";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

interface LedgerEntry {
  id: string;
  type: string;
  amount?: number;
  balance_after: number;
  source_type: string | null;
  note: string | null;
  created_at: string;
}

const fmtDMY = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  return formatDateDDMMYYYY(d);
};

interface EwalletTabProps {
  balance: number;
  ledger: LedgerEntry[];
  formatAmount: (n: number) => string;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (sz: number) => void;
}

interface Row {
  id: string;
  dateLabel: string;
  typeLabel: string;
  credit: number;
  debit: number;
  balance: number;
  reference: string;
  remarks: string;
  createdAt: string;
}

const EwalletTab: React.FC<EwalletTabProps> = ({
  balance, ledger, formatAmount, page, pageSize, onPageChange, onPageSizeChange,
}) => {
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });

  const rows: Row[] = useMemo(() => ledger.map((l) => {
    const amt = Number(l.amount ?? 0);
    return {
      id: l.id,
      dateLabel: fmtDMY(l.created_at),
      typeLabel: l.type === "topup" ? "Credit" : l.type === "redeem" ? "Debit" : "Adjustment",
      credit: amt > 0 ? amt : 0,
      debit: amt < 0 ? -amt : 0,
      balance: Number(l.balance_after) || 0,
      reference: l.source_type || "–",
      remarks: l.note || "–",
      createdAt: l.created_at,
    };
  }), [ledger]);

  const { search, setSearch, sortKey, sortDir, toggleSort, filteredSortedRows } = useTableSearchSort<Row>({
    rows, searchFields: ["typeLabel", "reference", "remarks"], defaultSortKey: "createdAt",
  });

  const dateFiltered = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return filteredSortedRows;
    const start = new Date(dateRange.startDate + "T00:00:00").getTime();
    const end = new Date(dateRange.endDate + "T23:59:59").getTime();
    return filteredSortedRows.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= start && t <= end;
    });
  }, [filteredSortedRows, dateRange]);

  const paged = dateFiltered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="chp-card">
      <div className="chp-card-header">
        <span className="chp-card-title">E-Wallet</span>
      </div>
      <div style={{ marginBottom: 16, maxWidth: 220 }}>
        <PlainStatCard label="Current Balance" value={formatAmount(balance)} />
      </div>
      <TabToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search transactions..."
        dateRange={{ value: dateRange, onChange: setDateRange }}
        exportConfig={{
          title: "E-Wallet Ledger",
          headers: ["Date", "Transaction Type", "Credit", "Debit", "Balance", "Reference", "Remarks"],
          rows: () => dateFiltered.map((r) => [
            r.dateLabel, r.typeLabel, r.credit.toFixed(2), r.debit.toFixed(2), r.balance.toFixed(2), r.reference, r.remarks,
          ]),
          filename: "ewallet-ledger",
        }}
      />
      {dateFiltered.length === 0 ? (
        <div className="chp-no-data">No wallet transactions found</div>
      ) : (
        <table className="chp-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("createdAt")} style={{ cursor: "pointer" }}>
                Date {sortKey === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th>Transaction Type</th>
              <th style={{ textAlign: "right" }}>Credit</th>
              <th style={{ textAlign: "right" }}>Debit</th>
              <th style={{ textAlign: "right" }}>Balance</th>
              <th>Reference</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id}>
                <td>{r.dateLabel}</td>
                <td>{r.typeLabel}</td>
                <td style={{ textAlign: "right", color: r.credit > 0 ? "#059669" : undefined }}>
                  {r.credit > 0 ? formatAmount(r.credit) : "–"}
                </td>
                <td style={{ textAlign: "right", color: r.debit > 0 ? "#dc2626" : undefined }}>
                  {r.debit > 0 ? formatAmount(r.debit) : "–"}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{formatAmount(r.balance)}</td>
                <td>{r.reference}</td>
                <td>{r.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {dateFiltered.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={dateFiltered.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

export default EwalletTab;
