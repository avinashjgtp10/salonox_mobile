import React from "react";

interface Column<T> {
  header: React.ReactNode;
  key: keyof T | string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

function Table<T extends { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data available",
  onRowClick,
  rowClassName,
}: TableProps<T>) {
  if (loading) {
    return <div className="text-center p-5 text-muted">Loading data...</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={`border-0 py-3 px-4 fw-bold text-muted small text-uppercase ${col.className || ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-5 text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, i) => (
              <tr 
                key={item.id || i} 
                onClick={() => onRowClick?.(item)}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
                className={rowClassName?.(item) || ""}
              >
                {columns.map((col, j) => (
                  <td key={j} className={`py-3 px-4 border-bottom-0 ${col.className || ""}`}>
                    {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
