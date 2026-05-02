import React from "react";
import { Loader } from "./Loader";

interface Column<T> {
  header: React.ReactNode;
  key: keyof T | string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  width?: string | number;
  align?: "left" | "center" | "right";
}

interface ModernTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: React.ReactNode;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

function ModernTable<T extends { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  onRowClick,
  rowClassName,
}: ModernTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
        <Loader size="lg" />
        <p className="mt-4 text-gray-500 font-medium">Loading your data...</p>
      </div>
    );
  }

  const getAlignmentClass = (align?: string) => {
    switch (align) {
      case "center": return "text-center";
      case "right": return "text-right";
      default: return "text-left";
    }
  };

  return (
    <div className="w-100 overflow-hidden bg-white border-top">
      <div className="table-responsive">
        <table className="table table-hover mb-0 text-sm align-middle">
          <thead className="bg-light">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-4 py-3 border-bottom-0 text-muted small fw-bold text-uppercase tracking-wider ${getAlignmentClass(col.align)} ${col.className || ""}`}
                  style={{ width: col.width, fontSize: '11px' }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="border-top-0">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-5 text-center">
                  <div className="d-flex flex-column align-items-center justify-content-center py-5">
                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
                      <svg width="32" height="32" className="text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h5 className="fw-bold text-dark mb-1">{emptyMessage}</h5>
                    <p className="text-muted small mb-0">Try adjusting your filters or search terms.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr
                  key={item.id || i}
                  onClick={() => onRowClick?.(item)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  className={rowClassName?.(item) || ""}
                >
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={`px-4 py-3 text-dark border-bottom-0 ${getAlignmentClass(col.align)} ${col.className || ""}`}
                    >
                      {col.render
                        ? col.render(item)
                        : (item[col.key as keyof T] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ModernTable;
