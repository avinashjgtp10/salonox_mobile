import React, { useState } from "react";
import "./PaymentMethodPicker.scss";

export interface PaymentSplitEntry {
  method: string;
  amount: string; // string so the input can be empty/partial while typing
}

export interface PaymentMethodPickerProps {
  /** Payment method options shown as buttons, e.g. ["Cash", "Card", "UPI"]. */
  methods: string[];

  paymentMode: "single" | "split";
  onSetPaymentMode: (m: "single" | "split") => void;

  singleMethod: string | null;
  onSetSingleMethod: (m: string) => void;

  splitEntries: PaymentSplitEntry[];
  onSetSplitEntries: (entries: PaymentSplitEntry[]) => void;

  payMethodError: boolean;

  /** Total amount due — drives the "Due" row and, by default, the split remaining/short calc. */
  totalToCollect: number;
  /** Overrides the base the split-mode remaining/short calc measures against, when it
   *  should differ from `totalToCollect` (e.g. totalToCollect includes a prior due that
   *  split payments shouldn't be measured against). Defaults to `totalToCollect`. */
  splitCollectBase?: number;
  partialAmtInput: string;
  onSetPartialAmt: (v: string) => void;

  printAfterPayment: boolean;
  onTogglePrint: (v: boolean) => void;

  /** Hide the Single/Split toggle and always use single-method mode. Default true (shown). */
  showSplitMode?: boolean;
  /** Hide the Due/Full amount row. Default true (shown) whenever totalToCollect > 0. */
  showDueRow?: boolean;
  /** Hide the "Print receipt after payment" checkbox. Default true (shown). */
  showPrintOption?: boolean;
  currencySymbol?: string;
}

export const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = ({
  methods,
  paymentMode, onSetPaymentMode,
  singleMethod, onSetSingleMethod,
  splitEntries, onSetSplitEntries,
  payMethodError,
  totalToCollect,
  splitCollectBase,
  partialAmtInput, onSetPartialAmt,
  printAfterPayment, onTogglePrint,
  showSplitMode = true,
  showDueRow = true,
  showPrintOption = true,
  currencySymbol = "₹",
}) => {
  // Checked by default. Decoupled from partialAmtInput so unchecking can show a
  // blank field (nothing typed yet) instead of forcing the field to always show
  // some value — partialAmtInput stays "" (→ pay the full amount) until the user
  // actually types a custom figure.
  const [fullChecked, setFullChecked] = useState(true);

  // The amount actually being collected right now — "Full" (checked) or
  // nothing typed yet both mean "the full due amount"; a blank/zero partial
  // entry means the user is deliberately paying nothing this time and
  // deferring the whole bill to due. No method is needed to collect ₹0.
  const parsedPartialAmt = parseFloat(partialAmtInput);
  const currentAmount = (fullChecked || partialAmtInput === "")
    ? totalToCollect
    : (isNaN(parsedPartialAmt) ? totalToCollect : parsedPartialAmt);
  const needsMethod = paymentMode === "single" ? currentAmount > 0 : true;

  return (
    <div className="pmp">
      <div className="pay-method">
        {needsMethod && (
          <label className="pay-method__label">PAYMENT METHOD <span className="req">*</span></label>
        )}

        {showSplitMode && needsMethod && (
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
        )}

        {paymentMode === "single" ? (
          <>
            {needsMethod && (
              <>
                <div className="pay-method__options">
                  {methods.map((m) => (
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
              </>
            )}
            {showDueRow && totalToCollect > 0 && (
              <div className="pay-due-row">
                <span className="pay-due-row__label">Pay —</span>
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
          <div className="pay-split">
            {splitEntries.map((entry, i) => (
              <div key={i} className="pay-split__row">
                <div className="pay-split__methods">
                  {methods.map((m) => (
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
                onClick={() => onSetSplitEntries([...splitEntries, { method: methods[0] ?? "", amount: "" }])}
              >
                + Add Method
              </button>
              {(() => {
                const splitTotal = splitEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                const rem = (splitCollectBase ?? totalToCollect) - splitTotal;
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

      {showPrintOption && (
        <div className="pay-print">
          <input
            type="checkbox" id="pmp-print-receipt"
            checked={printAfterPayment}
            onChange={(e) => onTogglePrint(e.target.checked)}
          />
          <label htmlFor="pmp-print-receipt">Print receipt after payment</label>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodPicker;
