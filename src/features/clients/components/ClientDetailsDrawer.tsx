import { useEffect, useState } from "react";
import { X, Pencil } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import { Loader } from "../../../components/ui";
import WalletBreakdownModal from "./WalletBreakdownModal";
import "../styles/ClientDetailsDrawer.scss";

interface ClientDetailsDrawerProps {
  clientId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="cdd-info-row">
      <span className="cdd-info-label">{label}</span>
      <span className="cdd-info-value">{value || "–"}</span>
    </div>
  );
}

export default function ClientDetailsDrawer({
  clientId,
  isOpen,
  onClose,
}: ClientDetailsDrawerProps) {
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && clientId) {
      setLoading(true);
      api
        .get(CLIENT.BY_ID(clientId))
        .then((r) => {
          if (isMounted) setClient(r.data?.data || r.data);
        })
        .catch(() => {
          if (isMounted) setClient(null);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    if (!isOpen) {
      setClient(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const firstName = client?.first_name || "";
  const lastName = client?.last_name || "";
  const initials =
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";
  const fullName = `${firstName} ${lastName}`.trim() || "–";
  const email = client?.email || "";
  const phone = client?.phone_number
    ? `${client.phone_country_code || ""} ${client.phone_number}`.trim()
    : null;
  const createdAt = client?.created_at
    ? new Date(client.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const birthday = client?.birthday || null;
  const gender = client?.gender || null;
  const pronouns = client?.pronouns || null;
  const occupation = client?.occupation || null;
  const country = client?.country || null;
  const clientSource = client?.client_source || null;
  const preferredLanguage = client?.preferred_language || null;
  const additionalEmail = client?.additional_email || null;
  const additionalPhone = client?.additional_phone_number || null;

  const walletBalance = Number(client?.wallet_balance ?? client?.ewallet_balance ?? 0);
  const referralCode = client?.referral_code || null;
  const totalReferralEarnings = `₹${Number(client?.total_referral_earnings ?? 0).toLocaleString("en-IN")}`;
  const totalSuccessfulReferrals = String(client?.total_successful_referrals ?? 0);

  return (
    <div
      className={`client-drawer-overlay ${isOpen ? "open" : ""}`}
      onClick={onClose}
    >
      <div className="client-drawer cdd-simple" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>
          <X size={20} />
        </button>

        {loading ? (
          <div className="py-5">
            <Loader message="Loading client details..." />
          </div>
        ) : (
          <>
            {/* Avatar + Name */}
            <div className="cdd-header">
              <div className="cdd-avatar">{initials}</div>
              <div className="cdd-identity">
                <h3 className="cdd-name">{fullName}</h3>
                {email && <p className="cdd-email">{email}</p>}
              </div>
              <button
                className="cdd-edit-btn"
                onClick={() => navigate(`/dashboard/clients/edit/${clientId}`)}
              >
                <Pencil size={14} /> Edit
              </button>
            </div>

            {/* Info Fields */}
            <div className="cdd-body">
              <div className="cdd-section-title">Profile</div>
              <InfoRow label="Full name" value={fullName} />
              <InfoRow label="Email" value={email} />
              <InfoRow label="Phone" value={phone} />
              <InfoRow label="Birthday" value={birthday} />
              <InfoRow label="Gender" value={gender} />
              <InfoRow label="Pronouns" value={pronouns} />
              <InfoRow label="Occupation" value={occupation} />
              <InfoRow label="Country" value={country} />

              <div className="cdd-section-title cdd-section-title--mt">Wallet</div>
              <div className="cdd-wallet-row">
                <span className="cdd-wallet-value">₹{walletBalance.toLocaleString("en-IN")}</span>
                <button
                  type="button"
                  className="cdd-info-btn"
                  title="View wallet breakdown"
                  onClick={() => setShowWalletModal(true)}
                >
                  ⓘ
                </button>
              </div>

              <div className="cdd-section-title cdd-section-title--mt">Referral</div>
              <InfoRow label="Referral Code" value={referralCode} />
              <InfoRow label="Total Referral Earnings" value={totalReferralEarnings} />
              <InfoRow label="Total Successful Referrals" value={totalSuccessfulReferrals} />

              <div className="cdd-section-title cdd-section-title--mt">Additional info</div>
              <InfoRow label="Client source" value={clientSource} />
              <InfoRow label="Preferred language" value={preferredLanguage} />
              <InfoRow label="Additional email" value={additionalEmail} />
              <InfoRow label="Additional phone" value={additionalPhone} />
              <InfoRow label="Joined" value={createdAt} />
            </div>
          </>
        )}
      </div>

      {showWalletModal && clientId && (
        <WalletBreakdownModal clientId={clientId} onClose={() => setShowWalletModal(false)} />
      )}
    </div>
  );
}
