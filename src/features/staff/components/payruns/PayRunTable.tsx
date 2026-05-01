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
      render: (item: PayRun) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
            {item.employeeAvatar || item.employeeName.split(" ").map(n => n[0]).join("").toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900">{item.employeeName}</span>
            <div className="flex items-center gap-2">
              <button 
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                onClick={(e) => onEdit(e, item)}
              >
                Edit
              </button>
              <span className="text-gray-300">|</span>
              <button 
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
                onClick={(e) => onDelete(e, item)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Earnings",
      key: "earnings",
      render: (item: PayRun) => (
        <span className="font-medium">₮{item.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: "Other",
      key: "other",
      render: (item: PayRun) => (
        <span className="font-medium text-gray-600">₮{item.other.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: "Total",
      key: "total",
      render: (item: PayRun) => (
        <span className="font-bold text-gray-900">₮{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: "Paid",
      key: "paid",
      render: (item: PayRun) => (
        <span className="font-medium text-green-600">₮{item.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: "To pay",
      key: "toPay",
      render: (item: PayRun) => (
        <span className="font-bold text-red-600">₮{item.toPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
