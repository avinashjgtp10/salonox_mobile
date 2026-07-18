import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Search,
  FloppyFill,
  Upload,
  Download,
  ArrowClockwise,
} from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchStockReconciliationThunk,
  saveStockReconciliationThunk,
  saveReconciliationRowThunk,
} from "../../../middleware/inventory/inventory.thunk";
import { fetchBranchesThunk } from "../../../middleware/salon/salon.thunk";
import { Pagination } from "../../../components/ui";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import "../styles/StockReconciliationPage.scss";

// ─── Local row shape ──────────────────────────────────────────────────────────
interface LocalRow {
  product_id: string;
  category_name: string;
  item_name: string;
  actual_stock: number;
  adjust_stock: number;
  stock_difference: number;
  stock_value: number;
  actual_consumable: number;
  adjust_consumable: number;
  unit: string;
  consumable_difference: number;
  remark: string;
  isDirty: boolean;
  isSaving: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

const StockReconciliationPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // ── Selectors ───────────────────────────────────────────────────────────────
  const { currentSalon, branches } = useSelector((s: RootState) => s.salon);
  const { reconciliationRows, reconciliationLoading, reconciliationSaving } = useSelector(
    (s: RootState) => s.inventory
  );

  // ── Local state ─────────────────────────────────────────────────────────────
  const [rows, setRows]                         = useState<LocalRow[]>([]);
  const [searchTerm, setSearchTerm]             = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [page, setPage]                         = useState(1);
  const [pageSize, setPageSize]                 = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // ── Branch (always use the main branch) ─────────────────────────────────────
  const branchId = useMemo(() => {
    return (
      branches.find((b: any) => b.is_main === true)?.id ??
      branches[0]?.id ??
      ""
    );
  }, [branches]);

  // ── 1. Load branches on mount, then data whenever branchId is ready ──────────
  useEffect(() => {
    if (currentSalon?.id) {
      dispatch(fetchBranchesThunk(currentSalon.id));
    }
  }, [dispatch, currentSalon?.id]);

  const loadData = useCallback(() => {
    if (branchId) {
      dispatch(fetchStockReconciliationThunk({ branchId }));
    }
  }, [dispatch, branchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── 2. Build local rows directly from reconciliation API response ─────────────
  //
  // GET /inventory/stock-reconciliation returns ALL products via LEFT JOIN —
  // no separate /products fetch needed, no 500-row pagination cap.
  useEffect(() => {
    setRows(
      reconciliationRows.map((r) => ({
        ...r,
        remark: r.remark ?? "",
        isDirty: false,
        isSaving: false,
      }))
    );
  }, [reconciliationRows]);

  // ── Reset to page 1 whenever search or category filter changes ───────────────
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory]);

  // ── 3. Field change handler ──────────────────────────────────────────────────
  const updateRow = useCallback(
    (
      productId: string,
      field: "adjust_stock" | "adjust_consumable" | "remark",
      value: string
    ) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.product_id !== productId) return row;

          const updated = { ...row, isDirty: true };

          if (field === "adjust_stock") {
            const adjustStock = Math.max(0, Number(value) || 0);
            updated.adjust_stock = adjustStock;
            updated.stock_difference = adjustStock - row.actual_stock;
          } else if (field === "adjust_consumable") {
            const adjustCons = Math.max(0, Number(value) || 0);
            updated.adjust_consumable = adjustCons;
            updated.consumable_difference = adjustCons - row.actual_consumable;
          } else {
            updated.remark = value;
          }

          return updated;
        })
      );
    },
    []
  );

  // ── 4a. Save a single row ────────────────────────────────────────────────────
  const saveSingleRow = useCallback(
    async (row: LocalRow) => {
      if (!branchId) { showError("Branch not found"); return; }

      setRows((prev) =>
        prev.map((r) =>
          r.product_id === row.product_id ? { ...r, isSaving: true } : r
        )
      );

      try {
        await dispatch(
          saveReconciliationRowThunk({
            branchId,
            item: {
              product_id: row.product_id,
              adjust_stock: row.adjust_stock,
              adjust_consumable: row.adjust_consumable,
              remark: row.remark,
            },
          })
        ).unwrap();

        setRows((prev) =>
          prev.map((r) =>
            r.product_id === row.product_id
              ? { ...r, isDirty: false, isSaving: false }
              : r
          )
        );
        showSuccess(`${row.item_name} saved`);
      } catch (err: any) {
        setRows((prev) =>
          prev.map((r) =>
            r.product_id === row.product_id ? { ...r, isSaving: false } : r
          )
        );
        showError(err || "Failed to save");
      }
    },
    [dispatch, branchId]
  );

  // ── 4b. Update All (batch save) ──────────────────────────────────────────────
  const handleUpdateAll = useCallback(async () => {
    if (!branchId) { showError("Branch not found"); return; }

    const dirtyRows = rows.filter((r) => r.isDirty);
    if (dirtyRows.length === 0) { showError("No changes to save"); return; }

    try {
      await dispatch(
        saveStockReconciliationThunk({
          branch_id: branchId,
          items: dirtyRows.map((r) => ({
            product_id: r.product_id,
            adjust_stock: r.adjust_stock,
            adjust_consumable: r.adjust_consumable,
            remark: r.remark,
          })),
        })
      ).unwrap();

      setRows((prev) => prev.map((r) => ({ ...r, isDirty: false })));
      showSuccess(`${dirtyRows.length} item(s) updated`);
    } catch (err: any) {
      showError(err || "Failed to update all");
    }
  }, [dispatch, branchId, rows]);

  // ── 4c. Clear All ────────────────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        adjust_stock: row.actual_stock,
        adjust_consumable: row.actual_consumable,
        stock_difference: 0,
        consumable_difference: 0,
        remark: "",
        isDirty: false,
      }))
    );
  }, []);

  // ── 5. Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const headers = [
      "Category Name", "Item Name", "Actual Stock", "Adjust Stock",
      "Stock Difference", "Stock Value", "Actual Consumable",
      "Adjust Consumable", "Unit", "Consumable Difference", "Remark",
    ];
    const csvRows = [
      headers.join(","),
      ...filteredRows.map((r) =>
        [
          `"${r.category_name}"`, `"${r.item_name}"`,
          r.actual_stock, r.adjust_stock, r.stock_difference,
          r.stock_value.toFixed(2), r.actual_consumable,
          r.adjust_consumable, `"${r.unit}"`, r.consumable_difference,
          `"${r.remark}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, searchTerm, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 6. Import CSV ─────────────────────────────────────────────────────────────
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const lines = text.split("\n").filter(Boolean);
          const dataLines = lines.slice(1);

          setRows((prev) => {
            const rowMap = new Map(prev.map((r) => [r.item_name.toLowerCase(), r]));
            dataLines.forEach((line) => {
              const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
              const name = cols[1]?.toLowerCase();
              const existing = rowMap.get(name);
              if (existing) {
                const adjustStock = Number(cols[3]) || existing.adjust_stock;
                const adjustCons  = Number(cols[7]) || existing.adjust_consumable;
                rowMap.set(name, {
                  ...existing,
                  adjust_stock: adjustStock,
                  stock_difference: adjustStock - existing.actual_stock,
                  adjust_consumable: adjustCons,
                  consumable_difference: adjustCons - existing.actual_consumable,
                  remark: cols[10] ?? existing.remark,
                  isDirty: true,
                });
              }
            });
            return Array.from(rowMap.values());
          });
          showSuccess("Import applied — review and click Update All or save each row");
        } catch {
          showError("Failed to parse CSV");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    []
  );

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch = r.item_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat =
        selectedCategory === "All" || r.category_name === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [rows, searchTerm, selectedCategory]);

  const paginatedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize]
  );

  const uniqueCategories = useMemo(() => {
    const cats = [
      ...new Set(rows.map((r) => r.category_name).filter((c) => c !== "—")),
    ].sort();
    return ["All", ...cats];
  }, [rows]);

  const isLoading = reconciliationLoading;
  const hasUnsaved = rows.some((r) => r.isDirty);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="stock-recon-page">
      {overlay}
      {/* ── Header: Search + Category filter + Import / Export ── */}
      <div className="stock-recon-page__header">
        <div className="stock-recon-page__filters">
          <div className="stock-recon-page__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search By Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="stock-recon-page__cat-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="stock-recon-page__actions">
          {/* Hidden file input for CSV import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          <button
            className="stock-recon-page__btn stock-recon-page__btn--refresh"
            onClick={loadData}
            disabled={isLoading}
            title="Reload latest stock & consumable data"
          >
            <ArrowClockwise size={16} className={isLoading ? "spin" : ""} /> Refresh
          </button>
          <button
            className="stock-recon-page__btn stock-recon-page__btn--import"
            onClick={() => fileInputRef.current?.click()}
          >
            <Download size={16} /> Import
          </button>
          <button
            className="stock-recon-page__btn stock-recon-page__btn--export"
            onClick={handleExport}
          >
            <Upload size={16} /> Export
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="stock-recon-page__table-wrap">
        {isLoading ? (
          <div className="stock-recon-page__loading">
            <ArrowClockwise size={24} className="spin" />
            <span>Loading stock data…</span>
          </div>
        ) : (
          <table className="stock-recon-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Item Name</th>
                <th className="text-center">Actual Stock</th>
                <th className="text-center">Adjust Stock</th>
                <th className="text-center">Stock Difference</th>
                <th className="text-center">Stock Value</th>
                <th className="text-center">Actual Consumable</th>
                <th className="text-center">Adjust Consumable</th>
                <th className="text-center">Unit</th>
                <th className="text-center">Consumable Difference</th>
                <th className="text-center">
                  Remark<span className="required-star">*</span>
                </th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="stock-recon-table__empty">
                    {searchTerm || selectedCategory !== "All"
                      ? "No items match your filters."
                      : "No products found. Go to Catalog → Products → Add to create products first."}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.product_id}
                    className={row.isDirty ? "row--dirty" : ""}
                  >
                    {/* Category */}
                    <td className="cell--category">{row.category_name}</td>

                    {/* Item Name */}
                    <td className="cell--name">{row.item_name}</td>

                    {/* Actual Stock (read-only) */}
                    <td className="text-center cell--num">{row.actual_stock}</td>

                    {/* Adjust Stock (editable) */}
                    <td className="text-center">
                      <input
                        type="number"
                        min={0}
                        className="stock-recon-table__input"
                        value={row.adjust_stock}
                        onChange={(e) =>
                          updateRow(row.product_id, "adjust_stock", e.target.value)
                        }
                      />
                    </td>

                    {/* Stock Difference */}
                    <td
                      className={`text-center cell--num ${
                        row.stock_difference > 0
                          ? "diff--positive"
                          : row.stock_difference < 0
                          ? "diff--negative"
                          : ""
                      }`}
                    >
                      {row.stock_difference}
                    </td>

                    {/* Stock Value */}
                    <td className="text-center cell--num">{row.stock_value}</td>

                    {/* Actual Consumable */}
                    <td className="text-center cell--num">{row.actual_consumable}</td>

                    {/* Adjust Consumable (editable) */}
                    <td className="text-center">
                      <input
                        type="number"
                        min={0}
                        className="stock-recon-table__input stock-recon-table__input--sm"
                        value={row.adjust_consumable}
                        onChange={(e) =>
                          updateRow(
                            row.product_id,
                            "adjust_consumable",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    {/* Unit */}
                    <td className="text-center cell--unit">{row.unit}</td>

                    {/* Consumable Difference */}
                    <td
                      className={`text-center cell--num ${
                        row.consumable_difference > 0
                          ? "diff--positive"
                          : row.consumable_difference < 0
                          ? "diff--negative"
                          : ""
                      }`}
                    >
                      {row.consumable_difference}
                    </td>

                    {/* Remark (editable) */}
                    <td>
                      <input
                        type="text"
                        className="stock-recon-table__input stock-recon-table__input--remark"
                        placeholder="Remark"
                        value={row.remark}
                        onChange={(e) =>
                          updateRow(row.product_id, "remark", e.target.value)
                        }
                      />
                    </td>

                    {/* Action: per-row save */}
                    <td className="text-center">
                      <button
                        className={`stock-recon-table__save-btn ${
                          row.isSaving ? "saving" : row.isDirty ? "dirty" : ""
                        }`}
                        title="Save this row"
                        disabled={row.isSaving}
                        onClick={() => saveSingleRow(row)}
                      >
                        {row.isSaving ? (
                          <ArrowClockwise size={16} className="spin" />
                        ) : (
                          <FloppyFill size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!isLoading && filteredRows.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          className="stock-recon-page__pagination"
        />
      )}

      {/* ── Footer: Clear All + Update All ── */}
      <div className="stock-recon-page__footer">
        <button
          className="stock-recon-page__btn stock-recon-page__btn--clear"
          onClick={handleClearAll}
        >
          Clear All
        </button>
        <button
          className="stock-recon-page__btn stock-recon-page__btn--update"
          onClick={handleUpdateAll}
          disabled={reconciliationSaving || !hasUnsaved}
        >
          {reconciliationSaving ? "Updating…" : "Update All"}
        </button>
      </div>
    </div>
  );
};

export default StockReconciliationPage;
