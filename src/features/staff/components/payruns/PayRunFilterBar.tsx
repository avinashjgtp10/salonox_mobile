import React from "react";
import { Search, ChevronDown } from "react-bootstrap-icons";

interface PayRunFilterBarProps {
  onSearchChange: (value: string) => void;
  onDateChange: (range: string) => void;
  currentDateRange: string;
}

const PayRunFilterBar: React.FC<PayRunFilterBarProps> = ({ 
  onSearchChange, 
  currentDateRange 
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      <div className="relative w-full sm:w-auto">
        <button className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto min-w-[180px]">
          {currentDateRange}
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>
      
      <div className="relative w-full sm:max-w-xs">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search size={14} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name..."
          className="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export default PayRunFilterBar;
