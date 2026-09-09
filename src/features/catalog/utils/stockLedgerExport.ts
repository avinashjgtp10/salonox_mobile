import * as XLSX from "xlsx";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

// Excel export for the Stock Ledger page. Takes already-formatted display
// strings (built by the page itself, reusing its own fmtDate/fmtBalance/
// TXN_LABELS/IN_TYPES helpers) rather than raw LedgerRow objects — those
// helpers are page-local and encode bottle-size-aware quantity math that's
// easy to get subtly wrong by re-deriving it a second time here, so the
// page computes the values once and this file just writes them out.
export interface StockLedgerExportRow {
  date: string;
  product: string;
  transaction: string;
  reference: string;
  in: string;
  out: string;
  balance: string;
  supplier: string;
  staff: string;
  notes: string;
}

const fileStamp = () => formatDateDDMMYYYY(new Date());

export const exportStockLedgerExcel = (rows: StockLedgerExportRow[]) => {
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r, i) => ({
      "#": i + 1,
      Date: r.date,
      Product: r.product,
      Transaction: r.transaction,
      Reference: r.reference,
      In: r.in,
      Out: r.out,
      Balance: r.balance,
      Supplier: r.supplier,
      Staff: r.staff,
      Notes: r.notes,
    })),
  );
  sheet["!cols"] = [
    { wch: 5 }, { wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 16 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 24 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Stock Ledger");
  XLSX.writeFile(book, `stock-ledger-${fileStamp()}.xlsx`);
};
