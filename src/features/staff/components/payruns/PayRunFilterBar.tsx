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
    <div className="pay-run-filter-bar d-flex flex-column flex-sm-row align-items-sm-center justify-content-between">
      <div className="date-selector d-flex align-items-center justify-content-between gap-3 mb-2 mb-sm-0">
        {currentDateRange}
        <ChevronDown size={14} />
      </div>
      
      <div className="search-input-wrapper w-100">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Search by name..."
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export default PayRunFilterBar;
