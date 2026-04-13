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

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <label className="settings-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="settings-toggle-slider" />
    </label>
  );

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
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Notification Channels</p>
            <p className="settings-section-desc">
              Master switches for each delivery channel.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
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
            <Toggle
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
            <Toggle
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
            <Toggle
              checked={globalPush}
              onChange={() => setGlobalPush((v) => !v)}
            />
          </div>
        </div>
      </div>

      {/* Per-Event Preferences */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Event Notifications</p>
            <p className="settings-section-desc">
              Fine-tune which events trigger notifications on each channel.
            </p>
          </div>
        </div>
        <div className="settings-section-body" style={{ padding: 0 }}>
          {/* Header Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px 80px",
              padding: "10px 22px",
              background: "#f9fafb",
              borderBottom: "1px solid #f3f4f6",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <span>Event</span>
            <span style={{ textAlign: "center" }}>Email</span>
            <span style={{ textAlign: "center" }}>SMS</span>
            <span style={{ textAlign: "center" }}>Push</span>
          </div>

          {notifRows.map((row, idx) => (
            <div
              key={row.key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px 80px",
                padding: "14px 22px",
                borderBottom: idx < notifRows.length - 1 ? "1px solid #f3f4f6" : "none",
                alignItems: "center",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "#fafafa")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "")
              }
            >
              {/* Event Info */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: row.iconBg,
                    color: row.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {row.icon}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    {row.label}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      margin: 0,
                    }}
                  >
                    {row.desc}
                  </p>
                </div>
              </div>

              {/* Email toggle */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Toggle
                  checked={prefs[row.key].email && globalEmail}
                  onChange={() => toggle(row.key, "email")}
                />
              </div>

              {/* SMS toggle */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Toggle
                  checked={prefs[row.key].sms && globalSms}
                  onChange={() => toggle(row.key, "sms")}
                />
              </div>

              {/* Push toggle */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Toggle
                  checked={prefs[row.key].push && globalPush}
                  onChange={() => toggle(row.key, "push")}
                />
              </div>
            </div>
          ))}

          {/* Save Action */}
          <div
            style={{
              padding: "16px 22px",
              borderTop: "1px solid #f3f4f6",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button
              size="sm"
              loading={saving}
              onClick={handleSave}
              iconLeft={<Save size={14} />}
            >
              Save preferences
            </Button>
          </div>
        </div>
      </div>

      {/* Digest Settings */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Daily Digest</p>
            <p className="settings-section-desc">
              Receive a summary of your daily activity.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <p className="settings-toggle-title">Morning Summary</p>
              <p className="settings-toggle-desc">
                Get a daily overview of today's appointments at 8:00 AM
              </p>
            </div>
            <Toggle checked onChange={() => {}} />
          </div>
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <p className="settings-toggle-title">Evening Report</p>
              <p className="settings-toggle-desc">
                Daily revenue, completed appointments, and new clients at 8:00 PM
              </p>
            </div>
            <Toggle checked={false} onChange={() => {}} />
          </div>
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <p className="settings-toggle-title">Weekly Performance Report</p>
              <p className="settings-toggle-desc">
                Detailed weekly analytics every Monday morning
              </p>
            </div>
            <Toggle checked onChange={() => {}} />
          </div>
        </div>
      </div>
    </>
  );
}
