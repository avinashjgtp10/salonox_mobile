import React, { useMemo, useState } from "react";
import Pagination from "../../../components/ui/Pagination";
import TabToolbar from "./TabToolbar";
import { useTableSearchSort } from "../hooks/useTableSearchSort";

interface CommunicationEntry {
  channel: "whatsapp";
  source: "automation" | "campaign";
  label: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

const fmtDMYTime = (iso: string | null) => {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
};

interface Row {
  id: string;
  campaignName: string;
  sentAtLabel: string;
  deliveryStatus: string;
  readStatus: string;
  createdAt: string;
}

interface CommunicationTabProps {
  entries: CommunicationEntry[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (sz: number) => void;
}

const CommunicationTab: React.FC<CommunicationTabProps> = ({
  entries, page, pageSize, onPageChange, onPageSizeChange,
}) => {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const rows: Row[] = useMemo(() => entries.map((e, i) => ({
    id: `${e.source}-${i}-${e.created_at}`,
    campaignName: e.label,
    sentAtLabel: fmtDMYTime(e.sent_at ?? e.created_at),
    deliveryStatus: e.delivered_at ? "Delivered" : e.status,
    readStatus: e.read_at ? "Read" : "Not read",
    createdAt: e.created_at,
  })), [entries]);

  const { search, setSearch, sortKey, sortDir, toggleSort, filteredSortedRows } = useTableSearchSort<Row>({
    rows, searchFields: ["campaignName", "deliveryStatus"], defaultSortKey: "createdAt",
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
        <span className="chp-card-title">Communication</span>
      </div>
      <TabToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search communication history..."
        dateRange={{ ...dateRange, onChange: (s, e) => setDateRange({ startDate: s, endDate: e }) }}
        exportConfig={{
          title: "Communication History",
          headers: ["Channel", "Campaign Name", "Sent Date & Time", "Delivery Status", "Read Status"],
          rows: () => dateFiltered.map((r) => ["WhatsApp", r.campaignName, r.sentAtLabel, r.deliveryStatus, r.readStatus]),
          filename: "communication-history",
        }}
      />
      {dateFiltered.length === 0 ? (
        <div className="chp-no-data">No WhatsApp communication found</div>
      ) : (
        <table className="chp-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Campaign Name</th>
              <th onClick={() => toggleSort("createdAt")} style={{ cursor: "pointer" }}>
                Sent Date &amp; Time {sortKey === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th>Delivery Status</th>
              <th>Read Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id}>
                <td>WhatsApp</td>
                <td>{r.campaignName}</td>
                <td>{r.sentAtLabel}</td>
                <td>{r.deliveryStatus}</td>
                <td>{r.readStatus}</td>
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
      <div className="chp-comm-unavailable" style={{ marginTop: 12 }}>
        SMS and Email communication history are not available yet — only WhatsApp messaging
        (automated + campaigns) is currently tracked.
      </div>
    </div>
  );
};

export default CommunicationTab;
