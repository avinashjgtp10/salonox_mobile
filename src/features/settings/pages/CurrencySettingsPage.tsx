import { useState, useEffect } from "react";
import { CreditCard, Pencil, X, Save } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { getMySalonThunk, updateSalonThunk } from "../../../middleware/salon/salon.thunk";
import { DEFAULT_CURRENCY_CODE } from "../../../config/currencies";
import Button from "../../../components/ui/Button";
import CurrencySelect from "../../../components/ui/CurrencySelect";

export default function CurrencySettingsPage() {
  const dispatch = useAppDispatch();
  const { currentSalon } = useAppSelector((s) => s.salon);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [currency, setCurrency] = useState(DEFAULT_CURRENCY_CODE);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(getMySalonThunk());
  }, [dispatch]);

  useEffect(() => {
    if (currentSalon && !editing) {
      setCurrency(currentSalon.currency || DEFAULT_CURRENCY_CODE);
    }
  }, [currentSalon, editing]);

  const handleSave = async () => {
    if (!currentSalon?.id) {
      showError("Salon information not found");
      return;
    }
    setSaving(true);
    const result = await dispatch(updateSalonThunk({ id: currentSalon.id, payload: { currency } }));
    setSaving(false);

    if (updateSalonThunk.fulfilled.match(result)) {
      showSuccess("Currency updated — applies across the whole app immediately");
      setEditing(false);
    } else {
      showError((result.payload as string) || "Failed to update currency");
    }
  };

  const handleCancel = () => {
    setCurrency(currentSalon?.currency || DEFAULT_CURRENCY_CODE);
    setEditing(false);
  };

  return (
    <>
      {overlay}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Currency</h2>
        <p className="settings-page-subtitle">
          Choose the currency used everywhere in the app — bills, reports, the calendar, and receipts.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Display Currency</p>
            <p className="settings-section-desc">
              One currency for the whole salon — this is not per-transaction, changing it updates every
              amount shown across the app immediately.
            </p>
          </div>
          {!editing ? (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setEditing(true)}
              iconLeft={<Pencil size={13} />}
            >
              Edit
            </Button>
          ) : (
            <div className="settings-section-actions">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving} iconLeft={<X size={13} />}>
                Cancel
              </Button>
              <Button size="sm" loading={saving} onClick={handleSave} iconLeft={<Save size={14} />}>
                Save changes
              </Button>
            </div>
          )}
        </div>
        <div className="settings-section-body">
          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label className="settings-label">
                <CreditCard size={13} className="me-1" />
                Currency
              </label>
              <CurrencySelect value={currency} onChange={setCurrency} disabled={!editing} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
