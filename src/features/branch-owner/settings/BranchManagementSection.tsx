import { Building, BoxArrowRight, EnvelopeFill } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import SettingsSection from "../../settings/components/SettingsSection";

// Branch owners have no salon_id of their own, and the support-ticket API
// (POST /api/v1/support) hard-requires req.user.salonId — so it 400s for
// this role today. Rather than wire a call that will fail, this points
// branch owners at direct contact until that endpoint accepts a
// salon-less/branch_owner ticket, or a dedicated access-request endpoint
// exists (see [[branch_owner_access_requests]] backend follow-up).
export default function BranchOwnerBranchManagementSection() {
  return (
    <>
      <div className="settings-page-header">
        <h2 className="settings-page-title">Branch Management</h2>
        <p className="settings-page-subtitle">Request or give up access to salons.</p>
      </div>

      <SettingsSection title="Salon Access" desc="Manage which salons you're assigned to. Assignment is controlled by the super admin.">
        <div className="settings-security-item">
          <div className="settings-security-icon"><Building size={18} /></div>
          <div className="settings-security-info">
            <p className="settings-security-name">Request access to a new salon</p>
            <p className="settings-security-desc">Self-service requests aren't available yet — email support with the salon name.</p>
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            iconLeft={<EnvelopeFill size={12} />}
            onClick={() => { window.location.href = "mailto:support@salonox.com?subject=Branch%20access%20request"; }}
          >
            Email support
          </Button>
        </div>
        <div className="settings-security-item">
          <div className="settings-security-icon" style={{ background: "#f3f4f6", color: "#9ca3af" }}><BoxArrowRight size={18} /></div>
          <div className="settings-security-info">
            <p className="settings-security-name">Leave a salon</p>
            <p className="settings-security-desc">Not available yet — ask the super admin to unassign you.</p>
          </div>
          <Button variant="outline-secondary" size="sm" disabled>Coming soon</Button>
        </div>
      </SettingsSection>
    </>
  );
}
