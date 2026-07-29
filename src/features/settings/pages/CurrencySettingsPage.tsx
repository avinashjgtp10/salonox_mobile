import { useState, useEffect } from "react";
import { CreditCard, Globe, Pencil, X, Save } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { getMySalonThunk, updateSalonThunk } from "../../../middleware/salon/salon.thunk";
import { DEFAULT_CURRENCY_CODE } from "../../../config/currencies";
import { getCountryDef } from "../../../config/countries";
import { CURRENCY_MESSAGES } from "../../../constants/messages";
import Button from "../../../components/ui/Button";
import CurrencySelect from "../../../components/ui/CurrencySelect";
import CountrySelect from "../../../components/ui/CountrySelect";

export default function CurrencySettingsPage() {
  const dispatch = useAppDispatch();
  const { currentSalon } = useAppSelector((s) => s.salon);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY_CODE);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(getMySalonThunk());
  }, [dispatch]);

  useEffect(() => {
    if (currentSalon && !editing) {
      setCountry(currentSalon.country || "");
      setCurrency(currentSalon.currency || DEFAULT_CURRENCY_CODE);
    }
  }, [currentSalon, editing]);

  // Picking a country auto-fills the currency with that country's default
  // (e.g. India -> INR) — but currency stays a fully independent choice
  // afterward, so a salon in India billing in USD is still a valid,
  // intentional combination (handleCurrencyChange never touches country).
  const handleCountryChange = (code: string) => {
    setCountry(code);
    const def = getCountryDef(code);
    if (def) setCurrency(def.currency);
  };

  const handleSave = async () => {
    if (!currentSalon?.id) {
      showError(CURRENCY_MESSAGES.SALON_NOT_FOUND);
      return;
    }
    setSaving(true);
    const result = await dispatch(updateSalonThunk({ id: currentSalon.id, payload: { country, currency } }));
    setSaving(false);

    if (updateSalonThunk.fulfilled.match(result)) {
      showSuccess(CURRENCY_MESSAGES.SAVE_SUCCESS);
      setEditing(false);
    } else {
      showError((result.payload as string) || CURRENCY_MESSAGES.SAVE_FAILED);
    }
  };

  const handleCancel = () => {
    setCountry(currentSalon?.country || "");
    setCurrency(currentSalon?.currency || DEFAULT_CURRENCY_CODE);
    setEditing(false);
  };

  return (
    <>
      {overlay}
      <div className="settings-page-header">
        <h2 className="settings-page-title">{CURRENCY_MESSAGES.PAGE_TITLE}</h2>
        <p className="settings-page-subtitle">{CURRENCY_MESSAGES.PAGE_SUBTITLE}</p>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">{CURRENCY_MESSAGES.SECTION_TITLE}</p>
            <p className="settings-section-desc">{CURRENCY_MESSAGES.SECTION_DESC}</p>
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
                <Globe size={13} className="me-1" />
                Country
              </label>
              <CountrySelect value={country} onChange={handleCountryChange} disabled={!editing} />
            </div>
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
