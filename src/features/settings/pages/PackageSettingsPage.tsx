import { useState, useEffect, useRef } from "react";
import { Pencil, Save, X, CalendarClock, UserX } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import {
  fetchWaAutomationSettingsThunk,
  updateWaAutomationSettingThunk,
} from "../../../middleware/marketing/wa-automation.thunk";
import type { EntityId } from "../../../types/common.types";
import Button from "../../../components/ui/Button";
import SettingsToggle from "../components/SettingsToggle";
import SettingsSection from "../components/SettingsSection";
import {
  PACKAGE_NO_SHOW_POLICY_KEY,
  DEFAULT_PACKAGE_NO_SHOW_CONFIG,
  parsePackageNoShowValue,
  findPackageNoShowSetting,
  type PackageNoShowPolicy,
} from "../utils/packageSettings";

// The two automation events this page toggles. These are the WhatsApp
// reminders for appointments booked out of a package sale — a package-linked
// appointment is deliberately excluded from the generic 24h/1h appointment
// reminders server-side, so these are the ONLY reminders it gets and turning
// both off means the client is never reminded.
const REMINDER_EVENTS = [
  {
    eventType: "package_appointment_reminder_2d",
    title: "2 days before",
    desc: "Sent on the morning two days ahead of the appointment.",
  },
  {
    eventType: "package_appointment_reminder_1d",
    title: "1 day before",
    desc: "Sent on the morning before the appointment.",
  },
] as const;

type ReminderState = Record<string, boolean>;

const DEFAULT_REMINDERS: ReminderState = {
  package_appointment_reminder_2d: true,
  package_appointment_reminder_1d: true,
};

export default function PackageSettingsPage() {
  const dispatch = useAppDispatch();
  const { currentSalon } = useAppSelector((s) => s.salon);
  const settingItems = useAppSelector((s) => s.setting.items);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reminders, setReminders] = useState<ReminderState>(DEFAULT_REMINDERS);
  const [noShowPolicy, setNoShowPolicy] = useState<PackageNoShowPolicy>(
    DEFAULT_PACKAGE_NO_SHOW_CONFIG.policy,
  );
  const [noShowSettingId, setNoShowSettingId] = useState<EntityId | null>(null);

  // What was last persisted — restored verbatim on Cancel.
  const savedSnapshot = useRef({ reminders: DEFAULT_REMINDERS, noShowPolicy: DEFAULT_PACKAGE_NO_SHOW_CONFIG.policy as PackageNoShowPolicy });

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Reminder toggles live in wa_salon_automation_settings, not salon_settings.
  // The API only returns events that have been explicitly toggled at some
  // point, and the backend reads a MISSING row as ENABLED — so start from
  // all-on defaults and only override what actually came back.
  useEffect(() => {
    if (!currentSalon?.id) return;
    let cancelled = false;
    dispatch(fetchWaAutomationSettingsThunk(String(currentSalon.id))).then((action) => {
      if (cancelled || !fetchWaAutomationSettingsThunk.fulfilled.match(action)) return;
      const next = { ...DEFAULT_REMINDERS };
      for (const row of action.payload) {
        if (row.event_type in next) next[row.event_type] = row.is_active;
      }
      setReminders(next);
      savedSnapshot.current = { ...savedSnapshot.current, reminders: next };
    });
    return () => { cancelled = true; };
  }, [dispatch, currentSalon?.id]);

  useEffect(() => {
    const found = findPackageNoShowSetting(settingItems);
    if (!found) return;
    setNoShowSettingId(found.id);
    const policy = parsePackageNoShowValue(found.value).policy;
    setNoShowPolicy(policy);
    savedSnapshot.current = { ...savedSnapshot.current, noShowPolicy: policy };
  }, [settingItems]);

  const toggleReminder = (eventType: string) => {
    setReminders((prev) => ({ ...prev, [eventType]: !prev[eventType] }));
    setIsDirty(true);
  };

  const selectPolicy = (policy: PackageNoShowPolicy) => {
    setNoShowPolicy(policy);
    setIsDirty(true);
  };

  const saveNoShowPolicy = async (): Promise<boolean> => {
    const value = JSON.stringify({ policy: noShowPolicy });
    if (noShowSettingId) {
      const result = await dispatch(
        updateSettingThunk({ id: noShowSettingId, data: { key: PACKAGE_NO_SHOW_POLICY_KEY, value } }),
      );
      return updateSettingThunk.fulfilled.match(result);
    }
    const result = await dispatch(
      createSettingThunk({ key: PACKAGE_NO_SHOW_POLICY_KEY, value, description: "Package no-show deduction policy" }),
    );
    if (createSettingThunk.fulfilled.match(result)) {
      setNoShowSettingId(result.payload.id);
      return true;
    }
    return false;
  };

  // One PUT per event — the endpoint takes a single { event_type, is_active }.
  // Only changed toggles are sent, so an unchanged salon never gets a row
  // written (which matters: no row means "enabled by default" server-side).
  const saveReminders = async (): Promise<boolean> => {
    if (!currentSalon?.id) return false;
    const changed = REMINDER_EVENTS.filter(
      (e) => reminders[e.eventType] !== savedSnapshot.current.reminders[e.eventType],
    );
    if (changed.length === 0) return true;
    const results = await Promise.all(
      changed.map((e) =>
        dispatch(updateWaAutomationSettingThunk({
          salonId:   String(currentSalon.id),
          eventType: e.eventType,
          isActive:  reminders[e.eventType],
        })),
      ),
    );
    return results.every((r) => updateWaAutomationSettingThunk.fulfilled.match(r));
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
    setReminders(savedSnapshot.current.reminders);
    setNoShowPolicy(savedSnapshot.current.noShowPolicy);
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!isDirty) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    const [remindersOk, policyOk] = await Promise.all([saveReminders(), saveNoShowPolicy()]);
    setSaving(false);

    if (remindersOk && policyOk) {
      showSuccess("Package settings saved");
      savedSnapshot.current = { reminders, noShowPolicy };
      setIsDirty(false);
      setIsEditing(false);
    } else {
      showError("Failed to save some package settings");
    }
  };

  const noReminders = !reminders.package_appointment_reminder_2d && !reminders.package_appointment_reminder_1d;

  return (
    <>
      {overlay}
      <div className="settings-page-header settings-page-header--with-actions">
        <div>
          <h2 className="settings-page-title">Packages</h2>
          <p className="settings-page-subtitle">
            Reminders and policies for appointments booked from a package sale.
          </p>
        </div>
        {!isEditing ? (
          <Button variant="outline-secondary" size="sm" onClick={() => { setIsEditing(true); setIsDirty(false); }} iconLeft={<Pencil size={13} />}>
            Edit
          </Button>
        ) : (
          <div className="settings-section-actions">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving} iconLeft={<X size={13} />}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave} disabled={saving} iconLeft={<Save size={14} />}>
              Save changes
            </Button>
          </div>
        )}
      </div>

      <SettingsSection
        title="Package Service Reminders"
        desc="WhatsApp reminders for appointments scheduled as part of a package. These replace the standard appointment reminders, so the client is never messaged twice about the same visit."
      >
        {REMINDER_EVENTS.map((e) => (
          <div className="settings-toggle-row" key={e.eventType}>
            <div className="settings-security-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
              <CalendarClock size={18} />
            </div>
            <div className="settings-toggle-info">
              <p className="settings-toggle-title">{e.title}</p>
              <p className="settings-toggle-desc">{e.desc}</p>
            </div>
            <SettingsToggle
              checked={reminders[e.eventType]}
              onChange={() => toggleReminder(e.eventType)}
              disabled={!isEditing}
            />
          </div>
        ))}
        {noReminders && (
          <p className="settings-toggle-desc" style={{ padding: "0 4px", color: "#b45309" }}>
            Both reminders are off — clients won't be reminded about package appointments at all.
          </p>
        )}
        <p className="settings-toggle-desc" style={{ padding: "0 4px" }}>
          Wording for these messages is edited under Marketing → WhatsApp Automation, and must be
          approved by Meta before it can send.
        </p>
      </SettingsSection>

      <SettingsSection
        title="No-Show Policy"
        desc="What happens to a package session when a client doesn't turn up for a scheduled package appointment."
      >
        <div className="settings-toggle-row">
          <div className="settings-security-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
            <UserX size={18} />
          </div>
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Do not deduct the session</p>
            <p className="settings-toggle-desc">
              The session stays available and the visit can be rebooked — same as a cancellation.
            </p>
          </div>
          <SettingsToggle
            checked={noShowPolicy === "do_not_deduct"}
            onChange={() => selectPolicy("do_not_deduct")}
            disabled={!isEditing || noShowPolicy === "do_not_deduct"}
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-security-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
            <UserX size={18} />
          </div>
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Deduct the session</p>
            <p className="settings-toggle-desc">
              The no-show consumes one session from the package, as if the service had been delivered.
            </p>
          </div>
          <SettingsToggle
            checked={noShowPolicy === "deduct_package"}
            onChange={() => selectPolicy("deduct_package")}
            disabled={!isEditing || noShowPolicy === "deduct_package"}
          />
        </div>
      </SettingsSection>
    </>
  );
}
