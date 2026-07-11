import React from "react";
import type { SingleMethod, SplitEntry } from "../../types";
import "../../styles/AppointmentModal.scss";
import { SINGLE_METHODS } from "../../types";
import { currencySymbol } from "../../utils/currency";
import { PaymentMethodPicker } from "../../../../components/shared/PaymentMethodPicker";

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
        <PaymentMethodPicker
          methods={SINGLE_METHODS}
          paymentMode={paymentMode}
          onSetPaymentMode={onSetPaymentMode}
          singleMethod={singleMethod}
          onSetSingleMethod={(m) => onSetSingleMethod(m as SingleMethod)}
          splitEntries={splitEntries}
          onSetSplitEntries={(entries) => onSetSplitEntries(entries as SplitEntry[])}
          payMethodError={payMethodError}
          totalToCollect={totalToCollect}
          splitCollectBase={remainingDue}
          partialAmtInput={partialAmtInput}
          onSetPartialAmt={onSetPartialAmt}
          printAfterPayment={printAfterPayment}
          onTogglePrint={onTogglePrint}
          currencySymbol={currencySymbol}
          showPrintOption={false}
        />
      )}

      {/* Print receipt — kept outside the `!frozen` gate so it's always available */}
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