import { useState, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
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
    desc: "When a team member signs in",
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
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappSettingId, setWhatsappSettingId] = useState<EntityId | null>(null);

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
      if (stored.channels) {
        setGlobalEmail(stored.channels.email ?? true);
        setGlobalPush(stored.channels.push ?? true);
      }
      if (stored.events) setPrefs(stored.events);
      if (stored.digest) {
        setDigestMorning(stored.digest.morning ?? true);
        setDigestEvening(stored.digest.evening ?? false);
        setDigestWeekly(stored.digest.weekly ?? true);
      }
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
      setWhatsappPrefs((prev) => ({ ...prev, ...stored }));
    } catch {
      // malformed value — keep defaults
    }
  }, [settingItems]);

  const toggle = (key: NotifKey, channel: Channel) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !prev[key][channel],
      },
    }));
  };

  const toggleWhatsapp = (key: WhatsAppKey) => {
    setWhatsappPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const stored: NotifStorage = {
      channels: { email: globalEmail, push: globalPush },
      events: prefs,
      digest: { morning: digestMorning, evening: digestEvening, weekly: digestWeekly },
    };
    const value = JSON.stringify(stored);

    let ok = false;
    if (settingId) {
      const result = await dispatch(
        updateSettingThunk({ id: settingId, data: { key: NOTIF_KEY, value } })
      );
      ok = updateSettingThunk.fulfilled.match(result);
    } else {
      const result = await dispatch(
        createSettingThunk({ key: NOTIF_KEY, value, description: "Notification preferences" })
      );
      if (createSettingThunk.fulfilled.match(result)) {
        setSettingId(result.payload.id);
        ok = true;
      }
    }

    setSaving(false);
    if (ok) toast.success("Notification preferences saved");
    else toast.error("Failed to save preferences");
  };

  const handleSaveWhatsapp = async () => {
    setSavingWhatsapp(true);
    const value = JSON.stringify(whatsappPrefs);

    let ok = false;
    if (whatsappSettingId) {
      const result = await dispatch(
        updateSettingThunk({ id: whatsappSettingId, data: { key: WHATSAPP_KEY, value } })
      );
      ok = updateSettingThunk.fulfilled.match(result);
    } else {
      const result = await dispatch(
        createSettingThunk({ key: WHATSAPP_KEY, value, description: "WhatsApp notification preferences" })
      );
      if (createSettingThunk.fulfilled.match(result)) {
        setWhatsappSettingId(result.payload.id);
        ok = true;
      }
    }

    setSavingWhatsapp(false);
    if (ok) toast.success("WhatsApp notification preferences saved");
    else toast.error("Failed to save WhatsApp preferences");
  };

  return (
    <>
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Notifications</h2>
        <p className="settings-page-subtitle">
          Choose how and when you receive notifications about your business.
        </p>
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
            onChange={() => setGlobalEmail((v) => !v)}
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
            onChange={() => setGlobalPush((v) => !v)}
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
              />
            </div>

            <div className="notif-toggle-cell">
              <SettingsToggle
                checked={prefs[row.key].push && globalPush}
                onChange={() => toggle(row.key, "push")}
              />
            </div>
          </div>
        ))}

        {/* Save Action */}
        <div className="notif-table-footer">
          <Button
            size="sm"
            loading={saving}
            onClick={handleSave}
            iconLeft={<Save size={14} />}
          >
            Save preferences
          </Button>
        </div>
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
          <SettingsToggle checked={digestMorning} onChange={() => setDigestMorning((v) => !v)} />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Evening Report</p>
            <p className="settings-toggle-desc">
              Daily revenue, completed appointments, and new clients at 8:00 PM
            </p>
          </div>
          <SettingsToggle checked={digestEvening} onChange={() => setDigestEvening((v) => !v)} />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Weekly Performance Report</p>
            <p className="settings-toggle-desc">
              Detailed weekly analytics every Monday morning
            </p>
          </div>
          <SettingsToggle checked={digestWeekly} onChange={() => setDigestWeekly((v) => !v)} />
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
                  />
                  <span className="wa-notif-channel-label">WhatsApp</span>
                </label>
              </div>
            ))}
          </div>
        ))}
        <div className="notif-table-footer">
          <Button
            size="sm"
            loading={savingWhatsapp}
            onClick={handleSaveWhatsapp}
            iconLeft={<Save size={14} />}
          >
            Save preferences
          </Button>
        </div>
      </SettingsSection>
    </>
  );
}
