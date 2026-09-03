import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Download } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import SettingsSection from "../../settings/components/SettingsSection";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";
import api from "../../../services/api/axios";

export default function BranchOwnerDataPrivacySection() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      showError('Type "DELETE" to confirm');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete("/api/v1/auth/account");
      showSuccess("Account deletion requested");
      dispatch(logout());
      navigate("/login");
    } catch {
      showError("Failed to delete account. Contact support.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {overlay}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Data &amp; Privacy</h2>
        <p className="settings-page-subtitle">Export your data or deactivate your account.</p>
      </div>

      <SettingsSection title="Your Data" desc="Download a copy of your account and activity data.">
        <div className="settings-security-item">
          <div className="settings-security-icon"><Download size={18} /></div>
          <div className="settings-security-info">
            <p className="settings-security-name">Export my data</p>
            <p className="settings-security-desc">Not available yet — contact support for a copy of your data.</p>
          </div>
          <Button variant="outline-secondary" size="sm" disabled>Coming soon</Button>
        </div>
      </SettingsSection>

      <div className="settings-danger-zone">
        <p className="settings-danger-title">
          <AlertTriangle size={16} />
          Danger Zone
        </p>
        <p className="settings-danger-desc">
          Permanently delete your account. This action is irreversible — you'll lose access to every salon
          assigned to you, and your login will stop working. Salon data itself is not affected.
        </p>
        <div>
          <label className="settings-label mb-2" style={{ color: "#b91c1c" }}>
            <ShieldCheck size={13} className="me-1" />
            Type <strong>DELETE</strong> to confirm
          </label>
          <div className="d-flex gap-2 flex-wrap align-items-center mt-2">
            <input
              className="settings-input"
              style={{ maxWidth: 220, borderColor: deleteConfirm === "DELETE" ? "#ef4444" : undefined }}
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <Button
              size="sm"
              variant="danger"
              loading={deleteLoading}
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "DELETE"}
            >
              Delete my account
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
