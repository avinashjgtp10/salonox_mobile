import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Mail,
  Monitor,
  Calendar,
  DollarSign,
  UserPlus,
  MessageSquare,
  Star,
  AlertCircle,
  Save,
  Pencil,
  X,
} from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import type { EntityId } from "../../../types/common.types";
import Button from "../../../components/ui/Button";
import SettingsToggle from "../components/SettingsToggle";
import SettingsSection from "../components/SettingsSection";

const NOTIF_KEY = "notification_preferences";
const WHATSAPP_KEY = "whatsapp_notification_preferences";

interface NotifStorage {
  channels: { email: boolean; push: boolean };
  events: NotifPrefs;
  digest: { morning: boolean; evening: boolean; weekly: boolean };
}

interface WhatsAppPrefs {
  quotationPlaced: boolean;
  quotationRequested: boolean;
  anniversaryOffer: boolean;
  birthdayOffer: boolean;
  loyaltyExpiry: boolean;
  loyaltyEarning: boolean;
  membershipPurchase: boolean;
  membershipExpiry: boolean;
  membershipRenewal: boolean;
  onlineRedeemable: boolean;
  appointmentOnlineBooked: boolean;
  appointmentConfirmed: boolean;
  appointmentCancelled: boolean;
}

type WhatsAppKey = keyof WhatsAppPrefs;

const defaultWhatsAppPrefs: WhatsAppPrefs = {
  quotationPlaced: true,
  quotationRequested: true,
  anniversaryOffer: false,
  birthdayOffer: true,
  loyaltyExpiry: true,
  loyaltyEarning: true,
  membershipPurchase: true,
  membershipExpiry: true,
  membershipRenewal: true,
  onlineRedeemable: false,
  appointmentOnlineBooked: true,
  appointmentConfirmed: true,
  appointmentCancelled: false,
};

interface WhatsAppGroup {
  label: string;
  items: { key: WhatsAppKey; label: string }[];
}

const whatsappGroups: WhatsAppGroup[] = [
  {
    label: "Quotation",
    items: [
      { key: "quotationPlaced", label: "Quotation Placed Message to customer" },
      { key: "quotationRequested", label: "Quotation Requested Message to Owner" },
    ],
  },
  {
    label: "Occasional",
    items: [
      { key: "anniversaryOffer", label: "Anniversary Offer" },
      { key: "birthdayOffer", label: "Birthday Offer" },
    ],
  },
  {
    label: "Loyalty",
    items: [
      { key: "loyaltyExpiry", label: "Loyalty Expiry Reminder" },
      { key: "loyaltyEarning", label: "Loyalty Earning" },
    ],
  },
  {
    label: "Membership",
    items: [
      { key: "membershipPurchase", label: "Membership Purchase" },
      { key: "membershipExpiry", label: "Membership Expiry" },
      { key: "membershipRenewal", label: "Membership Renewal" },
      { key: "onlineRedeemable", label: "Online Redeemable purchase to Owner" },
    ],
  },
  {
    label: "Appointment",
    items: [
      { key: "appointmentOnlineBooked", label: "Appointment Online booked message to Salon Owner" },
      { key: "appointmentConfirmed", label: "Appointment Confirmed message to Customer" },
      { key: "appointmentCancelled", label: "Appointment Cancelled message to Customer" },
    ],
  },
];

interface NotifChannel {
  email: boolean;
  push: boolean;
}

interface NotifPrefs {
  newAppointment: NotifChannel;
  appointmentReminder: NotifChannel;
  appointmentCancelled: NotifChannel;
  appointmentCompleted: NotifChannel;
  newPayment: NotifChannel;
  paymentFailed: NotifChannel;
  newClient: NotifChannel;
  clientReview: NotifChannel;
  newMessage: NotifChannel;
  lowInventory: NotifChannel;
  staffLogin: NotifChannel;
  marketingCampaign: NotifChannel;
}

const defaultPrefs: NotifPrefs = {
  newAppointment: { email: true, push: true },
  appointmentReminder: { email: true, push: false },
  appointmentCancelled: { email: true, push: true },
  appointmentCompleted: { email: false, push: false },
  newPayment: { email: true, push: true },
  paymentFailed: { email: true, push: true },
  newClient: { email: true, push: false },
  clientReview: { email: true, push: true },
  newMessage: { email: false, push: true },
  lowInventory: { email: true, push: true },
  staffLogin: { email: false, push: false },
  marketingCampaign: { email: true, push: false },
};

type NotifKey = keyof NotifPrefs;
type Channel = "email" | "push";

interface NotifRow {
  key: NotifKey;
  label: string;
  desc: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const notifRows: NotifRow[] = [
  {
    key: "newAppointment",
    label: "New Appointment",
    desc: "When a new booking is confirmed",
    icon: <Calendar size={16} />,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
  },
  {
    key: "appointmentReminder",
    label: "Appointment Reminder",
    desc: "24h and 1h before appointment",
    icon: <Bell size={16} />,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
  },
  {
    key: "appointmentCancelled",
    label: "Appointment Cancelled",
    desc: "When a client cancels a booking",
    icon: <AlertCircle size={16} />,
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
  },
  {
    key: "appointmentCompleted",
    label: "Appointment Completed",
    desc: "After a service is marked done",
    icon: <Calendar size={16} />,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
  },
  {
    key: "newPayment",
    label: "New Payment",
    desc: "When a payment is received",
    icon: <DollarSign size={16} />,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
  },
  {
    key: "paymentFailed",
    label: "Payment Failed",
    desc: "When a payment attempt fails",
    icon: <DollarSign size={16} />,
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
  },
  {
    key: "newClient",
    label: "New Client",
    desc: "When a new client registers",
    icon: <UserPlus size={16} />,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
  },
  {
    key: "clientReview",
    label: "Client Review",
    desc: "When a client leaves a review",
    icon: <Star size={16} />,
    iconBg: "#fffbeb",
    iconColor: "#d97706",
  },
  {
    key: "newMessage",
    label: "New Message",
    desc: "When you receive a client message",
    icon: <MessageSquare size={16} />,
    iconBg: "#eff6ff",
    iconColor: "#7c3aed",
  },
  {
    key: "lowInventory",
    label: "Low Inventory",
    desc: "When a product stock runs low",
    icon: <AlertCircle size={16} />,
    iconBg: "#fffbeb",
    iconColor: "#d97706",
  },
  {
    key: "staffLogin",
    label: "Staff Login",
    desc: "When a staff member signs in",
    icon: <UserPlus size={16} />,
    iconBg: "#f3f4f6",
    iconColor: "#374151",
  },
  {
    key: "marketingCampaign",
    label: "Campaign Results",
    desc: "When a campaign is completed",
    icon: <Mail size={16} />,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
  },
];

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const { items: settingItems } = useAppSelector((s) => s.setting);
  const { profile } = useAppSelector((s) => s.user);

  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [globalEmail, setGlobalEmail] = useState(true);
  const [globalPush, setGlobalPush] = useState(true);
  const [digestMorning, setDigestMorning] = useState(true);
  const [digestEvening, setDigestEvening] = useState(false);
  const [digestWeekly, setDigestWeekly] = useState(true);
  const [settingId, setSettingId] = useState<EntityId | null>(null);

  const [whatsappPrefs, setWhatsappPrefs] = useState<WhatsAppPrefs>(defaultWhatsAppPrefs);
  const [whatsappSettingId, setWhatsappSettingId] = useState<EntityId | null>(null);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // Single page-level View <-> Edit toggle — every toggle across every
  // section (Channels, Events, Digest, WhatsApp) becomes editable together
  // and saves together, instead of each section having its own Save button.
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty,   setIsDirty]   = useState(false);

  // Last-saved values, restored verbatim on Cancel. Kept as a ref (not
  // state) since it only needs to be read/written on load and on
  // Cancel/Save, never re-rendered off of.
  const savedSnapshot = useRef({
    globalEmail: true, globalPush: true, prefs: defaultPrefs,
    digestMorning: true, digestEvening: false, digestWeekly: true,
    whatsappPrefs: defaultWhatsAppPrefs,
  });

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  useEffect(() => {
    const found = settingItems.find((s) => s.key === NOTIF_KEY);
    if (!found) return;
    setSettingId(found.id);
    try {
      const raw = typeof found.value === "string" ? found.value : JSON.stringify(found.value);
      const stored: NotifStorage = JSON.parse(raw);
      const nextEmail = stored.channels?.email ?? true;
      const nextPush = stored.channels?.push ?? true;
      const nextEvents = stored.events ?? defaultPrefs;
      const nextMorning = stored.digest?.morning ?? true;
      const nextEvening = stored.digest?.evening ?? false;
      const nextWeekly = stored.digest?.weekly ?? true;

      setGlobalEmail(nextEmail);
      setGlobalPush(nextPush);
      setPrefs(nextEvents);
      setDigestMorning(nextMorning);
      setDigestEvening(nextEvening);
      setDigestWeekly(nextWeekly);

      savedSnapshot.current = {
        ...savedSnapshot.current,
        globalEmail: nextEmail, globalPush: nextPush, prefs: nextEvents,
        digestMorning: nextMorning, digestEvening: nextEvening, digestWeekly: nextWeekly,
      };
    } catch {
      // malformed value — keep defaults
    }
  }, [settingItems]);

  useEffect(() => {
    const found = settingItems.find((s) => s.key === WHATSAPP_KEY);
    if (!found) return;
    setWhatsappSettingId(found.id);
    try {
      const raw = typeof found.value === "string" ? found.value : JSON.stringify(found.value);
      const stored: WhatsAppPrefs = JSON.parse(raw);
      const next = { ...defaultWhatsAppPrefs, ...stored };
      setWhatsappPrefs(next);
      savedSnapshot.current = { ...savedSnapshot.current, whatsappPrefs: next };
    } catch {
      // malformed value — keep defaults
    }
  }, [settingItems]);

  // Warn on tab close/refresh with unsaved changes still pending.
  useEffect(() => {
    if (!isEditing || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditing, isDirty]);

  const toggle = (key: NotifKey, channel: Channel) => {
    setIsDirty(true);
    setPrefs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !prev[key][channel],
      },
    }));
  };

  const toggleWhatsapp = (key: WhatsAppKey) => {
    setIsDirty(true);
    setWhatsappPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setIsDirty(true);
    setter(v);
  };

  // Two settings rows (NOTIF_KEY, WHATSAPP_KEY) persisted independently on
  // the backend, but presented and saved together as one page-level edit.
  const saveNotifPrefs = async (): Promise<boolean> => {
    const stored: NotifStorage = {
      channels: { email: globalEmail, push: globalPush },
      events: prefs,
      digest: { morning: digestMorning, evening: digestEvening, weekly: digestWeekly },
    };
    const value = JSON.stringify(stored);

    if (settingId) {
      const result = await dispatch(
        updateSettingThunk({ id: settingId, data: { key: NOTIF_KEY, value } })
      );
      return updateSettingThunk.fulfilled.match(result);
    }
    const result = await dispatch(
      createSettingThunk({ key: NOTIF_KEY, value, description: "Notification preferences" })
    );
    if (createSettingThunk.fulfilled.match(result)) {
      setSettingId(result.payload.id);
      return true;
    }
    return false;
  };

  const saveWhatsappPrefs = async (): Promise<boolean> => {
    const value = JSON.stringify(whatsappPrefs);

    if (whatsappSettingId) {
      const result = await dispatch(
        updateSettingThunk({ id: whatsappSettingId, data: { key: WHATSAPP_KEY, value } })
      );
      return updateSettingThunk.fulfilled.match(result);
    }
    const result = await dispatch(
      createSettingThunk({ key: WHATSAPP_KEY, value, description: "WhatsApp notification preferences" })
    );
    if (createSettingThunk.fulfilled.match(result)) {
      setWhatsappSettingId(result.payload.id);
      return true;
    }
    return false;
  };

  const startEditing = () => {
    setIsEditing(true);
    setIsDirty(false);
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
    const snap = savedSnapshot.current;
    setGlobalEmail(snap.globalEmail);
    setGlobalPush(snap.globalPush);
    setPrefs(snap.prefs);
    setDigestMorning(snap.digestMorning);
    setDigestEvening(snap.digestEvening);
    setDigestWeekly(snap.digestWeekly);
    setWhatsappPrefs(snap.whatsappPrefs);
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!isDirty) {
      // Nothing changed — just leave edit mode instead of firing a no-op save.
      setIsEditing(false);
      return;
    }

    setSaving(true);
    const [notifOk, whatsappOk] = await Promise.all([saveNotifPrefs(), saveWhatsappPrefs()]);
    setSaving(false);

    if (notifOk && whatsappOk) {
      showSuccess("Notification preferences saved");
      savedSnapshot.current = {
        globalEmail, globalPush, prefs,
        digestMorning, digestEvening, digestWeekly,
        whatsappPrefs,
      };
      setIsDirty(false);
      setIsEditing(false);
    } else {
      showError("Failed to save some notification preferences");
    }
  };

  return (
    <>
      {overlay}
      {/* Page Header */}
      <div className="settings-page-header settings-page-header--with-actions">
        <div>
          <h2 className="settings-page-title">Notifications</h2>
          <p className="settings-page-subtitle">
            Choose how and when you receive notifications about your business.
          </p>
        </div>
        {!isEditing ? (
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={startEditing}
            iconLeft={<Pencil size={13} />}
          >
            Edit
          </Button>
        ) : (
          <div className="settings-section-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              iconLeft={<X size={13} />}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={saving}
              onClick={handleSave}
              disabled={saving}
              iconLeft={<Save size={14} />}
            >
              Save changes
            </Button>
          </div>
        )}
      </div>

      {/* Global Channels */}
      <SettingsSection
        title="Notification Channels"
        desc="Master switches for each delivery channel."
      >
        <div className="settings-toggle-row">
          <div
            className="settings-security-icon"
            style={{ background: "#eff6ff", color: "#2563eb" }}
          >
            <Mail size={18} />
          </div>
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Email Notifications</p>
            <p className="settings-toggle-desc">
              Receive notifications to {profile?.email ?? "your email"}
            </p>
          </div>
          <SettingsToggle
            checked={globalEmail}
            onChange={() => markDirty(setGlobalEmail)(!globalEmail)}
            disabled={!isEditing}
          />
        </div>

        <div className="settings-toggle-row">
          <div
            className="settings-security-icon"
            style={{ background: "#fffbeb", color: "#d97706" }}
          >
            <Monitor size={18} />
          </div>
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">In-App / Push Notifications</p>
            <p className="settings-toggle-desc">
              Receive alerts directly in the dashboard
            </p>
          </div>
          <SettingsToggle
            checked={globalPush}
            onChange={() => markDirty(setGlobalPush)(!globalPush)}
            disabled={!isEditing}
          />
        </div>
      </SettingsSection>

      {/* Per-Event Preferences */}
      <SettingsSection
        title="Event Notifications"
        desc="Fine-tune which events trigger notifications on each channel."
        noPadding
      >
        {/* Header Row */}
        <div className="notif-table-header">
          <span>Event</span>
          <span>Email</span>
          <span>Push</span>
        </div>

        {notifRows.map((row) => (
          <div key={row.key} className="notif-table-row">
            {/* Event Info */}
            <div className="notif-event-info">
              <div
                className="notif-event-icon"
                style={{ background: row.iconBg, color: row.iconColor }}
              >
                {row.icon}
              </div>
              <div>
                <p className="notif-event-label">{row.label}</p>
                <p className="notif-event-desc">{row.desc}</p>
              </div>
            </div>

            <div className="notif-toggle-cell">
              <SettingsToggle
                checked={prefs[row.key].email && globalEmail}
                onChange={() => toggle(row.key, "email")}
                disabled={!isEditing}
              />
            </div>

            <div className="notif-toggle-cell">
              <SettingsToggle
                checked={prefs[row.key].push && globalPush}
                onChange={() => toggle(row.key, "push")}
                disabled={!isEditing}
              />
            </div>
          </div>
        ))}
      </SettingsSection>

      {/* Digest Settings */}
      <SettingsSection
        title="Daily Digest"
        desc="Receive a summary of your daily activity."
      >
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Morning Summary</p>
            <p className="settings-toggle-desc">
              Get a daily overview of today's appointments at 8:00 AM
            </p>
          </div>
          <SettingsToggle
            checked={digestMorning}
            onChange={() => markDirty(setDigestMorning)(!digestMorning)}
            disabled={!isEditing}
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Evening Report</p>
            <p className="settings-toggle-desc">
              Daily revenue, completed appointments, and new clients at 8:00 PM
            </p>
          </div>
          <SettingsToggle
            checked={digestEvening}
            onChange={() => markDirty(setDigestEvening)(!digestEvening)}
            disabled={!isEditing}
          />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Weekly Performance Report</p>
            <p className="settings-toggle-desc">
              Detailed weekly analytics every Monday morning
            </p>
          </div>
          <SettingsToggle
            checked={digestWeekly}
            onChange={() => markDirty(setDigestWeekly)(!digestWeekly)}
            disabled={!isEditing}
          />
        </div>
      </SettingsSection>

      {/* WhatsApp Notification Settings */}
      <SettingsSection
        title="WhatsApp Notification Settings"
        desc="Control which events send WhatsApp messages to customers and owners."
        noPadding
      >
        {whatsappGroups.map((group, gi) => (
          <div key={group.label} className={`wa-notif-group${gi > 0 ? " wa-notif-group--bordered" : ""}`}>
            <p className="wa-notif-group-label">{group.label}</p>
            {group.items.map((item) => (
              <div key={item.key} className="wa-notif-row">
                <span className="wa-notif-row-label">{item.label}</span>
                <label className="wa-notif-checkbox-wrap">
                  <input
                    type="checkbox"
                    className="wa-notif-checkbox"
                    checked={whatsappPrefs[item.key]}
                    onChange={() => toggleWhatsapp(item.key)}
                    disabled={!isEditing}
                  />
                  <span className="wa-notif-channel-label">WhatsApp</span>
                </label>
              </div>
            ))}
          </div>
        ))}
      </SettingsSection>
    </>
  );
}
