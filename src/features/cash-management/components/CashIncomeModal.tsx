import { useEffect, useState } from "react";
import { FormattedDate, Modal } from "../../../components/ui";
import { useCurrency } from "../../../hooks/useCurrency";
import { fetchCashIncomeEntries } from "../cashManagement.api";
import type { CashIncomeEntryRecord } from "../cashManagement.types";

interface Props {
  show: boolean;
  cashManagementId: string | null;
  onClose: () => void;
}

const formatTime = (value: string) => {
  if (!value) return "--";
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return value;
  return next.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

// Drill-down for a counter session's Cash Revenue total — lists every
// individual cash payment (Quick Sale, Calendar/Appointment checkout,
// Package, Membership) that was summed into that figure, so it's not just
// an opaque aggregate number.
export default function CashIncomeModal({ show, cashManagementId, onClose }: Props) {
  const { formatAmount } = useCurrency();
  const [entries, setEntries] = useState<CashIncomeEntryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show || !cashManagementId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchCashIncomeEntries(cashManagementId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ?? err?.message ?? "Failed to load cash payments.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [show, cashManagementId]);

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <Modal show={show} onClose={onClose} title="Cash Payments" size="lg">
      {error ? (
        <div className="cash-mgmt__modal-message cash-mgmt__modal-message--error">{error}</div>
      ) : null}

      {loading ? (
        <div className="cash-mgmt__inline-note">Loading cash payments...</div>
      ) : entries.length === 0 ? (
        <div className="cash-mgmt__empty-state">
          <h3 className="cash-mgmt__empty-title">No cash payments yet</h3>
          <p className="cash-mgmt__empty-text">
            Cash payments from Quick Sale, Calendar, Packages, and Memberships will appear here as
            they come in.
          </p>
        </div>
      ) : (
        <>
          <div className="cash-mgmt__table-shell">
            <table className="cash-mgmt__table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Client</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <FormattedDate value={entry.occurredAt} fallback="--" />{" "}
                      {formatTime(entry.occurredAt)}
                    </td>
                    <td>{entry.source}</td>
                    <td>{entry.clientName}</td>
                    <td>{entry.reference || "--"}</td>
                    <td>{formatAmount(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cash-mgmt__tab-metric" style={{ marginTop: "1rem" }}>
            <span className="cash-mgmt__metric-label">Total Cash Collected</span>
            <span className="cash-mgmt__metric-value">{formatAmount(total)}</span>
          </div>
        </>
      )}
    </Modal>
  );
}
