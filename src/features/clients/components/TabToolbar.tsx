import React from "react";
import { Search } from "react-bootstrap-icons";
import DateRangePicker from "../../../components/ui/DateRangePicker";
import ReportExportButton from "../../../components/ui/ReportExportButton";

interface TabToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  /** Omit when a tab genuinely has no per-row date to filter on. */
  dateRange?: {
    startDate: string;
    endDate: string;
    onChange: (startDate: string, endDate: string) => void;
  };
  exportConfig: {
    title: string;
    headers: string[];
    rows: () => (string | number)[][];
    filename: string;
  };
}

/** Shared search + date-range filter + PDF/Excel/CSV export row, reused by
 *  every Client History tab so all 11 look and behave the same way. */
const TabToolbar: React.FC<TabToolbarProps> = ({
  searchValue, onSearchChange, searchPlaceholder = "Search...",
  dateRange, exportConfig,
}) => (
  <div className="chp-tab-toolbar">
    <div className="chp-tab-toolbar__search">
      <Search size={13} />
      <input
        type="text"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
      />
    </div>
    {dateRange && (
      <DateRangePicker
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        onChange={dateRange.onChange}
      />
    )}
    <ReportExportButton
      title={exportConfig.title}
      headers={exportConfig.headers}
      rows={exportConfig.rows}
      filename={exportConfig.filename}
      variant="button"
      csv
    />
  </div>
);

export default TabToolbar;
