import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, PlusLg, PencilSquare, Trash3, ChatSquareText, ThreeDotsVertical, CalendarCheck } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { ENQUIRY } from "../../../services/api/endpoints";
import { Pagination, JiraFilterMenu, Modal, Button, Input } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import EnquiryViewModal from "../components/EnquiryViewModal";
import EnquiryRescheduleModal from "../components/EnquiryRescheduleModal";
import { formatEnquiryId, formatEnquiryDate, formatFollowUpAt, datetimeLocalToIso } from "../utils/enquiryFormat";
import { ENQUIRY_STATUSES, type Enquiry, type EnquiryFormValues } from "../types/enquiry.types";
import "../styles/EnquiriesListPage.scss";

const STATUS_FILTER_FIELDS: JiraFilterField[] = [
  { key: "status", label: "Status", options: ENQUIRY_STATUSES.map((s) => ({ id: s, label: s })) },
];

export default function EnquiriesListPage() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [viewingEnquiry, setViewingEnquiry] = useState<Enquiry | null>(null);
  const [deletingEnquiry, setDeletingEnquiry] = useState<Enquiry | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [reschedulingEnquiry, setReschedulingEnquiry] = useState<Enquiry | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [kebabPos, setKebabPos] = useState<{ top: number; right: number } | null>(null);
  const kebabPortalRef = useRef<HTMLUListElement>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!openRowMenuId) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (kebabPortalRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.(".enq-kebab-btn")) return;
      setOpenRowMenuId(null);
    };
    const onScroll = () => setOpenRowMenuId(null);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openRowMenuId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchEnquiries = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter.length === 1) params.set("status", statusFilter[0]);

      const res = await api.get(ENQUIRY.LIST(params.toString()), { signal: ctrl.signal });
      const data = res.data?.data;
      setEnquiries(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.pagination?.total) || 0);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setEnquiries([]);
        setTotal(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, statusFilter]);

  // The list endpoint only supports a single status value — a multi-select
  // filter (2+ statuses at once) falls back to filtering the current page
  // client-side rather than adding a second server round trip.
  const visibleEnquiries = useMemo(() => {
    if (statusFilter.length <= 1) return enquiries;
    return enquiries.filter((e) => statusFilter.includes(e.status));
  }, [enquiries, statusFilter]);

  const handleStatusChange = async (enquiry: Enquiry, status: EnquiryFormValues["status"]) => {
    if (status === enquiry.status) return;
    setUpdatingStatusId(enquiry.id);
    // Optimistic update — reverted below if the request fails.
    setEnquiries((prev) => prev.map((e) => (e.id === enquiry.id ? { ...e, status } : e)));
    try {
      await api.patch(ENQUIRY.BY_ID(enquiry.id), { status });
    } catch {
      setEnquiries((prev) => prev.map((e) => (e.id === enquiry.id ? { ...e, status: enquiry.status } : e)));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleReschedule = async (followUpAtLocal: string) => {
    if (!reschedulingEnquiry) return;
    setIsRescheduling(true);
    try {
      const follow_up_at = datetimeLocalToIso(followUpAtLocal);
      await api.patch(ENQUIRY.BY_ID(reschedulingEnquiry.id), { follow_up_at });
      setEnquiries((prev) =>
        prev.map((e) => (e.id === reschedulingEnquiry.id ? { ...e, follow_up_at } : e)),
      );
      setReschedulingEnquiry(null);
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEnquiry) return;
    setIsDeleting(true);
    try {
      await api.delete(ENQUIRY.BY_ID(deletingEnquiry.id));
      setDeletingEnquiry(null);
      setDeleteInput("");
      fetchEnquiries();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="enq-page">
      <div className="enq-header">
        <div>
          <h1 className="enq-title">Enquiries</h1>
          <p className="enq-subtitle">Track and follow up on client enquiries</p>
        </div>
        <button type="button" className="enq-btn enq-btn--primary" onClick={() => navigate("/dashboard/enquiries/add")}>
          <PlusLg size={14} /> Create Enquiry
        </button>
      </div>

      <div className="enq-controls">
        <div className="enq-search">
          <Search size={14} className="enq-search__icon" />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <JiraFilterMenu
          fields={STATUS_FILTER_FIELDS}
          selected={{ status: statusFilter }}
          onApply={(next) => setStatusFilter(next.status ?? [])}
        />
      </div>

      <div className="enq-table-wrap">
        <table className="enq-table">
          <thead>
            <tr>
              <th>Enquiry ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Date</th>
              <th>Notes</th>
              <th>Reschedule</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="enq-empty">
                    <p>Loading enquiries…</p>
                  </div>
                </td>
              </tr>
            ) : visibleEnquiries.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="enq-empty">
                    <ChatSquareText size={28} />
                    <p>No enquiries found</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleEnquiries.map((e) => (
                <tr key={e.id} className="enq-table__row" onClick={() => setViewingEnquiry(e)}>
                  <td className="enq-table__id">{formatEnquiryId(e.enquiry_no)}</td>
                  <td>{e.name}</td>
                  <td>{e.phone}</td>
                  <td onClick={(ev) => ev.stopPropagation()}>
                    <select
                      className={`enq-status-badge enq-status-select enq-status-${e.status.toLowerCase().replace(/\s|-/g, "")}`}
                      value={e.status}
                      disabled={updatingStatusId === e.id}
                      onChange={(ev) => handleStatusChange(e, ev.target.value as EnquiryFormValues["status"])}
                    >
                      {ENQUIRY_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{formatEnquiryDate(e.created_at)}</td>
                  <td className="enq-table__notes" title={e.notes ?? undefined}>
                    {e.notes ? (e.notes.length > 30 ? `${e.notes.slice(0, 30)}…` : e.notes) : "—"}
                  </td>
                  <td onClick={(ev) => ev.stopPropagation()}>
                    <button
                      type="button"
                      className="enq-reschedule-btn"
                      onClick={() => setReschedulingEnquiry(e)}
                    >
                      <CalendarCheck size={13} />
                      {e.follow_up_at ? formatFollowUpAt(e.follow_up_at) : "Reschedule"}
                    </button>
                  </td>
                  <td className="enq-actions-cell" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      type="button"
                      className="enq-kebab-btn"
                      title="Actions"
                      onClick={(ev) => {
                        const isOpen = openRowMenuId === e.id;
                        setOpenRowMenuId(isOpen ? null : e.id);
                        if (!isOpen) {
                          const r = ev.currentTarget.getBoundingClientRect();
                          setKebabPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
                        }
                      }}
                    >
                      <ThreeDotsVertical size={16} />
                    </button>
                    {openRowMenuId === e.id && kebabPos && createPortal(
                      <ul
                        ref={kebabPortalRef}
                        className="enq-kebab-menu"
                        style={{ position: "fixed", top: kebabPos.top, right: kebabPos.right, zIndex: 9999 }}
                      >
                        <li>
                          <button type="button" onClick={() => { navigate(`/dashboard/enquiries/edit/${e.id}`); setOpenRowMenuId(null); }}>
                            <PencilSquare size={14} /> Edit
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            className="enq-kebab-menu__item--danger"
                            onClick={() => { setDeletingEnquiry(e); setOpenRowMenuId(null); }}
                          >
                            <Trash3 size={13} /> Delete
                          </button>
                        </li>
                      </ul>,
                      document.body
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

      <EnquiryViewModal
        show={!!viewingEnquiry}
        onClose={() => setViewingEnquiry(null)}
        enquiry={viewingEnquiry}
      />

      <EnquiryRescheduleModal
        show={!!reschedulingEnquiry}
        enquiry={reschedulingEnquiry}
        onClose={() => setReschedulingEnquiry(null)}
        onSave={handleReschedule}
        saving={isRescheduling}
      />

      <Modal
        show={!!deletingEnquiry}
        onClose={() => { setDeletingEnquiry(null); setDeleteInput(""); }}
        title="Delete enquiry?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE" || isDeleting}
              loading={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => { setDeletingEnquiry(null); setDeleteInput(""); }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          Are you sure you want to delete this enquiry? This operation can't be undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>
    </div>
  );
}
