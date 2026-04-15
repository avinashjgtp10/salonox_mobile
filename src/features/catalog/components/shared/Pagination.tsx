import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="slp__pagination">
      <div className="slp__pagination-info">
        Showing {startItem}–{endItem} of {totalItems} service
        {totalItems !== 1 ? "s" : ""}
      </div>

      <div className="slp__pagination-controls">
        <button
          className="slp__pg-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <div className="slp__pg-numbers">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - currentPage) <= 2)
            .map((p) => (
              <button
                key={p}
                className={`slp__pg-num ${currentPage === p ? "active" : ""}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            ))}
        </div>
        <button
          className="slp__pg-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>

      <div className="slp__page-size">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[10, 25, 50, 100].map((sz) => (
            <option key={sz} value={sz}>
              {sz} per page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Pagination;
