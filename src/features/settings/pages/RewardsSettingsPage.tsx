import { useState, useEffect, useRef } from "react";
import { Gift, Save, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import type { EntityId } from "../../../types/common.types";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";
import SettingsToggle from "../components/SettingsToggle";
import {
  REWARD_POINTS_SETTING_KEY,
  DEFAULT_REWARD_POINTS_CONFIG,
  findRewardPointsSetting,
  parseRewardPointsValue,
  type RewardPointsConfig,
} from "../utils/rewardPointsSettings";

type FieldKey = keyof Omit<RewardPointsConfig, "active">;

// Each field keeps its own string while the user is typing (so the box can be
// empty mid-edit instead of snapping to "0"); values are parsed/clamped only
// on blur or save — same pattern used for numeric inputs elsewhere (ServiceRow.tsx).
function toInputs(config: RewardPointsConfig): Record<FieldKey, string> {
  return {
    spend_amount: String(config.spend_amount),
    points_earned: String(config.points_earned),
    redeem_points: String(config.redeem_points),
    redeem_value: String(config.redeem_value),
  };
}

interface FormErrors {
  spend_amount?: string;
  points_earned?: string;
  redeem_points?: string;
  redeem_value?: string;
}

export default function RewardsSettingsPage() {
  const dispatch = useAppDispatch();
  const { items: settingItems } = useAppSelector((s) => s.setting);

  const [config, setConfig] = useState<RewardPointsConfig>(DEFAULT_REWARD_POINTS_CONFIG);
  const [inputs, setInputs] = useState<Record<FieldKey, string>>(toInputs(DEFAULT_REWARD_POINTS_CONFIG));
  const [errors, setErrors] = useState<FormErrors>({});
  const [settingId, setSettingId] = useState<EntityId | null>(null);
  const [saving, setSaving] = useState(false);
  // Once a config is already saved, the form loads read-only — "Edit" unlocks it.
  // A brand-new salon with nothing saved yet starts editable so it can be set up.
  const [isEditing, setIsEditing] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  useEffect(() => {
    const found = findRewardPointsSetting(settingItems);
    if (!found) {
      if (!initializedRef.current) { setIsEditing(true); initializedRef.current = true; }
      return;
    }
    setSettingId(found.id);
    const parsed = parseRewardPointsValue(found.value);
    setConfig(parsed);
    setInputs(toInputs(parsed));
    if (!initializedRef.current) { setIsEditing(false); initializedRef.current = true; }
  }, [settingItems]);

  function handleCancelEdit() {
    const found = findRewardPointsSetting(settingItems);
    if (found) {
      const parsed = parseRewardPointsValue(found.value);
      setConfig(parsed);
      setInputs(toInputs(parsed));
    }
    setErrors({});
    setIsEditing(false);
  }

  function handleInputChange(field: FieldKey, raw: string) {
    setInputs((prev) => ({ ...prev, [field]: raw.replace(/[^0-9]/g, "") }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleInputBlur(field: FieldKey, min: number) {
    const parsed = Math.max(0, parseInt(inputs[field], 10) || 0);
    setConfig((c) => ({ ...c, [field]: parsed }));
    setInputs((prev) => ({ ...prev, [field]: String(parsed) }));
    if (parsed < min) {
      setErrors((prev) => ({ ...prev, [field]: `Must be at least ${min}` }));
    }
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (config.spend_amount < 1) errs.spend_amount = "Must be at least 1";
    if (config.points_earned < 1) errs.points_earned = "Must be at least 1";
    if (config.redeem_points < 1) errs.redeem_points = "Must be at least 1";
    if (config.redeem_value < 1) errs.redeem_value = "Must be at least 1";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const value = JSON.stringify(config);

    let ok = false;
    if (settingId) {
      const result = await dispatch(updateSettingThunk({ id: settingId, data: { key: REWARD_POINTS_SETTING_KEY, value } }));
      ok = updateSettingThunk.fulfilled.match(result);
    } else {
      const result = await dispatch(createSettingThunk({
        key: REWARD_POINTS_SETTING_KEY, value, description: "Reward points earning & redemption rates",
      }));
      if (createSettingThunk.fulfilled.match(result)) {
        setSettingId(result.payload.id);
        ok = true;
      }
    }

    setSaving(false);
    if (ok) { toast.success("Reward points settings saved"); setIsEditing(false); }
    else toast.error("Failed to save reward points settings");
  }

  const fields: { key: FieldKey; label: string; min: number }[] = [
    { key: "spend_amount", label: "Customer spends (₹)", min: 1 },
    { key: "points_earned", label: "Points earned", min: 1 },
    { key: "redeem_points", label: "Points to redeem", min: 1 },
    { key: "redeem_value", label: "Redeem value (₹)", min: 1 },
  ];

  return (
    <SettingsSection
      title={
        <span className="d-flex align-items-center gap-2">
          <Gift size={16} /> Reward Points
        </span>
      }
      desc="Let customers earn points on every visit and redeem them for a discount at checkout."
      headerAction={<SettingsToggle checked={config.active} onChange={() => setConfig((c) => ({ ...c, active: !c.active }))} disabled={!isEditing} />}
    >
      <div
        className="settings-form-grid"
        style={!config.active ? { opacity: 0.5, pointerEvents: "none" } : undefined}
      >
        {fields.map(({ key, label, min }) => (
          <div className="settings-form-group" key={key}>
            <label className="settings-label">{label}</label>
            <input
              className={`settings-input${errors[key] ? " settings-input--error" : ""}`}
              type="text"
              inputMode="numeric"
              value={inputs[key]}
              disabled={!isEditing || !config.active}
              onChange={(e) => handleInputChange(key, e.target.value)}
              onBlur={() => handleInputBlur(key, min)}
            />
            {errors[key] && <span className="settings-error">{errors[key]}</span>}
          </div>
        ))}
      </div>

      <p className="settings-section-desc" style={{ marginTop: 12, opacity: config.active ? 1 : 0.5 }}>
        Example: a customer spends <strong>₹{config.spend_amount}</strong> → earns{" "}
        <strong>{config.points_earned} points</strong> → later redeems them for{" "}
        <strong>
          ₹{config.redeem_points > 0
            ? ((config.points_earned / config.redeem_points) * config.redeem_value).toFixed(2)
            : "0.00"}
        </strong>{" "}
        off a future bill.
      </p>

      <div className="notif-table-footer" style={{ marginTop: 16 }}>
        {isEditing ? (
          <>
            {settingId && (
              <Button size="sm" variant="outline-secondary" onClick={handleCancelEdit} iconLeft={<X size={14} />}>
                Cancel
              </Button>
            )}
            <Button size="sm" loading={saving} onClick={handleSave} iconLeft={<Save size={14} />}>
              Save
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline-secondary" onClick={() => setIsEditing(true)} iconLeft={<Pencil size={14} />}>
            Edit
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
