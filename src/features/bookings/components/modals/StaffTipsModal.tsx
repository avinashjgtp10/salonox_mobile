// Split a single bill's Tip across the different staff members who actually
// worked on it (e.g. Rahul got ₹50 for the haircut, Priya got ₹100 for the
// facial) — purely a local editor over the parent's tipBreakdown state, no
// API call of its own (the breakdown is only persisted when the whole
// appointment/sale is saved, same as every other Charges & Discounts field).
// Popup-over-calendar pattern, same shell as EwalletTopupModal/QuickEditClientModal.
import { useEffect, useState } from "react";
import { X } from "react-bootstrap-icons";
import "../../../clients/styles/ClientHistoryModal.scss";
import "./StaffTipsModal.scss";

export interface StaffTipEntry {
  staffId: string;
  staffName: string;
  amount: number;
}

interface Props {
  /** Every staff member currently assigned to a service/package/product/
   *  membership row on this bill — the popup can only attribute a tip to
   *  someone actually involved in the sale. */
  staffOptions: { staffId: string; staffName: string }[];
  initialBreakdown: StaffTipEntry[];
  /** The Tip amount already typed into the Charges & Discounts field — the
   *  split is a BREAKDOWN of that figure, not a second, independent number,
   *  so no individual entry (and no running total) may exceed it. */
  tipTotal: number;
  currencySymbol: string;
  onClose: () => void;
  onSave: (entries: StaffTipEntry[]) => void;
}

export default function StaffTipsModal({ staffOptions, initialBreakdown, tipTotal, currencySymbol, onClose, onSave }: Props) {
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    staffOptions.forEach((s) => {
      const existing = initialBreakdown.find((b) => b.staffId === s.staffId);
      seed[s.staffId] = existing && existing.amount > 0 ? String(existing.amount) : "";
    });
    return seed;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalTip = staffOptions.reduce((sum, s) => sum + (parseFloat(amounts[s.staffId]) || 0), 0);
  const remaining = Math.max(0, tipTotal - totalTip);

  function handleAmountChange(staffId: string, raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    if (cleaned === "") { setAmounts((prev) => ({ ...prev, [staffId]: "" })); return; }
    const requested = Number(cleaned) || 0;
    // Everyone ELSE's already-entered amount is off-limits — this field can
    // only ever take up to whatever's left of tipTotal, same clamp-on-input
    // pattern the rest of this codebase uses for capped numeric fields
    // (e.g. eWallet/membership redemption amounts).
    const othersTotal = staffOptions.reduce(
      (sum, s) => s.staffId === staffId ? sum : sum + (parseFloat(amounts[s.staffId]) || 0),
      0,
    );
    const maxAllowed = Math.max(0, tipTotal - othersTotal);
    const clamped = Math.min(requested, maxAllowed);
    setAmounts((prev) => ({ ...prev, [staffId]: String(clamped) }));
  }

  function handleSave() {
    const entries: StaffTipEntry[] = staffOptions
      .map((s) => ({ staffId: s.staffId, staffName: s.staffName, amount: parseFloat(amounts[s.staffId]) || 0 }))
      .filter((e) => e.amount > 0);
    onSave(entries);
    onClose();
  }

  return (
    <div className="chm-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="chm-panel stm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="stm-header">
          <h3>Staff Tips</h3>
          <button className="stm-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="stm-body">
          {staffOptions.length === 0 ? (
            <p className="stm-empty">Assign staff to a service, package, product, or membership row first — then their name shows up here to give them a tip.</p>
          ) : tipTotal <= 0 ? (
            <p className="stm-empty">Enter a Tip amount in Charges &amp; Discounts first — then split it here across staff.</p>
          ) : (
            <>
              <p className="stm-hint">Split the {currencySymbol}{tipTotal.toFixed(2)} Tip already entered below across staff — the amounts can&rsquo;t add up to more than that.</p>
              {staffOptions.map((s) => (
                <div key={s.staffId} className="stm-row">
                  <span className="stm-row__name">{s.staffName}</span>
                  <div className="stm-row__input-wrap">
                    <span className="stm-pfx">{currencySymbol}</span>
                    <input
                      type="text" inputMode="decimal"
                      placeholder="0"
                      value={amounts[s.staffId] ?? ""}
                      onChange={(e) => handleAmountChange(s.staffId, e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <div className="stm-total">
                <span>Total Tip</span>
                <span>{currencySymbol}{totalTip.toFixed(2)} / {currencySymbol}{tipTotal.toFixed(2)}</span>
              </div>
              {remaining > 0 && (
                <p className="stm-hint stm-hint--remaining">{currencySymbol}{remaining.toFixed(2)} left to allocate.</p>
              )}
            </>
          )}
        </div>

        <div className="stm-actions">
          <button className="stm-btn stm-btn--outline" onClick={onClose}>Cancel</button>
          <button
            className="stm-btn stm-btn--dark"
            onClick={handleSave}
            disabled={staffOptions.length === 0 || tipTotal <= 0}
          >
            Save Split
          </button>
        </div>
      </div>
    </div>
  );
}
