import React from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "react-bootstrap-icons";
import "./styles/Pagination.scss";

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  // Covers both initial-pageSize conventions used across the app (20 and 25) —
  // a controlled <select> whose value has no matching <option> silently falls
  // back to displaying the first option instead, which made several pages'
  // page-size dropdown show a value that didn't match what was actually
  // being fetched until the user picked an option that genuinely existed.
  pageSizeOptions = [10, 20, 25, 50, 100],
  className = "",
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`ui-pagination__btn${currentPage === i ? " ui-pagination__btn--active" : ""}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className={`ui-pagination ${className}`}>
      <div className="ui-pagination__size">
        <span>Rows per page:</span>
        <div className="ui-pagination__size-wrap">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ appearance: "none", backgroundImage: "none" }}
          >
            {pageSizeOptions.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="ui-pagination__size-icon" />
        </div>
      </div>

      <div className="ui-pagination__info">
        Showing {startItem} – {endItem} of {totalItems} results
      </div>

      {totalPages > 1 && (
        <div className="ui-pagination__controls">
          <button
            className="ui-pagination__btn"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          {renderPageButtons()}
          <button
            className="ui-pagination__btn"
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
