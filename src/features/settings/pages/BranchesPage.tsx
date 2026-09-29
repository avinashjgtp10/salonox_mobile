import { useState, useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  fetchMarketplaceProfileThunk,
  updateMarketplaceWorkingHoursThunk,
} from "../../../middleware/marketplace/marketplace.thunk";
import type { WorkingHoursDay } from "../../../types/marketplace.types";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";
import SettingsToggle from "../components/SettingsToggle";

// ─── Business Hours (salon-wide, used to bound Online Booking slots) ─────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayHours { open: boolean; from: string; to: string; }

const defaultHours: Record<string, DayHours> = {
  Monday:    { open: true,  from: "09:00", to: "18:00" },
  Tuesday:   { open: true,  from: "09:00", to: "18:00" },
  Wednesday: { open: true,  from: "09:00", to: "18:00" },
  Thursday:  { open: true,  from: "09:00", to: "18:00" },
  Friday:    { open: true,  from: "09:00", to: "18:00" },
  Saturday:  { open: true,  from: "10:00", to: "17:00" },
  Sunday:    { open: false, from: "10:00", to: "16:00" },
};

// day_of_week: 0=Sun, 1=Mon ... 6=Sat (matches the backend's convention)
const DAY_NAME_TO_NUM: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};
const NUM_TO_DAY_NAME: Record<number, string> =
  Object.fromEntries(Object.entries(DAY_NAME_TO_NUM).map(([k, v]) => [v, k]));

function hoursStateToApi(hours: Record<string, DayHours>): WorkingHoursDay[] {
  return DAYS.map((day) => {
    const h = hours[day];
    const day_of_week = DAY_NAME_TO_NUM[day];
    if (!h.open) return { day_of_week, is_open: false, slots: [] };
    return { day_of_week, is_open: true, slots: [{ open_time: `${h.from}:00`, close_time: `${h.to}:00` }] };
  });
}

function apiToHoursState(days: WorkingHoursDay[]): Record<string, DayHours> {
  const next: Record<string, DayHours> = { ...defaultHours };
  for (const d of days) {
    const name = NUM_TO_DAY_NAME[d.day_of_week];
    if (!name) continue;
    if (!d.is_open || d.slots.length === 0) {
      next[name] = { ...next[name], open: false };
    } else {
      next[name] = { open: true, from: d.slots[0].open_time.slice(0, 5), to: d.slots[0].close_time.slice(0, 5) };
    }
  }
  return next;
}

function BusinessHoursSection() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const [hours, setHours] = useState(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchMarketplaceProfileThunk())
      .unwrap()
      .then((profile) => {
        if (profile.working_hours?.length) setHours(apiToHoursState(profile.working_hours));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dispatch]);

  const updateHour = (day: string, key: keyof DayHours, value: string | boolean) =>
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));

  const handleSave = async () => {
    setSaving(true);
    const result = await dispatch(updateMarketplaceWorkingHoursThunk({ days: hoursStateToApi(hours) }));
    setSaving(false);
    if (updateMarketplaceWorkingHoursThunk.fulfilled.match(result)) {
      showSuccess("Business hours updated");
    } else {
      showError((result as any)?.payload ?? "Failed to update business hours");
    }
  };

  return (
    <SettingsSection
      title="Business Hours"
      headerAction={
        <Button size="sm" variant="primary" onClick={handleSave} loading={saving}>
          Save
        </Button>
      }
    >
      {overlay}
      {loading ? (
        <p className="settings-hint">Loading business hours…</p>
      ) : (
        <>
          <p className="settings-hint mb-2">
            These hours apply salon-wide and control when clients can book online — a day marked Closed offers no
            booking slots at all, regardless of individual staff schedules.
          </p>
          {DAYS.map((day) => {
            const h = hours[day];
            return (
              <div key={day} className="settings-security-item">
                <div className="settings-security-info d-flex align-items-center gap-2">
                  <SettingsToggle checked={h.open} onChange={() => updateHour(day, "open", !h.open)} />
                  <p className="settings-security-name mb-0" style={{ minWidth: 90 }}>{day}</p>
                </div>
                {h.open ? (
                  <div className="d-flex align-items-center gap-2">
                    <input
                      className="settings-input"
                      type="time"
                      value={h.from}
                      onChange={(e) => updateHour(day, "from", e.target.value)}
                      style={{ height: 34 }}
                    />
                    <span>to</span>
                    <input
                      className="settings-input"
                      type="time"
                      value={h.to}
                      onChange={(e) => updateHour(day, "to", e.target.value)}
                      style={{ height: 34 }}
                    />
                  </div>
                ) : (
                  <span className="s-badge s-badge-gray" style={{ fontSize: 10 }}>Closed</span>
                )}
              </div>
            );
          })}
        </>
      )}
    </SettingsSection>
  );
}

export default function BranchesPage() {
  return (
    <>
      <div className="settings-page-header">
        <h2 className="settings-page-title">Business Hours</h2>
        <p className="settings-page-subtitle">Manage your salon's business hours.</p>
      </div>

      <BusinessHoursSection />
    </>
  );
}
