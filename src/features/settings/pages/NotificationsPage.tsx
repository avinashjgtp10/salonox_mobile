import { useState } from "react";
import {
  Bell,
  Mail,
  Smartphone,
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
import Button from "../../../components/ui/Button";
import SettingsToggle from "../components/SettingsToggle";
import SettingsSection from "../components/SettingsSection";

interface NotifChannel {
  email: boolean;
  sms: boolean;
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
  newAppointment: { email: true, sms: true, push: true },
  appointmentReminder: { email: true, sms: true, push: false },
  appointmentCancelled: { email: true, sms: false, push: true },
  appointmentCompleted: { email: false, sms: false, push: false },
  newPayment: { email: true, sms: false, push: true },
  paymentFailed: { email: true, sms: true, push: true },
  newClient: { email: true, sms: false, push: false },
  clientReview: { email: true, sms: false, push: true },
  newMessage: { email: false, sms: true, push: true },
  lowInventory: { email: true, sms: false, push: true },
  staffLogin: { email: false, sms: false, push: false },
  marketingCampaign: { email: true, sms: false, push: false },
};

type NotifKey = keyof NotifPrefs;
type Channel = "email" | "sms" | "push";

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
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [globalEmail, setGlobalEmail] = useState(true);
  const [globalSms, setGlobalSms] = useState(true);
  const [globalPush, setGlobalPush] = useState(true);

  const toggle = (key: NotifKey, channel: Channel) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !prev[key][channel],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success("Notification preferences saved");
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
              Receive notifications to {"{your email}"}
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
            style={{ background: "#f0fdf4", color: "#16a34a" }}
          >
            <Smartphone size={18} />
          </div>
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">SMS Notifications</p>
            <p className="settings-toggle-desc">
              Receive text messages on your phone
            </p>
          </div>
          <SettingsToggle
            checked={globalSms}
            onChange={() => setGlobalSms((v) => !v)}
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
          <span>SMS</span>
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
                checked={prefs[row.key].sms && globalSms}
                onChange={() => toggle(row.key, "sms")}
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
          <SettingsToggle checked onChange={() => {}} />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Evening Report</p>
            <p className="settings-toggle-desc">
              Daily revenue, completed appointments, and new clients at 8:00 PM
            </p>
          </div>
          <SettingsToggle checked={false} onChange={() => {}} />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Weekly Performance Report</p>
            <p className="settings-toggle-desc">
              Detailed weekly analytics every Monday morning
            </p>
          </div>
          <SettingsToggle checked onChange={() => {}} />
        </div>
      </SettingsSection>
    </>
  );
}
