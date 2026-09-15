import React, { useEffect, useState } from "react";
import { X, Plus, Clock } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { createSettingThunk, updateSettingThunk, fetchSettingsThunk } from "../../../middleware/setting/setting.thunk";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  SERVICE_REMINDER_PRESETS_KEY,
  findServiceReminderPresetsSetting,
  getServiceReminderPresets,
} from "../utils/serviceReminderSettings";

interface Props {
  onClose: () => void;
  // Lets the caller (ServicesListPage) update its own presets copy without
  // waiting for a full settings refetch.
  onSaved?: (presets: number[]) => void;
}

// Reuses the .slp__overlay/.slp__modal/.slp__field/.slp__input chrome from
// ServicesListPage.scss — same convention as PrintMenuCardModal.tsx.
const ServiceReminderPresetsModal: React.FC<Props> = ({ onClose, onSaved }) => {
  const dispatch = useAppDispatch();
  const settingItems = useAppSelector((s) => s.setting.items);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => { if (settingItems.length === 0) dispatch(fetchSettingsThunk()); }, [dispatch, settingItems.length]);

  const [presets, setPresets] = useState<number[]>(() => getServiceReminderPresets(settingItems));
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-hydrate once settings actually arrive — on a fresh mount settingItems
  // can still be empty, which would otherwise leave this stuck at [].
  useEffect(() => {
    setPresets(getServiceReminderPresets(settingItems));
  }, [settingItems]);

  const addPreset = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const n = parseInt(trimmed, 10);
    if (!Number.isInteger(n) || n <= 0) { setError("Enter a valid number of days"); return; }
    if (presets.includes(n)) { setError("That value is already in the list"); setInput(""); return; }
    setPresets((prev) => [...prev, n].sort((a, b) => a - b));
    setInput("");
    setError("");
  };

  const removePreset = (n: number) => setPresets((prev) => prev.filter((d) => d !== n));

  const handleSave = async () => {
    setSaving(true);
    const existing = findServiceReminderPresetsSetting(settingItems);
    // JSON-encoded string, same as every other array-shaped salon_settings
    // value — the Setting type's `value` field only guarantees string |
    // Record<string, any>, and a plain number[] doesn't structurally satisfy
    // the latter.
    const value = JSON.stringify(presets);
    let ok = false;
    if (existing) {
      const res = await dispatch(updateSettingThunk({ id: existing.id, data: { key: SERVICE_REMINDER_PRESETS_KEY, value } }));
      ok = updateSettingThunk.fulfilled.match(res);
    } else {
      const res = await dispatch(createSettingThunk({
        key: SERVICE_REMINDER_PRESETS_KEY,
        value,
        description: "Preset day options for the per-service redo reminder",
      }));
      ok = createSettingThunk.fulfilled.match(res);
    }
    setSaving(false);
    if (ok) {
      showSuccess("Reminder options saved");
      onSaved?.(presets);
      onClose();
    } else {
      showError("Failed to save reminder options");
    }
  };

  return (
    <div className="slp__overlay" onClick={onClose}>
      {overlay}
      <div className="slp__modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="slp__modal-header">
          <h4><Clock size={16} style={{ marginRight: 8, verticalAlign: -2 }} /> Service Reminder Options</h4>
          <button className="slp__modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="slp__modal-body">
          <p className="text-muted small" style={{ marginTop: -4, marginBottom: 18 }}>
            Add the day values staff can pick from a dropdown when setting a service's redo
            reminder — in Quick Sale, Calendar, and the service form. e.g. 5, 10, 15, 20, 25, 30.
          </p>

          <div className="slp__field">
            <label>Add a day value</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="slp__input"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 30"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && addPreset()}
                autoFocus
              />
              <button type="button" className="slp__btn slp__btn--dark" onClick={addPreset}>
                <Plus size={14} /> Add
              </button>
            </div>
            {error && <span style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{error}</span>}
          </div>

          <div className="slp__chip-list">
            {presets.length === 0 ? (
              <span className="text-muted small">No reminder options added yet.</span>
            ) : (
              presets.map((d) => (
                <span key={d} className="slp__chip">
                  {d} days
                  <button type="button" onClick={() => removePreset(d)} aria-label={`Remove ${d} days`}>
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="slp__modal-footer">
          <button className="slp__btn slp__btn--ghost" onClick={onClose}>Cancel</button>
          <button className="slp__btn slp__btn--dark" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceReminderPresetsModal;
