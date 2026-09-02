// Split a bill's Tip across the different staff members who worked on it
// (e.g. Rahul got ₹50 for the haircut, Priya got ₹100 for the facial) —
// purely a local editor over the parent's tipBreakdown state, no API call of
// its own (the breakdown is only persisted when the whole appointment/sale
// is saved, same as every other Charges & Discounts field). Each staff
// member's tip is typed directly into their own field here — there's no
// pre-set total to divide up; the overall Tip is simply the sum of what's
// entered per person (see AppointmentModal's handleSaveStaffTips).
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

/** One service/package/product/membership row a staff member is handling on
 *  this bill — shown under their name so it's clear what the tip is for. */
export interface StaffTipLineItem {
  label: string;
  amount: number;
}

interface Props {
  /** Every staff member currently assigned to a row on this bill, with what
   *  they're handling — the popup can only attribute a tip to someone
   *  actually involved in the sale. */
  staffOptions: { staffId: string; staffName: string; items: StaffTipLineItem[] }[];
  initialBreakdown: StaffTipEntry[];
  currencySymbol: string;
  onClose: () => void;
  onSave: (entries: StaffTipEntry[]) => void;
}

export default function StaffTipsModal({ staffOptions, initialBreakdown, currencySymbol, onClose, onSave }: Props) {
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

  // Composed bottom-up from whatever's typed below — there is no separate,
  // independently-editable total; this IS the total.
  const totalTip = staffOptions.reduce((sum, s) => sum + (parseFloat(amounts[s.staffId]) || 0), 0);

  function handleAmountChange(staffId: string, raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    if (cleaned === "") { setAmounts((prev) => ({ ...prev, [staffId]: "" })); return; }
    const value = Math.max(0, Number(cleaned) || 0);
    setAmounts((prev) => ({ ...prev, [staffId]: String(value) }));
  }

  function handleSave() {
    // Blank/untouched fields are ₹0 — filtered out here rather than saved as
    // explicit zero entries, same convention the old split used.
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
          ) : (
            <>
              <p className="stm-hint">Enter a tip for each staff member — leave blank for {currencySymbol}0.</p>
              {staffOptions.map((s, idx) => (
                <div key={s.staffId} className="stm-row">
                  <div className="stm-row__who">
                    <span className="stm-row__name">{s.staffName}</span>
                    <span className="stm-row__items">
                      {s.items.map((it, i) => (
                        <span key={i} className="stm-row__item">
                          {it.label} — {currencySymbol}{it.amount.toFixed(2)}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="stm-row__input-wrap">
                    <span className="stm-pfx">{currencySymbol}</span>
                    <input
                      type="text" inputMode="decimal"
                      placeholder="0"
                      value={amounts[s.staffId] ?? ""}
                      onChange={(e) => handleAmountChange(s.staffId, e.target.value)}
                      autoFocus={idx === 0}
                    />
                  </div>
                </div>
              ))}
              <div className="stm-total">
                <span>Total Tip</span>
                <span>{currencySymbol}{totalTip.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        <div className="stm-actions">
          <button className="stm-btn stm-btn--outline" onClick={onClose}>Cancel</button>
          <button
            className="stm-btn stm-btn--dark"
            onClick={handleSave}
            disabled={staffOptions.length === 0}
          >
            Save Split
          </button>
        </div>
      </div>
    </div>
  );
}
