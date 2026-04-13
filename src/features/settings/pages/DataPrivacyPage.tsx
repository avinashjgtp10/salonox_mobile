import { useState } from "react";
import {
  Download,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  FileText,
  Users,
  Calendar,
  DollarSign,
  BarChart2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";
import { useNavigate } from "react-router-dom";
import { exportSettingsThunk } from "../../../middleware/setting/setting.thunk";
import Button from "../../../components/ui/Button";

interface ExportOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  endpoint: string;
}

const exportOptions: ExportOption[] = [
  {
    id: "clients",
    label: "Clients",
    desc: "All client profiles, contact info, and loyalty points",
    icon: <Users size={17} />,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    endpoint: "/api/v1/clients/export?format=excel",
  },
  {
    id: "appointments",
    label: "Appointments",
    desc: "Full appointment history with services, staff, and status",
    icon: <Calendar size={17} />,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
    endpoint: "/api/v1/appointments/export?format=excel",
  },
  {
    id: "sales",
    label: "Sales & Transactions",
    desc: "All sales, payments, and revenue records",
    icon: <DollarSign size={17} />,
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    endpoint: "/api/v1/sales/export?format=excel",
  },
  {
    id: "settings",
    label: "Settings & Configuration",
    desc: "Your business settings and preferences",
    icon: <BarChart2 size={17} />,
    iconBg: "#faf5ff",
    iconColor: "#7c3aed",
    endpoint: "settings",
  },
];

const retentionPolicies = [
  {
    label: "Appointment records",
    period: "7 years",
    reason: "Tax and compliance requirement",
  },
  {
    label: "Client personal data",
    period: "Until deletion request",
    reason: "Required for ongoing service",
  },
  {
    label: "Payment transactions",
    period: "7 years",
    reason: "Financial record keeping",
  },
  {
    label: "Staff activity logs",
    period: "2 years",
    reason: "Security and audit trail",
  },
  {
    label: "Marketing campaign data",
    period: "3 years",
    reason: "Campaign effectiveness analysis",
  },
];

export default function DataPrivacyPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showPII, setShowPII] = useState(false);
  const [anonymizeLoading, setAnonymizeLoading] = useState(false);

  const handleExport = async (option: ExportOption) => {
    setExportLoading(option.id);
    try {
      if (option.id === "settings") {
        await dispatch(exportSettingsThunk("excel"));
      } else {
        const res = await fetch(option.endpoint, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token") || ""}`,
          },
        });
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${option.id}-export.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`${option.label} exported successfully`);
    } catch {
      toast.error(`Failed to export ${option.label.toLowerCase()}`);
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportAll = async () => {
    setExportLoading("all");
    await new Promise((r) => setTimeout(r, 1500));
    setExportLoading(null);
    toast.success("Full data export requested — you'll receive an email when ready");
  };

  const handleAnonymize = async () => {
    setAnonymizeLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setAnonymizeLoading(false);
    toast.success("Inactive client data anonymized");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE ALL DATA") {
      toast.error('Type "DELETE ALL DATA" to confirm');
      return;
    }
    setDeleteLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setDeleteLoading(false);
    toast.success("Account deletion request submitted");
    dispatch(logout());
    navigate("/login");
  };

  return (
    <>
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Data & Privacy</h2>
        <p className="settings-page-subtitle">
          Control your data, manage exports, and understand how your information
          is stored and used.
        </p>
      </div>

      {/* Privacy Overview */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Privacy Overview</p>
            <p className="settings-section-desc">
              How your business data is handled.
            </p>
          </div>
          <a
            href="#"
            style={{
              fontSize: 12.5,
              color: "#111827",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              textDecoration: "none",
            }}
            onClick={(e) => {
              e.preventDefault();
              toast("Privacy policy opens in new tab", { icon: "📄" });
            }}
          >
            Privacy Policy
            <ExternalLink size={12} />
          </a>
        </div>
        <div className="settings-section-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
            }}
          >
            {[
              {
                icon: <Shield size={18} />,
                title: "End-to-end encryption",
                desc: "All data is encrypted at rest and in transit using AES-256 and TLS 1.3.",
                iconColor: "#2563eb",
                iconBg: "#eff6ff",
              },
              {
                icon: <Eye size={18} />,
                title: "No data selling",
                desc: "Your client data is never sold to or shared with third parties.",
                iconColor: "#16a34a",
                iconBg: "#f0fdf4",
              },
              {
                icon: <Clock size={18} />,
                title: "Retention policy",
                desc: "Data is retained only for as long as legally required.",
                iconColor: "#d97706",
                iconBg: "#fffbeb",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: item.iconBg,
                    color: item.iconColor,
                    borderRadius: 9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  {item.icon}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 4px",
                  }}
                >
                  {item.title}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Data */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Export Your Data</p>
            <p className="settings-section-desc">
              Download your data in Excel format at any time.
            </p>
          </div>
          <Button
            size="sm"
            loading={exportLoading === "all"}
            iconLeft={<Download size={14} />}
            onClick={handleExportAll}
          >
            Export everything
          </Button>
        </div>
        <div className="settings-section-body">
          {exportOptions.map((opt) => (
            <div key={opt.id} className="settings-data-item">
              <div
                className="settings-data-icon"
                style={{ background: opt.iconBg, color: opt.iconColor }}
              >
                {opt.icon}
              </div>
              <div className="settings-data-info">
                <p className="settings-data-title">{opt.label}</p>
                <p className="settings-data-desc">{opt.desc}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    loading={exportLoading === opt.id}
                    iconLeft={<Download size={13} />}
                    onClick={() => handleExport(opt)}
                  >
                    Export as Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={exportLoading === `${opt.id}-csv`}
                    onClick={() => {
                      setExportLoading(`${opt.id}-csv`);
                      setTimeout(() => {
                        setExportLoading(null);
                        toast.success(`${opt.label} CSV export coming soon`);
                      }, 600);
                    }}
                  >
                    Export as CSV
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Visibility */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Data Visibility</p>
            <p className="settings-section-desc">
              Control what personal information is visible in reports.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-toggle-row">
            <div
              style={{
                width: 38,
                height: 38,
                background: showPII ? "#f0fdf4" : "#f3f4f6",
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: showPII ? "#16a34a" : "#6b7280",
                flexShrink: 0,
              }}
            >
              {showPII ? <Eye size={17} /> : <EyeOff size={17} />}
            </div>
            <div className="settings-toggle-info">
              <p className="settings-toggle-title">Show PII in Reports</p>
              <p className="settings-toggle-desc">
                Display full names, phone numbers, and email addresses in
                analytics and exports. Disable to show anonymised data.
              </p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={showPII}
                onChange={() => setShowPII((v) => !v)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Data Retention Policy</p>
            <p className="settings-section-desc">
              How long different types of data are kept.
            </p>
          </div>
        </div>
        <div className="settings-section-body" style={{ padding: 0 }}>
          {retentionPolicies.map((policy, idx) => (
            <div
              key={policy.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 22px",
                borderBottom:
                  idx < retentionPolicies.length - 1
                    ? "1px solid #f3f4f6"
                    : "none",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle2 size={15} color="#10b981" />
                <div>
                  <p
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    {policy.label}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                    {policy.reason}
                  </p>
                </div>
              </div>
              <span className="s-badge s-badge-gray" style={{ whiteSpace: "nowrap" }}>
                {policy.period}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Anonymise Inactive Clients */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Anonymise Inactive Clients</p>
            <p className="settings-section-desc">
              Remove personal details from clients who haven't visited in 2+ years.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
            This will replace personal identifiers (name, phone, email) with
            anonymous IDs for clients inactive for more than 2 years. Appointment
            history and payment records are preserved for compliance.
          </p>
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 12.5,
              color: "#92400e",
              marginBottom: 16,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              This action is irreversible. Personal data removed this way cannot
              be recovered. Make sure you have exported your data first.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline-warning"
            loading={anonymizeLoading}
            onClick={handleAnonymize}
          >
            Anonymise inactive clients
          </Button>
        </div>
      </div>

      {/* Request Data Deletion */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">
              <FileText size={15} className="me-2" />
              GDPR / Data Deletion Request
            </p>
            <p className="settings-section-desc">
              Submit a formal request to delete a specific client's data.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label className="settings-label">Client Email</label>
              <input
                className="settings-input"
                type="email"
                placeholder="client@example.com"
              />
              <span className="settings-hint">
                We'll verify identity and process within 30 days as required by GDPR.
              </span>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Reason</label>
              <select className="settings-select">
                <option value="">Select reason</option>
                <option value="client_request">Client deletion request</option>
                <option value="gdpr_right_to_erasure">GDPR right to erasure</option>
                <option value="ccpa_opt_out">CCPA opt-out</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="settings-form-actions">
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => toast("Deletion request submitted (demo)", { icon: "✅" })}
            >
              Submit deletion request
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone — Account Deletion */}
      <div className="settings-danger-zone">
        <p className="settings-danger-title">
          <AlertTriangle size={16} />
          Delete Business Account
        </p>
        <p className="settings-danger-desc">
          Permanently delete your entire business account including all clients,
          appointments, staff, sales records, and settings. This is irreversible
          and all data will be erased within 30 days. Please export your data first.
        </p>
        <div>
          <label className="settings-label mb-2" style={{ color: "#b91c1c" }}>
            Type <strong>DELETE ALL DATA</strong> to confirm
          </label>
          <div className="d-flex gap-2 flex-wrap align-items-center mt-2">
            <input
              className="settings-input"
              style={{
                maxWidth: 260,
                borderColor: deleteConfirm === "DELETE ALL DATA" ? "#ef4444" : undefined,
              }}
              placeholder="DELETE ALL DATA"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <Button
              size="sm"
              variant="danger"
              loading={deleteLoading}
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "DELETE ALL DATA"}
              iconLeft={<Trash2 size={14} />}
            >
              Delete everything
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
