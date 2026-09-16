// src/features/catalog/components/AssignMembershipModal.tsx
//
// "Assign to client" — the lightweight counterpart to AddMembershipModal.
// That modal builds a *plan* (pricing type, wallet funding, restrictions);
// this one just tags a client: pick the client, type a membership name, pick
// an expiry date. No price, no payment, no wallet, no sessions.
//
// A client membership still needs a plan row to point at
// (client_memberships.membership_id is NOT NULL), so a free-form name is
// resolved to a zero-price plan of the same name — reused if one already
// exists, so tagging fifty clients "Gold" creates one plan, not fifty. The
// zero price is what keeps the assignment inert: the backend funds the
// membership wallet from the *plan's* price, so a zero-price plan credits
// nothing and this never shows up as spendable balance at checkout.
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Award, X, Trash3 } from "react-bootstrap-icons";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import { DatePicker, Pagination } from "../../../components/ui";
import ClientSearchInput from "../../clients/components/ClientSearchInput";
import type { ClientSearchResult } from "../../clients/components/ClientSearchInput";
import type { AppDispatch } from "../../../store/store";
import api from "../../../services/api/axios";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import type { ClientMembership } from "../../../services/api/endpoints/clientMemberships.endpoints";
import { assignMembership, DEFAULT_COLOUR } from "../utils/assignMembership";
import BulkAssignMembershipPanel from "./BulkAssignMembershipPanel";
import "../styles/AssignMembershipModal.scss";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso(): string {
  return toIso(new Date());
}

function clientLabel(c: ClientSearchResult): string {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unnamed client";
}

function fmt(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : formatDateDDMMYYYY(d);
}

interface Props {
  show: boolean;
  onClose: () => void;
  /** Bumped after a successful assign so the plans list behind refetches —
   *  a brand-new tag name adds a plan row that list should show. */
  onAssigned?: () => void;
}

const AssignMembershipModal: React.FC<Props> = ({ show, onClose, onAssigned }) => {
  const dispatch = useDispatch<AppDispatch>();

  const [mode, setMode]     = useState<"single" | "bulk">("single");
  const [client, setClient] = useState<ClientSearchResult | null>(null);
  const [name, setName]     = useState("");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [assigned, setAssigned] = useState<ClientMembership[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Server-paginated: the list is every membership in the salon, which grows
  // without bound, so it can't be fetched whole. `total` comes from the
  // endpoint's own COUNT, not from assigned.length.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Reset the form every time the modal is reopened — a half-filled previous
  // assignment must not carry over onto the next client.
  useEffect(() => {
    if (!show) return;
    setMode("single");
    setClient(null);
    setName("");
    setExpiry("");
    setError(null);
    setPage(1);
  }, [show]);

  // The "already assigned" list below the form. Fetched unfiltered by status:
  // an expired or cancelled tag stays visible (greyed) rather than silently
  // vanishing — staff need to see it to know it needs renewing. Filtering
  // those out client-side isn't an option now that paging is server-side —
  // the endpoint's `total` counts every status, so dropping rows after the
  // fetch would leave the page showing fewer rows than the pager promises.
  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    setListLoading(true);
    api.get("/api/v1/client-memberships", { params: { page, limit: pageSize } })
      .then((res) => {
        if (cancelled) return;
        setAssigned(res.data?.data?.items ?? []);
        setTotal(Number(res.data?.data?.total ?? 0));
      })
      .catch(() => { if (!cancelled) { setAssigned([]); setTotal(0); } })
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; };
  }, [show, refreshKey, page, pageSize]);

  const canSubmit = Boolean(client && name.trim() && expiry) && !saving;

  const handleAssign = async () => {
    if (!client || !name.trim() || !expiry) return;
    setSaving(true);
    setError(null);
    try {
      await assignMembership(dispatch, {
        clientId: String(client.id),
        name,
        expiryIso: expiry,
      });
      setClient(null);
      setName("");
      setExpiry("");
      // Rows come back purchased_at DESC, so the new one lands at the top of
      // page 1 — jump there, or assigning from page 3 looks like it did nothing.
      setPage(1);
      setRefreshKey((k) => k + 1);
      onAssigned?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Could not assign the membership");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.patch(`/api/v1/client-memberships/${id}/cancel`);
      setRefreshKey((k) => k + 1);
    } catch { /* the row stays; the next refetch reconciles it */ }
  };

  // Cancelling the last row on a page leaves that page empty — step back one
  // rather than showing an empty table with a pager that says there is data.
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [total, pageSize, page]);

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Assign membership to client"
      size="lg"
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Close</Button>
          {/* Bulk drives its own run button — it needs the row counts, and a
              footer action would read as applying to whichever tab is open. */}
          {mode === "single" && (
            <Button variant="primary" onClick={handleAssign} disabled={!canSubmit}>
              {saving ? "Assigning…" : "Assign membership"}
            </Button>
          )}
        </>
      }
    >
      <div className="amm">
        <p className="amm__hint">
          Tags a client with a membership and an expiry date. No price, no payment,
          and no wallet balance — it shows up on the client wherever memberships do.
        </p>

        <div className="amm__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "single"}
            className={`amm__tab ${mode === "single" ? "is-active" : ""}`}
            onClick={() => setMode("single")}
          >
            One client
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "bulk"}
            className={`amm__tab ${mode === "bulk" ? "is-active" : ""}`}
            onClick={() => setMode("bulk")}
          >
            Bulk import
          </button>
        </div>

        {mode === "bulk" ? (
          <BulkAssignMembershipPanel
            onAssigned={() => { setRefreshKey((k) => k + 1); onAssigned?.(); }}
          />
        ) : (
        <>
        <div className="amm__form">
          <div className="amm__field">
            <label className="amm__label">Client</label>
            {client ? (
              <div className="amm__chosen">
                <span className="amm__chosen-name">{clientLabel(client)}</span>
                {client.phone_number && <span className="amm__chosen-sub">{client.phone_number}</span>}
                <button type="button" className="amm__chosen-clear" onClick={() => setClient(null)} aria-label="Change client">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <ClientSearchInput
                placeholder="Search client by name or phone…"
                onSelect={(c) => setClient(c)}
              />
            )}
          </div>

          <div className="amm__field">
            <label className="amm__label">Membership name</label>
            <input
              className="amm__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold, Platinum, VIP"
              maxLength={60}
            />
          </div>

          <div className="amm__field">
            <label className="amm__label">Expires on</label>
            <DatePicker
              value={expiry}
              onChange={setExpiry}
              min={todayIso()}
              placeholder="Pick an expiry date"
            />
          </div>
        </div>

        {error && <div className="amm__error">{error}</div>}
        </>
        )}

        <div className="amm__list">
          <div className="amm__list-head">
            <Award size={14} /> Assigned memberships
          </div>
          {listLoading ? (
            <div className="amm__empty">Loading…</div>
          ) : assigned.length === 0 ? (
            <div className="amm__empty">No memberships assigned yet.</div>
          ) : (
            <table className="amm__table">
              <thead>
                <tr><th>Client</th><th>Membership</th><th>Expires</th><th aria-label="Actions" /></tr>
              </thead>
              {/* data-label feeds the stacked card layout below 560px, where
                  the table collapses to one block per row and each cell prints
                  its own column name — see the stylesheet. */}
              <tbody>
                {assigned.map((m) => (
                  <tr key={m.id} className={m.status === "active" ? "" : "amm__row--inactive"}>
                    <td data-label="Client">{m.clientName || "—"}</td>
                    <td data-label="Membership">
                      <span className="amm__tag" style={{ background: m.colour || DEFAULT_COLOUR }}>
                        {m.membershipName}
                      </span>
                    </td>
                    <td data-label="Expires">{fmt(m.expiresAt)}</td>
                    <td className="amm__td-actions">
                      {/* Cancel only acts on rows that are still active (see the
                          repository's WHERE), so offering it elsewhere would be
                          a button that silently does nothing. */}
                      {m.status === "active" && (
                        <button
                          type="button"
                          className="amm__remove"
                          title="Remove membership"
                          onClick={() => handleRemove(String(m.id))}
                        >
                          <Trash3 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {total > 0 && (
            <div className="amm__pager">
              <Pagination
                currentPage={page}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                pageSizeOptions={[10, 20, 50]}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AssignMembershipModal;
