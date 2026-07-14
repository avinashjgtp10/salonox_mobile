import React from "react";
import type { PayRun } from "../../../../types/payRun.types";
import ModernTable from "../../../../components/ui/ModernTable";

interface PayRunTableProps {
  data: PayRun[];
  loading: boolean;
  onRowClick: (payRun: PayRun) => void;
  onEdit: (e: React.MouseEvent, payRun: PayRun) => void;
  onDelete: (e: React.MouseEvent, payRun: PayRun) => void;
}

const PayRunTable: React.FC<PayRunTableProps> = ({ data, loading, onRowClick, onEdit, onDelete }) => {
  const columns = [
    {
      header: "Team member",
      key: "employeeName",
      render: (item: PayRun) => {
        const name =
          item.employeeName ||
          (item as any).fullName ||
          (item as any).staffName ||
          ((item as any).first_name
            ? `${(item as any).first_name} ${(item as any).last_name || ""}`.trim()
            : "Unknown member");
        const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
        
        return (
          <div className="d-flex align-items-center gap-3 py-1">
            <div
              className="pay-run-table__avatar rounded-circle d-flex align-items-center justify-content-center fw-bold text-primary bg-light border shadow-sm"
            >
              {initials}
            </div>
            <div className="d-flex flex-column">
              <span className="fw-bold text-dark">{name}</span>
              <div className="d-flex align-items-center gap-2 mt-1">
                <button
                  className="pay-run-table__edit-btn btn btn-link p-0 text-decoration-none text-muted small hover-primary transition-colors"
                  onClick={(e) => onEdit(e, item)}
                >
                  Edit
                </button>
                <span className="pay-run-table__divider text-light">|</span>
                <button
                  className="pay-run-table__delete-btn btn btn-link p-0 text-decoration-none text-danger small transition-colors"
                  onClick={(e) => onDelete(e, item)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Earnings",
      key: "earnings",
      align: "right" as const,
      render: (item: PayRun) => (
        <span className="fw-medium text-dark">₹{(item.earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: "Other",
      key: "other",
      align: "right" as const,
      render: (item: PayRun) => (
        <span className="fw-medium text-muted">₹{(item.other || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: "Total",
      key: "total",
      align: "right" as const,
      render: (item: PayRun) => (
        <span className="fw-bold text-dark">₹{(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: "Paid",
      key: "paid",
      align: "right" as const,
      render: (item: PayRun) => (
        <span className="fw-medium text-success">₹{(item.paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: "To pay",
      key: "toPay",
      align: "right" as const,
      render: (item: PayRun) => (
        <span className="fw-black text-danger">₹{(item.toPay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
  ];

  return (
    <ModernTable
      columns={columns}
      data={data}
      loading={loading}
      onRowClick={onRowClick}
      emptyMessage="No pay runs found for this period."
    />
  );
};

export default PayRunTable;
