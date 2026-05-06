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
import api from "../../../services/api/axios";
import { downloadBlob } from "../../../utils/downloadBlob";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";
import SettingsToggle from "../components/SettingsToggle";

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

const privacyCards = [
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
];

export default function DataPrivacyPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showPII, setShowPII] = useState(false);
  const [anonymizeLoading, setAnonymizeLoading] = useState(false);
  const [gdprEmail, setGdprEmail] = useState("");
  const [gdprReason, setGdprReason] = useState("");
  const [gdprLoading, setGdprLoading] = useState(false);

  const handleExport = async (option: ExportOption, format: "excel" | "csv" = "excel") => {
    const loadingKey = format === "csv" ? `${option.id}-csv` : option.id;
    setExportLoading(loadingKey);
    try {
      if (option.id === "settings") {
        await dispatch(exportSettingsThunk(format));
      } else {
        const endpoint = option.endpoint.replace("excel", format);
        const res = await api.get(endpoint, { responseType: "blob" });
        downloadBlob(res.data, `${option.id}-export.${format === "excel" ? "xlsx" : "csv"}`);
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
    try {
      // Export each data type sequentially
      for (const opt of exportOptions) {
        if (opt.id !== "settings") {
          const res = await api.get(opt.endpoint, { responseType: "blob" });
          downloadBlob(res.data, `${opt.id}-export.xlsx`);
        }
      }
      await dispatch(exportSettingsThunk("excel"));
      toast.success("All data exported successfully");
    } catch {
      toast.error("Some exports failed — check individual exports below");
    } finally {
      setExportLoading(null);
    }
  };

  const handleAnonymize = async () => {
    setAnonymizeLoading(true);
    try {
      await api.post("/api/v1/clients/anonymize-inactive");
      toast.success("Inactive client data anonymized");
    } catch {
      toast("Anonymisation endpoint not available yet", { icon: "ℹ️" });
    } finally {
      setAnonymizeLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE ALL DATA") {
      toast.error('Type "DELETE ALL DATA" to confirm');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete("/api/v1/auth/account");
      toast.success("Account deletion requested. Data will be erased within 30 days.");
      dispatch(logout());
      navigate("/login");
    } catch {
      toast.error("Failed to submit deletion request. Contact support.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const privacyPolicyLink = (
    <a
      href="#"
      className="settings-privacy-link"
      onClick={(e) => {
        e.preventDefault();
        toast("Privacy policy opens in new tab", { icon: "📄" });
      }}
    >
      Privacy Policy
      <ExternalLink size={12} />
    </a>
  );

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
      <SettingsSection
        title="Privacy Overview"
        desc="How your business data is handled."
        headerAction={privacyPolicyLink}
      >
        <div className="settings-privacy-grid">
          {privacyCards.map((item) => (
            <div key={item.title} className="settings-privacy-card">
              <div
                className="settings-privacy-card-icon"
                style={{ background: item.iconBg, color: item.iconColor }}
              >
                {item.icon}
              </div>
              <p className="settings-privacy-card-title">{item.title}</p>
              <p className="settings-privacy-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Export Data */}
      <SettingsSection
        title="Export Your Data"
        desc="Download your data in Excel format at any time."
        headerAction={
          <Button
            size="sm"
            loading={exportLoading === "all"}
            iconLeft={<Download size={14} />}
            onClick={handleExportAll}
          >
            Export everything
          </Button>
        }
      >
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
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  loading={exportLoading === opt.id}
                  iconLeft={<Download size={13} />}
                  onClick={() => handleExport(opt, "excel")}
                >
                  Export as Excel
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={exportLoading === `${opt.id}-csv`}
                  onClick={() => handleExport(opt, "csv")}
                >
                  Export as CSV
                </Button>
              </div>
            </div>
          </div>
        ))}
      </SettingsSection>

      {/* Data Visibility */}
      <SettingsSection
        title="Data Visibility"
        desc="Control what personal information is visible in reports."
      >
        <div className="settings-toggle-row">
          <div
            className="settings-security-icon"
            style={{
              background: showPII ? "#f0fdf4" : "#f3f4f6",
              color: showPII ? "#16a34a" : "#6b7280",
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
          <SettingsToggle checked={showPII} onChange={() => setShowPII((v) => !v)} />
        </div>
      </SettingsSection>

      {/* Data Retention */}
      <SettingsSection
        title="Data Retention Policy"
        desc="How long different types of data are kept."
        noPadding
      >
        {retentionPolicies.map((policy) => (
          <div key={policy.label} className="settings-retention-row">
            <div className="settings-retention-info">
              <CheckCircle2 size={15} color="#10b981" />
              <div>
                <p className="settings-retention-label">{policy.label}</p>
                <p className="settings-retention-reason">{policy.reason}</p>
              </div>
            </div>
            <span className="s-badge s-badge-gray" style={{ whiteSpace: "nowrap" }}>
              {policy.period}
            </span>
          </div>
        ))}
      </SettingsSection>

      {/* Anonymise Inactive Clients */}
      <SettingsSection
        title="Anonymise Inactive Clients"
        desc="Remove personal details from clients who haven't visited in 2+ years."
      >
        <p className="settings-anonymize-info">
          This will replace personal identifiers (name, phone, email) with
          anonymous IDs for clients inactive for more than 2 years. Appointment
          history and payment records are preserved for compliance.
        </p>
        <div className="settings-anonymize-warning">
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
      </SettingsSection>

      {/* Request Data Deletion */}
      <SettingsSection
        title={
          <>
            <FileText size={15} className="me-2" />
            GDPR / Data Deletion Request
          </>
        }
        desc="Submit a formal request to delete a specific client's data."
      >
        <div className="settings-form-grid">
          <div className="settings-form-group">
            <label className="settings-label">Client Email</label>
            <input
              className="settings-input"
              type="email"
              placeholder="client@example.com"
              value={gdprEmail}
              onChange={(e) => setGdprEmail(e.target.value)}
            />
            <span className="settings-hint">
              We'll verify identity and process within 30 days as required by GDPR.
            </span>
          </div>
          <div className="settings-form-group">
            <label className="settings-label">Reason</label>
            <select
              className="settings-select"
              value={gdprReason}
              onChange={(e) => setGdprReason(e.target.value)}
            >
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
            loading={gdprLoading}
            onClick={async () => {
              if (!gdprEmail) { toast.error("Enter a client email"); return; }
              if (!gdprReason) { toast.error("Select a reason"); return; }
              setGdprLoading(true);
              try {
                await api.post("/api/v1/clients/gdpr-delete", { email: gdprEmail, reason: gdprReason });
                toast.success("Deletion request submitted successfully");
                setGdprEmail("");
                setGdprReason("");
              } catch {
                toast("GDPR endpoint not available yet", { icon: "ℹ️" });
              } finally {
                setGdprLoading(false);
              }
            }}
          >
            Submit deletion request
          </Button>
        </div>
      </SettingsSection>

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
