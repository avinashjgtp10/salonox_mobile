import React from "react";
import { Search } from "react-bootstrap-icons";

interface Column<T> {
  header: React.ReactNode;
  key: keyof T | string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  width?: string | number;
  align?: "left" | "center" | "right";
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: React.ReactNode;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

function Table<T extends { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage,
  onRowClick,
  rowClassName,
}: TableProps<T>) {
  if (loading) {
    return <div className="text-center p-5 text-muted">Loading data...</div>;
  }

  // Default rich empty state if emptyMessage is not provided or is a string
  const renderEmptyState = () => {
    if (React.isValidElement(emptyMessage)) {
      return emptyMessage;
    }
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: "64px", height: "64px" }}>
          <Search size={24} className="text-muted" />
        </div>
        <h5 className="fw-bold mb-1">{typeof emptyMessage === "string" ? emptyMessage : "No results found"}</h5>
        <p className="text-muted small mb-0">Try changing your filters or search terms</p>
      </div>
    );
  };

  return (
    <div className="table-responsive">
      <table className="table table-hover table-striped align-middle mb-0">
        <thead className="table-light">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`border-0 py-3 px-3 fw-bold small text-uppercase text-dark text-nowrap ${col.className || ""}`}
                style={{
                  letterSpacing: "0.5px",
                  width: col.width,
                  textAlign: col.align || "left",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-5 text-muted border-0"
              >
                {renderEmptyState()}
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
                  <td
                    key={j}
                    className={`py-3 px-3 border-bottom-0 ${col.className || ""}`}
                    style={{ textAlign: col.align || "left" }}
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
  );
}

export default Table;
