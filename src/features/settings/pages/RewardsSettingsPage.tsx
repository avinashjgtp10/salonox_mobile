import { useState, useEffect } from "react";
import { Gift, Save, X, ArrowRight, BarChart3, ShoppingCart, Star, Wallet, Info, Eye } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import type { EntityId } from "../../../types/common.types";
import {
  REWARD_POINTS_SETTING_KEY,
  DEFAULT_REWARD_POINTS_CONFIG,
  findRewardPointsSetting,
  parseRewardPointsValue,
  type RewardPointsConfig,
} from "../utils/rewardPointsSettings";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/RewardsSettingsPage.scss";

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

// Fixed example spend used for the "Live Preview" strip at the bottom —
// matches the design's own worked example regardless of the configured rate.
const PREVIEW_SPEND = 1000;

export default function RewardsSettingsPage() {
  const { currencySymbol, formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const { items: settingItems } = useAppSelector((s) => s.setting);

  const [config, setConfig] = useState<RewardPointsConfig>(DEFAULT_REWARD_POINTS_CONFIG);
  const [inputs, setInputs] = useState<Record<FieldKey, string>>(toInputs(DEFAULT_REWARD_POINTS_CONFIG));
  const [errors, setErrors] = useState<FormErrors>({});
  const [settingId, setSettingId] = useState<EntityId | null>(null);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Loads the saved config from Redux exactly once — see ReferralSettingsPage.tsx
  // for why this must not resync unconditionally on every settingItems change.
  useEffect(() => {
    if (settingId) return;
    const found = findRewardPointsSetting(settingItems);
    if (!found) return;
    setSettingId(found.id);
    const parsed = parseRewardPointsValue(found.value);
    setConfig(parsed);
    setInputs(toInputs(parsed));
  }, [settingItems, settingId]);

  function handleCancel() {
    const found = findRewardPointsSetting(settingItems);
    const parsed = found ? parseRewardPointsValue(found.value) : DEFAULT_REWARD_POINTS_CONFIG;
    setConfig(parsed);
    setInputs(toInputs(parsed));
    setErrors({});
  }

  function handleInputChange(field: FieldKey, raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    setInputs((prev) => ({ ...prev, [field]: digits }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    // Live-update config as they type (not just on blur) so the Reward
    // Summary / Live Preview panels react immediately, matching the design.
    setConfig((c) => ({ ...c, [field]: Math.max(0, parseInt(digits, 10) || 0) }));
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
    if (ok) showSuccess("Reward points settings saved");
    else showError("Failed to save reward points settings");
  }

  // ── Derived preview numbers ─────────────────────────────────────────────
  const redeemValuePerPoint = config.redeem_points > 0 ? config.redeem_value / config.redeem_points : 0;
  const effectiveCashbackPct = config.spend_amount > 0
    ? (config.points_earned / config.spend_amount) * redeemValuePerPoint * 100
    : 0;
  const cashbackPer100 = effectiveCashbackPct;

  const previewPointsEarned = config.spend_amount > 0
    ? Math.floor((PREVIEW_SPEND / config.spend_amount) * config.points_earned)
    : 0;
  const previewRedeemablePoints = previewPointsEarned;
  const previewWalletValue = previewRedeemablePoints * redeemValuePerPoint;

  return (
    <div className="rp-page">
      {overlay}
      {/* ── Header ── */}
      <div className="rp-header">
        <div className="rp-header__icon"><Gift size={24} /></div>
        <div className="rp-header__text">
          <h2 className="rp-header__title">Reward Points</h2>
          <p className="rp-header__desc">
            Let customers earn points on every visit — instantly credited as {currencySymbol} to their eWallet, ready to spend on a future visit.
          </p>
        </div>
        <label className="rp-header__toggle">
          <input
            type="checkbox"
            checked={config.active}
            onChange={() => setConfig((c) => ({ ...c, active: !c.active }))}
          />
          <span className="rp-header__toggle-track"><span className="rp-header__toggle-thumb" /></span>
          <span className="rp-header__toggle-label">{config.active ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      <div className={`rp-grid${!config.active ? " rp-disabled" : ""}`}>
        {/* ── Main: earn + redeem config ── */}
        <div className="rp-main">
          <div className="rp-step">
            <div className="rp-step__head">
              <span className="rp-step__num">1</span>
              <div>
                <h3 className="rp-step__title">How customers earn points</h3>
                <p className="rp-step__desc">Set how many points customers earn on their spending.</p>
              </div>
            </div>
            <div className="rp-row">
              <div className="rp-field">
                <label className="rp-field__label">For every customer spends</label>
                <div className={`rp-input-wrap${errors.spend_amount ? " rp-input-wrap--error" : ""}`}>
                  <span>{currencySymbol}</span>
                  <input
                    type="text" inputMode="numeric"
                    value={inputs.spend_amount}
                    onChange={(e) => handleInputChange("spend_amount", e.target.value)}
                    onBlur={() => handleInputBlur("spend_amount", 1)}
                  />
                </div>
                {errors.spend_amount && <span className="settings-error">{errors.spend_amount}</span>}
              </div>
              <div className="rp-row__arrow"><ArrowRight size={16} /></div>
              <div className="rp-field">
                <label className="rp-field__label">Customer earns</label>
                <div className={`rp-input-wrap${errors.points_earned ? " rp-input-wrap--error" : ""}`}>
                  <input
                    type="text" inputMode="numeric"
                    value={inputs.points_earned}
                    onChange={(e) => handleInputChange("points_earned", e.target.value)}
                    onBlur={() => handleInputBlur("points_earned", 1)}
                  />
                  <span>Points</span>
                </div>
                {errors.points_earned && <span className="settings-error">{errors.points_earned}</span>}
              </div>
            </div>
            <div className="rp-banner rp-banner--purple">
              <Info size={14} />
              <span>
                Example: Customer spends <strong>{formatAmount(config.spend_amount)}</strong> → earns{" "}
                <strong>{config.points_earned} points</strong> (instantly credited to eWallet)
              </span>
            </div>
          </div>

          <hr className="rp-divider" />

          <div className="rp-step">
            <div className="rp-step__head">
              <span className="rp-step__num rp-step__num--green">2</span>
              <div>
                <h3 className="rp-step__title">How customers redeem points</h3>
                <p className="rp-step__desc">Set the value of points when customers redeem.</p>
              </div>
            </div>
            <div className="rp-row">
              <div className="rp-field">
                <label className="rp-field__label">Customer redeems</label>
                <div className={`rp-input-wrap${errors.redeem_points ? " rp-input-wrap--error" : ""}`}>
                  <input
                    type="text" inputMode="numeric"
                    value={inputs.redeem_points}
                    onChange={(e) => handleInputChange("redeem_points", e.target.value)}
                    onBlur={() => handleInputBlur("redeem_points", 1)}
                  />
                  <span>Points</span>
                </div>
                {errors.redeem_points && <span className="settings-error">{errors.redeem_points}</span>}
              </div>
              <div className="rp-row__arrow rp-row__arrow--green">=</div>
              <div className="rp-field">
                <label className="rp-field__label">They receive</label>
                <div className={`rp-input-wrap${errors.redeem_value ? " rp-input-wrap--error" : ""}`}>
                  <span>{currencySymbol}</span>
                  <input
                    type="text" inputMode="numeric"
                    value={inputs.redeem_value}
                    onChange={(e) => handleInputChange("redeem_value", e.target.value)}
                    onBlur={() => handleInputBlur("redeem_value", 1)}
                  />
                  <span>Wallet Value</span>
                </div>
                {errors.redeem_value && <span className="settings-error">{errors.redeem_value}</span>}
              </div>
            </div>
            <div className="rp-banner rp-banner--green">
              <Info size={14} />
              <span>
                Example: <strong>{config.redeem_points} points</strong> can be redeemed for{" "}
                <strong>{formatAmount(config.redeem_value)}</strong> in wallet
              </span>
            </div>
          </div>
        </div>

        {/* ── Sidebar: Reward Summary ── */}
        <div className="rp-sidebar">
          <h3 className="rp-sidebar__title"><BarChart3 size={16} /> Reward Summary</h3>

          <div className="rp-flow">
            <div className="rp-flow__step">
              <div className="rp-flow__icon rp-flow__icon--purple"><ShoppingCart size={16} /></div>
              <div>
                <div className="rp-flow__label">Customer spends</div>
                <div className="rp-flow__value">{formatAmount(config.spend_amount)}</div>
              </div>
            </div>
            <div className="rp-flow__arrow">↓</div>

            <div className="rp-flow__step">
              <div className="rp-flow__icon rp-flow__icon--purple"><Star size={16} /></div>
              <div>
                <div className="rp-flow__label">Earns</div>
                <div className="rp-flow__value">{config.points_earned} Points</div>
              </div>
            </div>
            <div className="rp-flow__arrow">↓</div>

            <div className="rp-flow__step">
              <div className="rp-flow__icon rp-flow__icon--orange"><Gift size={16} /></div>
              <div>
                <div className="rp-flow__label">Redeem</div>
                <div className="rp-flow__value">{config.redeem_points} Points</div>
              </div>
            </div>
            <div className="rp-flow__arrow">↓</div>

            <div className="rp-flow__step">
              <div className="rp-flow__icon rp-flow__icon--green"><Wallet size={16} /></div>
              <div>
                <div className="rp-flow__label">Get</div>
                <div className="rp-flow__value">{formatAmount(config.redeem_value)} Wallet</div>
              </div>
            </div>
          </div>

          <div className="rp-cashback">
            <div className="rp-cashback__label">
              Effective Cashback <Info size={12} />
            </div>
            {/* toFixed(0) previously rounded a true 0.5% up to a displayed
                "1%" — literally double what the configured rates actually
                pay out. One decimal place is enough to show sub-1% rates
                accurately without being noisy for whole-number rates. */}
            <div className="rp-cashback__value">{effectiveCashbackPct.toFixed(1)}%</div>
            <div className="rp-cashback__note">({formatAmount(cashbackPer100)} on every {formatAmount(100)} spent)</div>
          </div>
        </div>
      </div>

      {/* ── Live Preview ── */}
      <div className={`rp-preview${!config.active ? " rp-disabled" : ""}`}>
        <div className="rp-preview__head">
          <Eye size={18} />
          <div>
            <h4 className="rp-preview__title">Live Preview</h4>
            <p className="rp-preview__subtitle">See how rewards work for your customers</p>
          </div>
        </div>

        <div className="rp-preview__flow">
          <div className="rp-preview__box">
            <div className="rp-preview__box-text">
              <div className="rp-preview__box-label">Customer spends</div>
              <div className="rp-preview__box-value">{formatAmount(PREVIEW_SPEND)}</div>
            </div>
            <div className="rp-preview__box-icon rp-preview__box-icon--blue"><Wallet size={15} /></div>
          </div>
          <ArrowRight size={16} className="rp-preview__arrow" />

          <div className="rp-preview__box">
            <div className="rp-preview__box-text">
              <div className="rp-preview__box-label">Earns</div>
              <div className="rp-preview__box-value">{previewPointsEarned} Points</div>
            </div>
            <div className="rp-preview__box-icon rp-preview__box-icon--purple"><Star size={15} /></div>
          </div>
          <ArrowRight size={16} className="rp-preview__arrow" />

          <div className="rp-preview__box">
            <div className="rp-preview__box-text">
              <div className="rp-preview__box-label">Can redeem</div>
              <div className="rp-preview__box-value">{previewRedeemablePoints} Points</div>
            </div>
            <div className="rp-preview__box-icon rp-preview__box-icon--orange"><Gift size={15} /></div>
          </div>
          <ArrowRight size={16} className="rp-preview__arrow" />

          <div className="rp-preview__box">
            <div className="rp-preview__box-text">
              <div className="rp-preview__box-label">Worth</div>
              <div className="rp-preview__box-value">{formatAmount(previewWalletValue)} Wallet</div>
            </div>
            <div className="rp-preview__box-icon rp-preview__box-icon--green"><Wallet size={15} /></div>
          </div>
        </div>

        <div className="rp-preview__note">
          <Info size={14} />
          <span>
            If a customer spends <strong>{formatAmount(PREVIEW_SPEND)}</strong>, they will earn{" "}
            <strong>{previewPointsEarned} points</strong>, which can later be redeemed for{" "}
            <strong>{formatAmount(previewWalletValue)}</strong> in their wallet.
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="rp-footer">
        <button className="rp-btn" onClick={handleCancel} disabled={saving}>
          <X size={14} /> Cancel
        </button>
        <button className="rp-btn rp-btn--primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
