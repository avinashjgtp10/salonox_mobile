import React from "react";
import { Search } from "react-bootstrap-icons";
import { DateRangeFilter } from "../../../components/ui";
import type { DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";

interface TabToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  /** Omit when a tab genuinely has no per-row date to filter on. */
  dateRange?: {
    value: DateRangeFilterValue;
    onChange: (value: DateRangeFilterValue) => void;
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
      <DateRangeFilter
        value={dateRange.value}
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
