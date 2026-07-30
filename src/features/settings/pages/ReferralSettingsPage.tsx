import { useState, useEffect, useMemo } from "react";
import {
  Share2,
  Save,
  X,
  Sparkles,
  ShieldCheck,
  Info,
  Gift,
  UserRound,
  Users,
  FileText,
  Wallet,
  UserPlus,
  User,
  Star,
  Repeat2,
  Heart,
  BarChart3,
} from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import type { EntityId } from "../../../types/common.types";
import {
  REFERRAL_SETTING_KEY,
  DEFAULT_REFERRAL_CONFIG,
  findReferralSetting,
  parseReferralValue,
  type ReferralConfig,
} from "../utils/referralSettings";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/ReferralSettingsPage.scss";

type FieldKey = keyof Omit<ReferralConfig, "active">;

// Each field keeps its own string while the user is typing (so the box can be
// empty mid-edit instead of snapping to "0"); values are parsed/clamped only
// on blur or save — same pattern used for numeric inputs elsewhere (RewardsSettingsPage.tsx).
function toInputs(config: ReferralConfig): Record<FieldKey, string> {
  return {
    referrer_reward_amount: String(config.referrer_reward_amount),
    referee_reward_amount: String(config.referee_reward_amount),
    min_bill_amount: String(config.min_bill_amount),
    max_wallet_usage_pct: String(config.max_wallet_usage_pct),
  };
}

interface FormErrors {
  referrer_reward_amount?: string;
  referee_reward_amount?: string;
  min_bill_amount?: string;
  max_wallet_usage_pct?: string;
}

export default function ReferralSettingsPage() {
  const { currencySymbol, formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const { items: settingItems } = useAppSelector((s) => s.setting);

  const [config, setConfig] = useState<ReferralConfig>(DEFAULT_REFERRAL_CONFIG);
  const [savedConfig, setSavedConfig] = useState<ReferralConfig>(DEFAULT_REFERRAL_CONFIG);
  const [inputs, setInputs] = useState<Record<FieldKey, string>>(toInputs(DEFAULT_REFERRAL_CONFIG));
  const [errors, setErrors] = useState<FormErrors>({});
  const [settingId, setSettingId] = useState<EntityId | null>(null);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Loads the saved config from Redux exactly once. Other pages/layouts
  // (e.g. DashboardLayout) also dispatch fetchSettingsThunk on their own
  // mount, and every fetch replaces `settingItems` with a new array — if
  // this stayed unconditional, a late-arriving redundant fetch could
  // silently overwrite the toggle/fields mid-edit with the last-saved
  // server value, making it look like the toggle "snaps back". Once
  // settingId is set we've loaded once; local state is authoritative
  // after that (Cancel explicitly re-reads from settingItems if needed).
  useEffect(() => {
    if (settingId) return;
    const found = findReferralSetting(settingItems);
    if (!found) return;
    setSettingId(found.id);
    const parsed = parseReferralValue(found.value);
    setConfig(parsed);
    setSavedConfig(parsed);
    setInputs(toInputs(parsed));
  }, [settingItems, settingId]);

  const hasChanges = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig]
  );

  const hasValidValues =
    config.referrer_reward_amount >= 1 &&
    config.referee_reward_amount >= 1 &&
    config.min_bill_amount >= 0 &&
    config.max_wallet_usage_pct >= 1 &&
    config.max_wallet_usage_pct <= 100;

  const saveDisabled = saving || !hasChanges || !hasValidValues || (!config.active && !savedConfig.active);

  function handleCancel() {
    const found = findReferralSetting(settingItems);
    const parsed = found ? parseReferralValue(found.value) : DEFAULT_REFERRAL_CONFIG;
    setConfig(parsed);
    setSavedConfig(parsed);
    setInputs(toInputs(parsed));
    setErrors({});
  }

  function handleInputChange(field: FieldKey, raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    setInputs((prev) => ({ ...prev, [field]: digits }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    setConfig((c) => ({ ...c, [field]: Math.max(0, parseInt(digits, 10) || 0) }));
  }

  function handleInputBlur(field: FieldKey, min: number, max?: number) {
    let parsed = Math.max(0, parseInt(inputs[field], 10) || 0);
    if (max != null) parsed = Math.min(parsed, max);
    setConfig((c) => ({ ...c, [field]: parsed }));
    setInputs((prev) => ({ ...prev, [field]: String(parsed) }));
    if (parsed < min) {
      setErrors((prev) => ({ ...prev, [field]: `Must be at least ${min}` }));
    }
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (config.referrer_reward_amount < 1) errs.referrer_reward_amount = "Must be at least 1";
    if (config.referee_reward_amount < 1) errs.referee_reward_amount = "Must be at least 1";
    if (config.min_bill_amount < 0) errs.min_bill_amount = "Must be at least 0";
    if (config.max_wallet_usage_pct < 1 || config.max_wallet_usage_pct > 100) {
      errs.max_wallet_usage_pct = "Must be between 1 and 100";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!config.active && !savedConfig.active) {
      showError("Activate Refer & Earn before saving referral settings");
      return;
    }
    if (!hasChanges) return;
    if (!validate()) return;
    setSaving(true);
    const value = JSON.stringify(config);

    let ok = false;
    if (settingId) {
      const result = await dispatch(updateSettingThunk({ id: settingId, data: { key: REFERRAL_SETTING_KEY, value } }));
      ok = updateSettingThunk.fulfilled.match(result);
    } else {
      const result = await dispatch(createSettingThunk({
        key: REFERRAL_SETTING_KEY, value, description: "Refer & Earn wallet rewards for referrer & referred customer",
      }));
      if (createSettingThunk.fulfilled.match(result)) {
        setSettingId(result.payload.id);
        ok = true;
      }
    }

    setSaving(false);
    if (ok) {
      setSavedConfig(config);
      showSuccess("Referral settings saved");
    }
    else showError("Failed to save referral settings");
  }

  return (
    <div className="rf-page">
      {overlay}
      {/* ── Header ── */}
      <div className="rf-header">
        <div className="rf-header__icon"><Share2 size={24} /></div>
        <div className="rf-header__text">
          <h2 className="rf-header__title">Refer &amp; Earn</h2>
          <p className="rf-header__desc">
            Reward customers for referring friends and family. Both the referrer and the new customer earn wallet credit after the referred customer's first qualifying paid visit.
          </p>
        </div>
        <label className="rf-header__toggle">
          <input
            type="checkbox"
            checked={config.active}
            onChange={() => setConfig((c) => ({ ...c, active: !c.active }))}
          />
          <span className="rf-header__toggle-track"><span className="rf-header__toggle-thumb" /></span>
          <span className={`rf-header__toggle-status${!config.active ? " rf-header__toggle-status--off" : ""}`}>
            {config.active ? "Active" : "Inactive"}
          </span>
        </label>
      </div>

      <div className={`rf-grid${!config.active ? " rf-disabled" : ""}`}>
        {/* ── Main: reward amounts + conditions ── */}
        <div className="rf-main">
          <div className="rf-section__head">
            <div className="rf-section__icon"><Sparkles size={16} /></div>
            <div>
              <h3 className="rf-section__title">Reward Amounts</h3>
              <p className="rf-section__desc">Set how much wallet credit the referrer and the new customer will receive.</p>
            </div>
          </div>
          <div className="rf-row">
            <div className="rf-field">
              <label className="rf-field__label">Referrer reward ({currencySymbol})</label>
              <p className="rf-field__hint">Wallet credit for the person who refers</p>
              <div className={`rf-input-wrap${errors.referrer_reward_amount ? " rf-input-wrap--error" : ""}`}>
                <span className="rf-input-wrap__icon"><UserRound size={15} /></span>
                <span className="rf-input-wrap__prefix">{currencySymbol}</span>
                <input
                  type="text" inputMode="numeric"
                  value={inputs.referrer_reward_amount}
                  onChange={(e) => handleInputChange("referrer_reward_amount", e.target.value)}
                  onBlur={() => handleInputBlur("referrer_reward_amount", 1)}
                />
              </div>
              {errors.referrer_reward_amount && <span className="settings-error">{errors.referrer_reward_amount}</span>}
            </div>

            <div className="rf-field">
              <label className="rf-field__label">Friend reward ({currencySymbol})</label>
              <p className="rf-field__hint">Wallet credit for the new customer</p>
              <div className={`rf-input-wrap${errors.referee_reward_amount ? " rf-input-wrap--error" : ""}`}>
                <span className="rf-input-wrap__icon"><Users size={15} /></span>
                <span className="rf-input-wrap__prefix">{currencySymbol}</span>
                <input
                  type="text" inputMode="numeric"
                  value={inputs.referee_reward_amount}
                  onChange={(e) => handleInputChange("referee_reward_amount", e.target.value)}
                  onBlur={() => handleInputBlur("referee_reward_amount", 1)}
                />
              </div>
              {errors.referee_reward_amount && <span className="settings-error">{errors.referee_reward_amount}</span>}
            </div>
          </div>

          <hr className="rf-divider" />

          <div className="rf-section__head">
            <div className="rf-section__icon"><ShieldCheck size={16} /></div>
            <div>
              <h3 className="rf-section__title">Reward Conditions</h3>
              <p className="rf-section__desc">Set the conditions that must be met to unlock the rewards.</p>
            </div>
          </div>
          <div className="rf-row">
            <div className="rf-field">
              <label className="rf-field__label">Minimum bill to unlock reward ({currencySymbol})</label>
              <p className="rf-field__hint">First paid visit must be of this amount or more</p>
              <div className={`rf-input-wrap${errors.min_bill_amount ? " rf-input-wrap--error" : ""}`}>
                <span className="rf-input-wrap__icon"><FileText size={15} /></span>
                <span className="rf-input-wrap__prefix">{currencySymbol}</span>
                <input
                  type="text" inputMode="numeric"
                  value={inputs.min_bill_amount}
                  onChange={(e) => handleInputChange("min_bill_amount", e.target.value)}
                  onBlur={() => handleInputBlur("min_bill_amount", 0)}
                />
              </div>
              {errors.min_bill_amount && <span className="settings-error">{errors.min_bill_amount}</span>}
            </div>

            <div className="rf-field">
              <label className="rf-field__label">Max wallet usage per bill (%)</label>
              <p className="rf-field__hint">Maximum wallet balance that can be used in a single bill</p>
              <div className={`rf-input-wrap${errors.max_wallet_usage_pct ? " rf-input-wrap--error" : ""}`}>
                <span className="rf-input-wrap__icon"><Wallet size={15} /></span>
                <input
                  type="text" inputMode="numeric"
                  value={inputs.max_wallet_usage_pct}
                  onChange={(e) => handleInputChange("max_wallet_usage_pct", e.target.value)}
                  onBlur={() => handleInputBlur("max_wallet_usage_pct", 1, 100)}
                />
                <span className="rf-input-wrap__suffix">%</span>
              </div>
              {errors.max_wallet_usage_pct && <span className="settings-error">{errors.max_wallet_usage_pct}</span>}
            </div>
          </div>

          <div className="rf-banner">
            <span className="rf-banner__icon"><Info size={13} /></span>
            <div className="rf-banner__text">
              <span className="rf-banner__title">How it works</span>
              When a friend completes their first paid visit of at least <strong>{formatAmount(config.min_bill_amount)}</strong>, both the referrer and the friend will receive{" "}
              <strong>{config.referrer_reward_amount === config.referee_reward_amount ? formatAmount(config.referrer_reward_amount) : `${formatAmount(config.referrer_reward_amount)} / ${formatAmount(config.referee_reward_amount)}`}</strong> wallet credit. On any single bill, wallet balance can cover up to <strong>{config.max_wallet_usage_pct}%</strong> of the total.
            </div>
          </div>
        </div>

        {/* ── Sidebar: Example Preview ── */}
        <div className="rf-sidebar">
          <div className="rf-sidebar__head">
            <div className="rf-sidebar__icon"><Gift size={16} /></div>
            <div>
              <h3 className="rf-sidebar__title">Example Preview</h3>
              <p className="rf-sidebar__desc">This is how the reward will work</p>
            </div>
          </div>

          <div className="rf-flow-box">
            <div className="rf-flow__step">
              <div className="rf-flow__line" />
              <div className="rf-flow__icon rf-flow__icon--purple"><UserPlus size={17} /></div>
              <div className="rf-flow__body">
                <div className="rf-flow__label">Friend visits your salon</div>
                <div className="rf-flow__desc">They complete their first paid visit of {formatAmount(config.min_bill_amount)} or more</div>
              </div>
            </div>

            <div className="rf-flow__step">
              <div className="rf-flow__line" />
              <div className="rf-flow__icon rf-flow__icon--green"><User size={18} /></div>
              <div className="rf-flow__body">
                <div className="rf-flow__label">You (Referrer) get</div>
                <div>
                  <span className="rf-flow__value">{formatAmount(config.referrer_reward_amount)}</span>
                  <span className="rf-flow__unit">Wallet credit</span>
                </div>
              </div>
            </div>

            <div className="rf-flow__step">
              <div className="rf-flow__line" />
              <div className="rf-flow__icon rf-flow__icon--purple"><Users size={17} /></div>
              <div className="rf-flow__body">
                <div className="rf-flow__label">Your Friend gets</div>
                <div>
                  <span className="rf-flow__value">{formatAmount(config.referee_reward_amount)}</span>
                  <span className="rf-flow__unit">Wallet credit</span>
                </div>
              </div>
            </div>

            <div className="rf-flow__step">
              <div className="rf-flow__icon rf-flow__icon--orange"><Wallet size={17} /></div>
              <div className="rf-flow__body">
                <div className="rf-flow__label">Wallet can be used up to</div>
                <div>
                  <span className="rf-flow__value">{config.max_wallet_usage_pct}%</span>
                  <span className="rf-flow__unit">of any single bill</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Benefits for your salon ── */}
      <div className={`rf-benefits${!config.active ? " rf-disabled" : ""}`}>
        <div className="rf-benefits__head"><Star size={16} /> Benefits for your salon</div>
        <div className="rf-benefits__grid">
          <div className="rf-benefit">
            <div className="rf-benefit__icon"><Repeat2 size={18} /></div>
            <div>
              <h4 className="rf-benefit__title">Increase customer base</h4>
              <p className="rf-benefit__desc">Encourage word-of-mouth and bring new customers</p>
            </div>
          </div>
          <div className="rf-benefit">
            <div className="rf-benefit__icon"><Heart size={18} /></div>
            <div>
              <h4 className="rf-benefit__title">Boost customer loyalty</h4>
              <p className="rf-benefit__desc">Reward both referrer and new customers</p>
            </div>
          </div>
          <div className="rf-benefit">
            <div className="rf-benefit__icon"><BarChart3 size={18} /></div>
            <div>
              <h4 className="rf-benefit__title">More repeat visits</h4>
              <p className="rf-benefit__desc">Happy customers visit your salon more often</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="rf-footer">
        {!config.active && !hasChanges && (
          <p className="rf-footer__message">Activate Refer &amp; Earn to save referral settings.</p>
        )}
        <button className="rf-btn" onClick={handleCancel} disabled={saving}>
          <X size={14} /> Cancel
        </button>
        <button
          className="rf-btn rf-btn--primary"
          onClick={handleSave}
          disabled={saveDisabled}
          title={!config.active && !hasChanges ? "Activate Refer & Earn to save referral settings" : undefined}
        >
          <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
