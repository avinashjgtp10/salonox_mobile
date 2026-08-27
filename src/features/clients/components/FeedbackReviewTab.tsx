import React, { useMemo, useState } from "react";
import { StarFill } from "react-bootstrap-icons";
import Pagination from "../../../components/ui/Pagination";
import TabToolbar from "./TabToolbar";
import { useTableSearchSort } from "../hooks/useTableSearchSort";
import type { DateRangeFilterValue } from "../../../components/ui";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

interface ServiceRatingEntry {
  service_name: string;
  staff_name: string | null;
  rating: number;
  comment: string | null;
}

interface FeedbackEntry {
  id: string;
  appointment_id: string | null;
  staff_name: string | null;
  rating: number;
  staff_rating: number | null;
  service_rating: number | null;
  ambience_rating: number | null;
  improvement_tags: string[] | null;
  additional_comments: string | null;
  created_at: string;
  service_ratings: ServiceRatingEntry[];
}

const fmtDMYTime = (iso: string | null) => {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  const date = formatDateDDMMYYYY(d);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
};

const Stars: React.FC<{ value: number | null }> = ({ value }) => {
  if (!value) return <span>–</span>;
  return (
    <span style={{ display: "inline-flex", gap: 1, color: "#f59e0b" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarFill key={i} size={12} style={{ opacity: i < value ? 1 : 0.25 }} />
      ))}
    </span>
  );
};

interface Row {
  id: string;
  entry: FeedbackEntry;
  dateLabel: string;
  createdAt: string;
  servicesLabel: string;
  tagsLabel: string;
  commentsLabel: string;
}

interface FeedbackReviewTabProps {
  entries: FeedbackEntry[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (sz: number) => void;
}

const FeedbackReviewTab: React.FC<FeedbackReviewTabProps> = ({
  entries, page, pageSize, onPageChange, onPageSizeChange,
}) => {
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });

  const rows: Row[] = useMemo(() => entries.map((e) => ({
    id: e.id,
    entry: e,
    dateLabel: fmtDMYTime(e.created_at),
    createdAt: e.created_at,
    servicesLabel: e.service_ratings.map((sr) => `${sr.service_name} (${sr.staff_name || "–"}) ${sr.rating}★`).join(", ") || "–",
    tagsLabel: (e.improvement_tags ?? []).join(", ") || "–",
    commentsLabel: e.additional_comments || "–",
  })), [entries]);

  const { search, setSearch, sortKey, sortDir, toggleSort, filteredSortedRows } = useTableSearchSort<Row>({
    rows, searchFields: ["servicesLabel", "tagsLabel", "commentsLabel"], defaultSortKey: "createdAt",
  });

  const dateFiltered = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return filteredSortedRows;
    const start = new Date(dateRange.startDate + "T00:00:00").getTime();
    const end = new Date(dateRange.endDate + "T23:59:59").getTime();
    return filteredSortedRows.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= start && t <= end;
    });
  }, [filteredSortedRows, dateRange]);

  const paged = dateFiltered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="chp-card">
      <div className="chp-card-header">
        <span className="chp-card-title">Feedback &amp; Review</span>
      </div>
      <TabToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search feedback..."
        dateRange={{ value: dateRange, onChange: setDateRange }}
        exportConfig={{
          title: "Feedback & Review",
          headers: ["Date", "Overall Rating", "Services Rated", "What Can We Improve", "Additional Comments"],
          rows: () => dateFiltered.map((r) => [
            r.dateLabel,
            String(r.entry.rating || "–"),
            r.servicesLabel,
            r.tagsLabel,
            r.commentsLabel,
          ]),
          filename: "feedback-review",
        }}
      />
      {dateFiltered.length === 0 ? (
        <div className="chp-no-data">No feedback submitted yet</div>
      ) : (
        <table className="chp-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("createdAt")} style={{ cursor: "pointer" }}>
                Date {sortKey === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th>Overall</th>
              <th>Services Rated</th>
              <th>What Can We Improve</th>
              <th>Additional Comments</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id}>
                <td>{r.dateLabel}</td>
                <td><Stars value={r.entry.rating} /></td>
                <td>
                  {r.entry.service_ratings.length === 0 ? "–" : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {r.entry.service_ratings.map((sr, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{sr.service_name}{sr.staff_name ? ` (${sr.staff_name})` : ""}</span>
                          <Stars value={sr.rating} />
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td title={r.tagsLabel} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.tagsLabel}
                </td>
                <td>{r.commentsLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {dateFiltered.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={dateFiltered.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

export default FeedbackReviewTab;
