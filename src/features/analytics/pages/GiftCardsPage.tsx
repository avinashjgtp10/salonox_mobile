import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown, Gift, Gear, Search, FileEarmarkExcel, FiletypeCsv } from "react-bootstrap-icons";
import { format, parseISO } from "date-fns";

// UI Components
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import "../styles/GiftCardsPage.scss";

import type { AppDispatch, RootState } from "../../../store/store";
import { fetchSalesThunk, exportSalesThunk } from "../../../middleware/sale/sale.thunk";
import type { Sale } from "../../../types/sale.types";

const ROWS_PER_PAGE = 10;

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", gift_card: "Gift Card",
  split: "Split", upi: "UPI",
};

export default function GiftCardsPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ── Redux ────────────────────────────────────────────────────────────────
  const allSales   = useSelector((s: RootState) => (s.sale as any).items as Sale[]);
  const isLoading  = useSelector((s: RootState) => (s.sale as any).loading?.fetchAll as boolean ?? false);
  const isExporting = useSelector((s: RootState) => (s.sale as any).loading?.export as boolean ?? false);

  // ── State ────────────────────────────────────────────────────────────────
  const [showOptions, setShowOptions] = useState(false);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const optionsRef = useRef<HTMLDivElement>(null);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchSalesThunk());
  }, [dispatch]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filter: sales where payment_method = gift_card OR items include gift_card ──
  const giftCardSales = allSales.filter((sale) => {
    if (sale.status === "draft") return false;
    // Sales paid via gift card or that include a gift card item
    const hasGiftCardPayment = sale.payment_method === "gift_card";
    const hasGiftCardItem    = sale.items?.some((i) => i.item_type === "gift_card") ?? false;
    return hasGiftCardPayment || hasGiftCardItem;
  });

  const filtered = giftCardSales.filter((sale) => {
    const q = searchTerm.toLowerCase();
    return !q || String(sale.id).includes(q) || (sale.client_id || "").toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const totalPages = Math.ceil(sorted.length / ROWS_PER_PAGE);
  const paginated  = sorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const totalValue = giftCardSales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0);

  return (
    <div className="gift-cards-page container-fluid">
      {/* ── HEADER ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h4 fw-bold mb-1">Gift cards sold</h3>
          <p className="text-muted small mb-0">
            View, filter and export gift cards purchased by your clients.{" "}
            <a href="#" className="text-primary text-decoration-none">Learn more</a>
          </p>
        </div>

        <div className="position-relative" ref={optionsRef}>
          <Button
            variant="outline-dark"
            pill
            onClick={() => setShowOptions(!showOptions)}
            iconRight={
              <ChevronDown
                size={14}
                className={`ms-1 transition-all ${showOptions ? "rotate-180" : ""}`}
              />
            }
          >
            Options
          </Button>

          {showOptions && (
            <div
              className="gift-options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden"
              style={{ minWidth: "200px" }}
            >
              <Button
                variant="ghost"
                fullWidth
                className="text-start p-2 rounded-0 d-flex align-items-center border-bottom"
                onClick={() => setShowOptions(false)}
              >
                <Gear size={15} className="me-2 text-muted" />
                Gift cards settings
              </Button>
              <div className="px-3 py-2 small fw-bold text-muted">Export</div>
              <Button
                variant="ghost"
                fullWidth
                className="text-start p-2 rounded-0 d-flex align-items-center"
                disabled={isExporting}
                onClick={() => { dispatch(exportSalesThunk({ format: "excel" })); setShowOptions(false); }}
              >
                <FileEarmarkExcel size={15} className="text-success me-2" />
                {isExporting ? "Exporting…" : "Excel"}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                className="text-start p-2 rounded-0 d-flex align-items-center"
                disabled={isExporting}
                onClick={() => { dispatch(exportSalesThunk({ format: "csv" })); setShowOptions(false); }}
              >
                <FiletypeCsv size={15} className="text-primary me-2" />
                {isExporting ? "Exporting…" : "CSV"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="giftcard-stat-card">
            <div className="giftcard-stat-label">Total gift card sales</div>
            <div className="giftcard-stat-value">{giftCardSales.length}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="giftcard-stat-card">
            <div className="giftcard-stat-label">Total value</div>
            <div className="giftcard-stat-value">₹{totalValue.toFixed(2)}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="giftcard-stat-card">
            <div className="giftcard-stat-label">Completed</div>
            <div className="giftcard-stat-value giftcard-stat-value--green">
              {giftCardSales.filter((s) => s.status === "completed").length}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH ── */}
      <div className="mb-4" style={{ maxWidth: "380px" }}>
        <div className="giftcard-search">
          <Search size={14} className="giftcard-search__icon" />
          <input
            type="text"
            placeholder="Search by sale # or client…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="giftcard-search__input"
          />
        </div>
      </div>

      {/* ── TABLE or EMPTY STATE ── */}
      {isLoading ? (
        <Card
          className="text-center py-5 border-0 rounded-4 shadow-sm d-flex flex-column align-items-center justify-content-center"
          style={{ minHeight: "300px" }}
        >
          <div className="spinner-border text-muted" role="status" />
          <p className="text-muted small mt-3 mb-0">Loading gift card sales…</p>
        </Card>
      ) : paginated.length > 0 ? (
        <>
          <div className="giftcard-table-wrapper rounded-4 shadow-sm border bg-white overflow-hidden mb-4">
            <table className="giftcard-table w-100">
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((sale) => (
                  <tr key={sale.id} className="giftcard-table-row">
                    <td className="fw-bold small">#{sale.id}</td>
                    <td className="small text-muted">{format(parseISO(sale.created_at), "dd MMM yyyy")}</td>
                    <td className="small">{sale.client_id ?? <span className="text-muted fst-italic">Walk-in</span>}</td>
                    <td className="small text-muted">
                      {sale.payment_method ? PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method : "—"}
                    </td>
                    <td>
                      <span className={`giftcard-badge giftcard-badge--${sale.status}`}>
                        {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-end fw-bold small">
                      ₹{parseFloat(sale.total_amount || "0").toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex align-items-center justify-content-between">
            <div className="small text-muted">
              Viewing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, sorted.length)} of {sorted.length} results
            </div>
            {totalPages > 1 && (
              <div className="d-flex gap-1">
                <button className="giftcard-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`giftcard-page-btn${currentPage === page ? " active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                  >{page}</button>
                ))}
                <button className="giftcard-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <Card
          className="text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-5 flex-grow-1 d-flex flex-column align-items-center justify-content-center"
          style={{ minHeight: "400px" }}
        >
          <div className="mb-4">
            <div
              className="d-flex align-items-center justify-content-center mx-auto empty-state-icon"
              style={{ width: "60px", height: "60px", borderRadius: "15px", background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)" }}
            >
              <Gift size={30} className="text-white" />
            </div>
          </div>
          <h4 className="fw-bold mb-2 text-dark h5">
            {searchTerm ? "No results found" : "No gift card sales yet"}
          </h4>
          <p className="text-muted small">
            {searchTerm ? "Try a different search term." : "You haven't sold any gift cards yet."}
          </p>
        </Card>
      )}
    </div>
  );
}
