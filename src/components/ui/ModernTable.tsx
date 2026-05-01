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
    <div className="w-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-6 py-4 font-semibold tracking-wider ${getAlignmentClass(col.align)} ${col.className || ""}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{emptyMessage}</h3>
                    <p className="text-gray-500 max-w-xs mt-1">Try adjusting your filters or search terms to find what you're looking for.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr
                  key={item.id || i}
                  onClick={() => onRowClick?.(item)}
                  className={`
                    group transition-colors hover:bg-gray-50/50 
                    ${onRowClick ? "cursor-pointer" : "cursor-default"}
                    ${rowClassName?.(item) || ""}
                  `}
                >
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={`px-6 py-4 text-gray-700 whitespace-nowrap ${getAlignmentClass(col.align)} ${col.className || ""}`}
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
