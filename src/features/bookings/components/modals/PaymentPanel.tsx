import React, { useState } from "react";
import type { SingleMethod, SplitEntry } from "../../types";
import "../../styles/AppointmentModal.scss";
import { SINGLE_METHODS } from "../../types";
import { currencySymbol } from "../../utils/currency";

interface Props {
  // Totals
  effectiveTotal: number;
  remainingDue: number;
  alreadyPaid: number;
  grandTotal: number;

  // eWallet
  eWalletBalance: number;
  useEWallet: boolean;
  eWalletAmt: number;
  eWalletMaxAmt: number;
  onToggleEWallet: (v: boolean) => void;
  onSetEWalletAmt: (v: number) => void;

  // Membership wallet (automatic, not a toggle)
  membershipWalletUsed?: number;
  membershipWalletRemaining?: number;

  // Coupon
  couponInput: string;
  onCouponInputChange: (v: string) => void;
  onApplyCoupon: () => void;
  couponDiscount: number;
  couponMessage: string;
  couponError: string;
  couponLoading: boolean;

  // Referral code — only shown for a genuinely new client (no prior visits,
  // no referrer already linked); can only ever be applied once.
  showReferral?: boolean;
  referralInput?: string;
  onReferralInputChange?: (v: string) => void;
  onApplyReferral?: () => void;
  referralApplied?: boolean;
  referralMessage?: string;
  referralError?: string;
  referralLoading?: boolean;
  // Live preview of the actual ₹ discount this bill will get (0 if linked but
  // the bill doesn't meet min_bill_amount yet) — lets the success message say
  // whether a discount actually applied instead of just "code applied".
  referralDiscount?: number;
  referralMinBillAmount?: number;
  referralRewardAmount?: number;

  // Payment method
  paymentMode: "single" | "split";
  onSetPaymentMode: (m: "single" | "split") => void;
  singleMethod: SingleMethod | null;
  onSetSingleMethod: (m: SingleMethod) => void;
  splitEntries: SplitEntry[];
  onSetSplitEntries: (entries: SplitEntry[]) => void;
  payMethodError: boolean;

  // Partial amount (single mode)
  partialAmtInput: string;
  onSetPartialAmt: (v: string) => void;

  // Clear prior due — one row per other outstanding booking (by date), so
  // staff can pick specific ones instead of an all-or-nothing toggle.
  priorDueAmt: number;
  priorDueBookings: { id: string; date: string; dueAmount: number }[];
  selectedDueIds: Set<string>;
  isAllDueSelected: boolean;
  onToggleAllDue: (checked: boolean) => void;
  onToggleOneDue: (id: string) => void;

  // Print
  printAfterPayment: boolean;
  onTogglePrint: (v: boolean) => void;

  // Rewards preview
  previewPoints: number;
  previewWalletCredit: number;

  frozen?: boolean;
}

const EWALLET_MINIMUM = 100;

export const PaymentPanel: React.FC<Props> = ({
  remainingDue, alreadyPaid,
  eWalletBalance, useEWallet, eWalletAmt, eWalletMaxAmt, onToggleEWallet, onSetEWalletAmt,
  membershipWalletUsed = 0, membershipWalletRemaining,
  couponInput, onCouponInputChange, onApplyCoupon,
  couponMessage, couponError, couponLoading,
  showReferral = false, referralInput = "", onReferralInputChange, onApplyReferral,
  referralApplied = false, referralMessage = "", referralError = "", referralLoading = false,
  referralDiscount = 0, referralMinBillAmount = 0, referralRewardAmount = 0,
  paymentMode, onSetPaymentMode,
  singleMethod, onSetSingleMethod,
  splitEntries, onSetSplitEntries, payMethodError,
  partialAmtInput, onSetPartialAmt,
  priorDueAmt, priorDueBookings, selectedDueIds, isAllDueSelected, onToggleAllDue, onToggleOneDue,
  printAfterPayment, onTogglePrint,
  previewPoints, previewWalletCredit,
  frozen,
}) => {
  // priorDueAmt is already the sum of only the SELECTED prior bookings (0 when
  // none are checked), so this collapses to remainingDue with nothing selected.
  const totalToCollect = remainingDue + priorDueAmt;

  // Checked by default. Decoupled from partialAmtInput so unchecking can show a
  // blank field (nothing typed yet) instead of forcing the field to always show
  // some value — partialAmtInput stays "" (→ pay the full amount) until the user
  // actually types a custom figure.
  const [fullChecked, setFullChecked] = useState(true);

  return (
    <div className="payment-panel">
      {/* Rewards preview — credited straight to eWallet, not a separate points balance */}
      {previewPoints > 0 && (
        <div className="pay-rewards">
          Earn <strong>{currencySymbol}{previewWalletCredit.toFixed(2)}</strong> to wallet on this visit
        </div>
      )}

      {/* Coupon */}
      {!frozen && alreadyPaid === 0 && (
        <div className="pay-coupon">
          <label className="pay-coupon__label">COUPON CODE</label>
          <div className="pay-coupon__row">
            <input
              className="form-control-custom"
              placeholder="SAVE10, FLAT50, NEW20"
              value={couponInput}
              onChange={(e) => onCouponInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onApplyCoupon()}
              disabled={couponLoading}
            />
            <button className="btn btn-dark" onClick={onApplyCoupon} disabled={couponLoading}>
              {couponLoading ? "…" : "Apply"}
            </button>
          </div>
          {couponMessage && <div className="pay-coupon__msg success">{couponMessage}</div>}
          {couponError   && <div className="pay-coupon__msg error">{couponError}</div>}
        </div>
      )}

      {/* Referral code — new client, first visit only */}
      {!frozen && alreadyPaid === 0 && showReferral && (
        <div className="pay-coupon">
          <label className="pay-coupon__label">REFERRAL CODE</label>
          <div className="pay-coupon__row">
            <input
              className="form-control-custom"
              placeholder="e.g. NIS1126"
              value={referralInput}
              onChange={(e) => onReferralInputChange?.(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onApplyReferral?.()}
              disabled={referralLoading || referralApplied}
            />
            <button className="btn btn-dark" onClick={onApplyReferral} disabled={referralLoading || referralApplied}>
              {referralLoading ? "…" : referralApplied ? "Applied" : "Apply"}
            </button>
          </div>
          {referralMessage && (
            referralDiscount > 0 ? (
              <div className="pay-coupon__msg success">
                {currencySymbol}{referralDiscount.toFixed(2)} referral discount applied to this bill!
              </div>
            ) : referralMinBillAmount > 0 ? (
              <div className="pay-coupon__msg warning">
                Minimum bill for an instant discount is {currencySymbol}{referralMinBillAmount.toFixed(2)} — {currencySymbol}{referralRewardAmount.toFixed(2)} will be added to your eWallet instead.
              </div>
            ) : (
              <div className="pay-coupon__msg success">{referralMessage}</div>
            )
          )}
          {referralError   && <div className="pay-coupon__msg error">{referralError}</div>}
        </div>
      )}

      {/* eWallet */}
      {eWalletBalance >= EWALLET_MINIMUM && !frozen && (
        <div className={`pay-ewallet${useEWallet ? " pay-ewallet--active" : ""}`}>
          <label
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}
            onClick={() => onToggleEWallet(!useEWallet)}
          >
            <input type="checkbox" checked={useEWallet} readOnly />
            <span>Use eWallet (Available: {currencySymbol}{eWalletBalance.toFixed(2)})</span>
          </label>
          {useEWallet && (
            <div className="pay-due-row__field" onClick={(e) => e.stopPropagation()}>
              <span className="pay-due-row__symbol">{currencySymbol}</span>
              <input
                type="number"
                className="pay-due-row__input"
                min={0}
                max={eWalletMaxAmt}
                step={0.01}
                value={eWalletAmt || ""}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") { onSetEWalletAmt(0); return; }
                  const val = parseFloat(raw);
                  if (!isNaN(val)) onSetEWalletAmt(val);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Membership wallet — automatic, informational only */}
      {membershipWalletUsed > 0 && (
        <div className="pay-ewallet pay-ewallet--active" style={{ cursor: "default" }}>
          <span>Membership Wallet Applied</span>
          <span className="pay-ewallet__deducted">-{currencySymbol}{membershipWalletUsed.toFixed(2)}</span>
          {membershipWalletRemaining != null && (
            <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
              Remaining Balance: {currencySymbol}{membershipWalletRemaining.toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* Clear prior due — pick specific outstanding bookings by date */}
      {!frozen && priorDueBookings.length > 0 && (
        <div style={{ borderTop: "1px solid #fde68a", background: "#fff7ed" }}>
          <div
            onClick={() => onToggleAllDue(!isAllDueSelected)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", cursor: "pointer", userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox" checked={isAllDueSelected}
                onChange={(e) => onToggleAllDue(e.target.checked)}
                style={{ accentColor: "#f59e0b", width: 15, height: 15 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                  🔔 Clear Pending Due{priorDueAmt > 0 ? ` — ${currencySymbol}${priorDueAmt.toFixed(2)} selected` : ""}
                </div>
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 1 }}>
                  Client has unpaid balance from {priorDueBookings.length} previous visit{priorDueBookings.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            {priorDueAmt > 0 && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#78350f" }}>Total to collect</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#92400e" }}>
                  {currencySymbol}{totalToCollect.toFixed(2)}
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "0 14px 10px" }}>
            {priorDueBookings.map((b) => (
              <label
                key={b.id}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 8, padding: "6px 8px", marginTop: 4, borderRadius: 6,
                  background: selectedDueIds.has(b.id) ? "#fef3c7" : "#ffffff",
                  border: "1px solid #fde68a", cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#78350f" }}>
                  <input
                    type="checkbox" checked={selectedDueIds.has(b.id)}
                    onChange={() => onToggleOneDue(b.id)}
                    style={{ accentColor: "#f59e0b", width: 14, height: 14 }}
                  />
                  {b.date}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                  {currencySymbol}{b.dueAmount.toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Payment method */}
      {!frozen && (
        <div className="pay-method">
          <label className="pay-method__label">PAYMENT METHOD <span className="req">*</span></label>

          {/* Single / Split toggle */}
          <div className="pay-method__mode">
            {(["single", "split"] as const).map((mode) => (
              <button
                key={mode}
                className={paymentMode === mode ? "active" : ""}
                onClick={() => onSetPaymentMode(mode)}
              >
                {mode === "single" ? "Single" : "Split"}
              </button>
            ))}
          </div>

          {paymentMode === "single" ? (
            <>
              <div className="pay-method__options">
                {SINGLE_METHODS.map((m) => (
                  <button
                    key={m}
                    className={`${singleMethod === m ? "active" : ""}${payMethodError ? " error" : ""}`}
                    onClick={() => onSetSingleMethod(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {payMethodError && (
                <div className="pay-method__error">Please select a payment method to continue.</div>
              )}
              {/* Due amount row */}
              {totalToCollect > 0 && (
                <div className="pay-due-row">
                  <span className="pay-due-row__label">Due —</span>
                  <div className="pay-due-row__field">
                    <span className="pay-due-row__symbol">{currencySymbol}</span>
                    <input
                      type="number"
                      className="pay-due-row__input"
                      min={0}
                      step={0.01}
                      placeholder={totalToCollect.toFixed(2)}
                      value={fullChecked ? totalToCollect.toFixed(2) : partialAmtInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") { setFullChecked(false); onSetPartialAmt(""); return; }
                        const val = parseFloat(raw);
                        // Typing the full due amount back in re-checks "Full" automatically.
                        if (!isNaN(val) && val === totalToCollect) {
                          setFullChecked(true);
                          onSetPartialAmt("");
                          return;
                        }
                        setFullChecked(false);
                        onSetPartialAmt(!isNaN(val) && val > totalToCollect ? totalToCollect.toFixed(2) : raw);
                      }}
                    />
                  </div>
                  <label className="pay-due-row__full-label">
                    <input
                      type="checkbox"
                      className="pay-due-row__full-check"
                      checked={fullChecked}
                      onChange={(e) => {
                        setFullChecked(e.target.checked);
                        // Both "Full" (checked) and "not yet typed" (unchecked, blank)
                        // map to "" internally → payment logic treats it as the full
                        // amount until the user actually types a custom figure.
                        onSetPartialAmt("");
                      }}
                    />
                    Full
                  </label>
                </div>
              )}
            </>
          ) : (
            /* Split entries */
            <div className="pay-split">
              {splitEntries.map((entry, i) => (
                <div key={i} className="pay-split__row">
                  <div className="pay-split__methods">
                    {SINGLE_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`pay-split__method-btn${entry.method === m ? " active" : ""}`}
                        onClick={() => {
                          const updated = [...splitEntries];
                          updated[i] = { ...entry, method: m };
                          onSetSplitEntries(updated);
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="pay-split__amt-field">
                    <span className="pay-split__symbol">{currencySymbol}</span>
                    <input
                      type="number"
                      className="pay-split__input"
                      min={0}
                      step={0.01}
                      placeholder="Amount"
                      value={entry.amount}
                      onChange={(e) => {
                        const updated = [...splitEntries];
                        updated[i] = { ...entry, amount: e.target.value };
                        onSetSplitEntries(updated);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="pay-split__remove"
                    onClick={() => onSetSplitEntries(splitEntries.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="pay-split__footer">
                <button
                  type="button"
                  className="pay-split__add"
                  onClick={() => onSetSplitEntries([...splitEntries, { method: "Cash", amount: "" }])}
                >
                  + Add Method
                </button>
                {(() => {
                  const splitTotal = splitEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                  const rem = remainingDue - splitTotal;
                  return (
                    <div className="pay-split__totals">
                      Total: <span className={rem <= 0 ? "ok" : "short"}>{currencySymbol}{splitTotal.toFixed(2)}</span>
                      {rem > 0 && <span className="rem"> {currencySymbol}{rem.toFixed(2)} remaining</span>}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print receipt */}
      <div className="pay-print">
        <input
          type="checkbox" id="print-receipt"
          checked={printAfterPayment}
          onChange={(e) => onTogglePrint(e.target.checked)}
        />
        <label htmlFor="print-receipt">Print receipt after payment</label>
      </div>
    </div>
  );
};

export default PaymentPanel;