import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ThreeDotsVertical } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  fetchScheduledMessagesThunk,
  sendNowThunk,
  retryNowThunk,
  rescheduleThunk,
  skipThunk,
  cancelScheduledThunk,
  resendScheduledThunk,
} from "../../../middleware/marketing/scheduled-templates.thunk";
import type { ScheduledMessage, ScheduledMessageStatus } from "../../../types/marketing.types";
import { PageHeader, Input, Button, Modal, Pagination, DateRangeFilter, JiraFilterMenu } from "../../../components/ui";
import type { DateRangeFilterValue, JiraFilterField } from "../../../components/ui";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "../styles/ScheduledTemplatesPage.scss";

const EVENT_LABELS: Record<string, string> = {
  package_expiring_7d:              "Package Expiring (7 Days)",
  package_expiring_24h:             "Package Expiring (Tomorrow)",
  membership_expiring_7d:           "Membership Expiring (7 Days)",
  membership_expiring_24h:          "Membership Expiring (Tomorrow)",
  package_appointment_reminder_24h: "Package Appointment Reminder",
  service_reminder_24h:             "Appointment Reminder",
  birthday_wishes:                  "Birthday Wishes",
  new_year_campaign:                "New Year Campaign",
  pending_payment_reminder:         "Pending Payment Reminder",
  we_miss_you_30d:                  "We Miss You (30 Days)",
  we_miss_you_60d:                  "We Miss You (60 Days)",
  we_miss_you_90d:                  "We Miss You (90 Days)",
};

const STATUS_META: Record<ScheduledMessageStatus, { label: string; dotClass: string }> = {
  SCHEDULED: { label: "Scheduled", dotClass: "st-dot--scheduled" },
  SENDING:   { label: "Sending",   dotClass: "st-dot--scheduled" },
  SENT:      { label: "Sent",      dotClass: "st-dot--sent" },
  FAILED:    { label: "Failed",    dotClass: "st-dot--failed" },
  SKIPPED:   { label: "Skipped",   dotClass: "st-dot--skipped" },
  CANCELLED: { label: "Cancelled", dotClass: "st-dot--skipped" },
};

const STATUS_OPTIONS = [
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "SENT",      label: "Sent" },
  { id: "FAILED",    label: "Failed" },
  { id: "SKIPPED",   label: "Skipped" },
  { id: "CANCELLED", label: "Cancelled" },
];

const EVENT_OPTIONS = Object.entries(EVENT_LABELS).map(([id, label]) => ({ id, label }));

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const date = formatDateDDMMYYYY(d);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
};

// Local date+time value → ISO, for the Reschedule modal (same construction
// CreateCampaignPage.tsx's buildIso() uses for its own schedule picker).
const buildIso = (date: string, time: string): string => {
  if (!date || !time) return "";
  const [year, month, day] = date.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  return new Date(year, month - 1, day, h, m, 0, 0).toISOString();
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type ModalKind = "view" | "reschedule" | "skip" | "cancel" | null;

export default function ScheduledTemplatesPage() {
  const dispatch = useAppDispatch();
  const salonId = useAppSelector((s: any) => s.auth.salonId);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [rows, setRows] = useState<ScheduledMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilterIds, setStatusFilterIds] = useState<string[]>([]);
  const [eventFilterIds, setEventFilterIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [kebabPos, setKebabPos] = useState<{ top: number; right: number } | null>(null);
  const kebabPortalRef = useRef<HTMLUListElement>(null);

  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [modalRow, setModalRow] = useState<ScheduledMessage | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, statusFilterIds, eventFilterIds, dateRange.startDate, dateRange.endDate]);

  const load = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    try {
      const result = await dispatch(fetchScheduledMessagesThunk({
        salonId,
        status:    statusFilterIds[0] || undefined,
        eventType: eventFilterIds[0] || undefined,
        search:    debouncedSearch || undefined,
        dateFrom:  dateRange.startDate || undefined,
        dateTo:    dateRange.endDate || undefined,
        page:      currentPage,
        limit:     pageSize,
      })).unwrap();
      setRows(result.data);
      setTotal(result.total);
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't load scheduled messages");
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch, salonId, statusFilterIds, eventFilterIds, debouncedSearch, dateRange, currentPage, pageSize, showError]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!openRowMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".st-kebab-wrap")) return;
      if (kebabPortalRef.current?.contains(target)) return;
      setOpenRowMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openRowMenuId]);

  const filterFields: JiraFilterField[] = [
    { key: "status", label: "Status", options: STATUS_OPTIONS.map(o => ({ id: o.id, label: o.label })) },
    { key: "event",  label: "Trigger", options: EVENT_OPTIONS.map(o => ({ id: o.id, label: o.label })), searchable: true },
  ];
  const filterMenuSelected = { status: statusFilterIds, event: eventFilterIds };
  const handleFiltersApply = (next: Record<string, string[]>) => {
    // Single-select in practice — picking a new value replaces the old one,
    // same convention as every other report's status/rating filter.
    const status = next.status ?? [];
    const event  = next.event ?? [];
    setStatusFilterIds(status.length ? [status[status.length - 1]] : []);
    setEventFilterIds(event.length ? [event[event.length - 1]] : []);
  };

  const openKebab = (e: React.MouseEvent, row: ScheduledMessage) => {
    const isOpen = openRowMenuId === row.id;
    setOpenRowMenuId(isOpen ? null : row.id);
    if (!isOpen) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setKebabPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
  };

  const closeModal = () => { setModalKind(null); setModalRow(null); setBusy(false); };

  const openReschedule = (row: ScheduledMessage) => {
    const d = new Date(Date.now() + 10 * 60000);
    setRescheduleDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setRescheduleTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setModalRow(row); setModalKind("reschedule");
  };

  const runAction = async (label: string, action: () => Promise<any>) => {
    setBusy(true);
    try {
      await action();
      showSuccess(label);
      closeModal();
      load();
    } catch (err: any) {
      showError(typeof err === "string" ? err : `Couldn't ${label.toLowerCase()}`);
      setBusy(false);
    }
  };

  const handleSendNow = (row: ScheduledMessage) =>
    runAction("Sent", () => dispatch(sendNowThunk({ salonId, id: row.id })).unwrap());
  const handleRetryNow = (row: ScheduledMessage) =>
    runAction("Retried", () => dispatch(retryNowThunk({ salonId, id: row.id })).unwrap());
  const handleReschedule = () => {
    if (!modalRow) return;
    const iso = buildIso(rescheduleDate, rescheduleTime);
    if (!iso) return;
    runAction("Rescheduled", () => dispatch(rescheduleThunk({ salonId, id: modalRow.id, scheduledAt: iso })).unwrap());
  };
  const handleSkip = () => {
    if (!modalRow) return;
    runAction("Skipped", () => dispatch(skipThunk({ salonId, id: modalRow.id })).unwrap());
  };
  const handleCancel = () => {
    if (!modalRow) return;
    runAction("Cancelled", () => dispatch(cancelScheduledThunk({ salonId, id: modalRow.id })).unwrap());
  };
  const handleResend = (row: ScheduledMessage) =>
    runAction("Resent", () => dispatch(resendScheduledThunk({ salonId, id: row.id })).unwrap());

  return (
    <div className="st-page">
      {overlay}
      <PageHeader
        title="Scheduled Templates"
        subtitle="Upcoming and recent automated WhatsApp sends — package/membership expiry, appointment reminders, birthdays, and more"
      />

      <div className="st-toolbar">
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <Input
          containerClass="mb-0 st-search"
          placeholder="Search by phone number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="st-table-wrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Date &amp; Time</th>
              <th>Client</th>
              <th>Message</th>
              <th>Trigger</th>
              <th className="st-actions-col" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="st-skeleton-row" /></tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="st-empty-cell">No scheduled messages found</td></tr>
            ) : rows.map((row) => {
              const meta = STATUS_META[row.status];
              return (
                <tr key={row.id}>
                  <td>
                    <span className={`st-status-dot ${meta.dotClass}`} />
                    {meta.label}
                  </td>
                  <td>{fmtDateTime(row.scheduled_at)}</td>
                  <td>{row.phone_number}</td>
                  <td className="st-message-cell" title={row.message_preview ?? ""}>{row.message_preview || "—"}</td>
                  <td>{EVENT_LABELS[row.event_type] ?? row.event_type}</td>
                  <td className="st-actions-col st-kebab-wrap" onClick={(e) => e.stopPropagation()}>
                    <button className="st-kebab-btn" title="Actions" onClick={(e) => openKebab(e, row)}>
                      <ThreeDotsVertical size={16} />
                    </button>
                    {openRowMenuId === row.id && kebabPos && createPortal(
                      <ul ref={kebabPortalRef} className="st-kebab-menu" style={{ position: "fixed", top: kebabPos.top, right: kebabPos.right }}>
                        {row.status === "SCHEDULED" && (
                          <>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); setModalRow(row); setModalKind("view"); }}>View Details</button></li>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); handleSendNow(row); }}>Send Now</button></li>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); openReschedule(row); }}>Reschedule</button></li>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); setModalRow(row); setModalKind("skip"); }}>Skip This Occurrence</button></li>
                            <li><button className="st-kebab-item st-kebab-item--danger" onClick={() => { setOpenRowMenuId(null); setModalRow(row); setModalKind("cancel"); }}>Cancel Schedule</button></li>
                          </>
                        )}
                        {row.status === "SENT" && (
                          <>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); setModalRow(row); setModalKind("view"); }}>View Message</button></li>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); handleResend(row); }}>Resend</button></li>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); setModalRow(row); setModalKind("view"); }}>View Delivery Status</button></li>
                          </>
                        )}
                        {row.status === "FAILED" && (
                          <>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); setModalRow(row); setModalKind("view"); }}>View Failure Reason</button></li>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); handleRetryNow(row); }}>Retry Now</button></li>
                            <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); openReschedule(row); }}>Reschedule</button></li>
                            <li><button className="st-kebab-item st-kebab-item--danger" onClick={() => { setOpenRowMenuId(null); setModalRow(row); setModalKind("cancel"); }}>Cancel</button></li>
                          </>
                        )}
                        {["SKIPPED", "CANCELLED", "SENDING"].includes(row.status) && (
                          <li><button className="st-kebab-item" onClick={() => { setOpenRowMenuId(null); setModalRow(row); setModalKind("view"); }}>View Details</button></li>
                        )}
                      </ul>,
                      document.body
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}

      {/* View Details / Message / Failure Reason — same read-only modal, content varies by row */}
      <Modal show={modalKind === "view"} onClose={closeModal} title="Scheduled Message">
        {modalRow && (
          <div className="st-view-body">
            <div className="st-view-row"><span>Status</span><strong>{STATUS_META[modalRow.status].label}</strong></div>
            <div className="st-view-row"><span>Scheduled For</span><strong>{fmtDateTime(modalRow.scheduled_at)}</strong></div>
            <div className="st-view-row"><span>Client Phone</span><strong>{modalRow.phone_number}</strong></div>
            <div className="st-view-row"><span>Trigger</span><strong>{EVENT_LABELS[modalRow.event_type] ?? modalRow.event_type}</strong></div>
            {modalRow.message_preview && (
              <div className="st-view-row st-view-row--block"><span>Message</span><p>{modalRow.message_preview}</p></div>
            )}
            {modalRow.failure_reason && (
              <div className="st-view-row st-view-row--block"><span>Failure Reason</span><p className="st-failure-text">{modalRow.failure_reason}</p></div>
            )}
            {modalRow.sent_at && (
              <div className="st-view-row"><span>Sent At</span><strong>{fmtDateTime(modalRow.sent_at)}</strong></div>
            )}
          </div>
        )}
      </Modal>

      {/* Reschedule */}
      <Modal
        show={modalKind === "reschedule"}
        onClose={closeModal}
        title="Reschedule Message"
        footer={
          <div className="d-flex gap-2 w-100">
            <Button variant="outline-dark" fullWidth onClick={closeModal} disabled={busy}>Cancel</Button>
            <Button variant="dark" fullWidth loading={busy} onClick={handleReschedule}>Reschedule</Button>
          </div>
        }
      >
        <div className="st-reschedule-row">
          <div className="st-reschedule-field">
            <label>Date</label>
            <input type="date" min={todayStr()} value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
          </div>
          <div className="st-reschedule-field">
            <label>Time</label>
            <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Skip confirm */}
      <Modal
        show={modalKind === "skip"}
        onClose={closeModal}
        title="Skip this occurrence?"
        footer={
          <div className="d-flex gap-2 w-100">
            <Button variant="outline-dark" fullWidth onClick={closeModal} disabled={busy}>Cancel</Button>
            <Button variant="dark" fullWidth loading={busy} onClick={handleSkip}>Skip</Button>
          </div>
        }
      >
        <p className="text-muted small mb-0">This send will be skipped — no message will go out for it.</p>
      </Modal>

      {/* Cancel confirm */}
      <Modal
        show={modalKind === "cancel"}
        onClose={closeModal}
        title="Cancel this schedule?"
        footer={
          <div className="d-flex gap-2 w-100">
            <Button variant="outline-dark" fullWidth onClick={closeModal} disabled={busy}>Back</Button>
            <Button variant="danger" fullWidth loading={busy} onClick={handleCancel}>Cancel Schedule</Button>
          </div>
        }
      >
        <p className="text-muted small mb-0">This scheduled message will be permanently cancelled. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
