import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { OPEN_RATE_REPORT } from "../../../services/api/endpoints";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { SkeletonTableRows } from "./ReportSkeleton";
import type { OpenRateRow } from "./OpenRateReport";
import {
  MESSAGE_STATUS_LABELS as STATUS_LABELS, formatDate,
  formatDateTime as fmtDateTime, fmtPct,
} from "./campaignReportShared";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
}

interface Detail {
  name: string;
  status: string;
  channel: string;
  createdAt: string;
  templateName: string;
  messageBody: string;
  totalContacts: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  blocked: number;
  openRate: number;
}

// Customer-list tabs. "All" carries no status so the backend returns every
// recipient; the rest map to a single wa_campaign_contacts.status. These
// filter the LIST only — the header figures above stay whole-campaign, so
// switching tabs never appears to change the campaign's open rate.
const TABS = [
  { id: "", label: "All Recipients" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "READ", label: "Opened" },
  { id: "FAILED", label: "Failed" },
  { id: "BLOCKED", label: "Blocked" },
];

const statusClass = (s: string) =>
  s === "READ" ? "ok" : s === "DELIVERED" ? "run" : s === "FAILED" || s === "BLOCKED" ? "fail" : "neutral";

export default function OpenRateDetailModal({ campaign, onClose }: { campaign: OpenRateRow; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState("");
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [tab, debouncedSearch]);

  // Escape closes, matching the app's other modals.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fetchDetail = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = { campaign_id: campaign.id, page, limit: pageSize };
      if (tab) body.status = tab;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(OPEN_RATE_REPORT.CAMPAIGN_DETAIL(), body, { signal: ctrl.signal });
      const d = res.data?.data ?? {};
      setDetail({
        name: d.name || campaign.name,
        status: d.status || campaign.status,
        channel: d.channel || campaign.channel,
        createdAt: d.created_at || campaign.createdAt,
        templateName: d.template_name || "—",
        messageBody: d.message_body || "",
        totalContacts: Number(d.total_contacts) || 0,
        sent: Number(d.sent) || 0,
        delivered: Number(d.delivered) || 0,
        opened: Number(d.opened) || 0,
        failed: Number(d.failed) || 0,
        blocked: Number(d.blocked) || 0,
        openRate: Number(d.open_rate) || 0,
      });
      setCustomers((d.customers ?? []).map((c: any) => ({
        id: String(c.id ?? ""),
        name: c.name || "—",
        phone: c.phone || "—",
        status: c.status || "—",
        sentAt: c.sent_at ?? null,
        deliveredAt: c.delivered_at ?? null,
        readAt: c.read_at ?? null,
        errorMessage: c.error_message ?? null,
      })));
      setTotal(Number(d.customers_pagination?.total) || 0);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setCustomers([]); setTotal(0);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [campaign, tab, debouncedSearch, page, pageSize]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const HEADERS = ["Customer Name", "Mobile", "Sent Date", "Delivered Date", "Opened Date", "Status"];
  const exportRows = () => customers.map((c) => [
    c.name, c.phone, fmtDateTime(c.sentAt), fmtDateTime(c.deliveredAt), fmtDateTime(c.readAt),
    STATUS_LABELS[c.status] ?? c.status,
  ]);

  return (
    <div className="rp-camp-modal-backdrop" onMouseDown={onClose}>
      <div className="rp-camp-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="rp-camp-modal__head">
          <div>
            <div className="rp-camp-modal__title">{detail?.name ?? campaign.name}</div>
            <div className="rp-camp-modal__sub">
              {campaign.channel === "whatsapp" ? "WhatsApp" : campaign.channel}
              {" · "}{detail?.templateName ?? "—"}
              {" · "}{campaign.createdAt ? formatDate(campaign.createdAt) : "—"}
            </div>
          </div>
          <div className="rp-camp-modal__head-actions">
            <ReportExportButton
              title={`Open Rate — ${detail?.name ?? campaign.name}`}
              headers={HEADERS}
              rows={exportRows}
              filename={`Open Rate - ${detail?.name ?? campaign.name}`}
              variant="button"
              csv
              summaryLines={[
                `Total Recipients: ${detail?.totalContacts ?? 0}`,
                `Delivered: ${detail?.delivered ?? 0}`,
                `Opened: ${detail?.opened ?? 0}`,
                `Failed: ${detail?.failed ?? 0}`,
                `Open Rate: ${fmtPct(detail?.openRate ?? 0)}`,
              ]}
            />
            <button type="button" className="rp-camp-modal__close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="rp-camp-modal__body">
          <div className="rp-camp-modal__stats">
            <div className="rp-camp-mstat"><span>{detail?.totalContacts ?? 0}</span><label>Total Recipients</label></div>
            <div className="rp-camp-mstat"><span>{detail?.sent ?? 0}</span><label>Sent</label></div>
            <div className="rp-camp-mstat"><span>{detail?.delivered ?? 0}</span><label>Delivered</label></div>
            <div className="rp-camp-mstat"><span>{detail?.opened ?? 0}</span><label>Opened</label></div>
            <div className="rp-camp-mstat"><span>{detail?.failed ?? 0}</span><label>Failed</label></div>
            <div className="rp-camp-mstat rp-camp-mstat--hero"><span>{fmtPct(detail?.openRate ?? 0)}</span><label>Open Rate</label></div>
          </div>

          {detail?.messageBody && (
            <div className="rp-camp-modal__message">
              <div className="rp-camp-modal__message-label">Message Content</div>
              <pre>{detail.messageBody}</pre>
            </div>
          )}

          <div className="rp-camp-modal__tabs">
            {TABS.map((t) => (
              <button key={t.id || "all"} type="button"
                className={`rp-camp-tab${tab === t.id ? " rp-camp-tab--on" : ""}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
            <div className="rp-camp-modal__search">
              <Search size={13} className="rp-detail-search-ic" />
              <input type="text" className="rp-detail-search-input"
                placeholder="Search name or mobile"
                value={search} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
          </div>

          <div className="rp-detail-table-wrap">
            <table className="rp-detail-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile</th>
                  <th>Sent Date</th>
                  <th>Delivered Date</th>
                  <th>Opened Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTableRows columns={6} />
                ) : customers.length === 0 ? (
                  <tr><td colSpan={6} className="rp-detail-empty-cell">No recipients match this filter</td></tr>
                ) : customers.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{fmtDateTime(c.sentAt)}</td>
                    <td>{fmtDateTime(c.deliveredAt)}</td>
                    <td>{fmtDateTime(c.readAt)}</td>
                    <td>
                      <span className={`rp-wac-status rp-wac-status--${statusClass(c.status)}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                      {c.errorMessage && <div className="rp-camp-err">{c.errorMessage}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={page} pageSize={pageSize} totalItems={total}
            onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        </div>
      </div>
    </div>
  );
}
