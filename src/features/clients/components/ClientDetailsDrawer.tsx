import { useEffect, useState } from "react";
import { X, Pencil, Clipboard, ArrowLeft } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useCurrency } from "../../../hooks/useCurrency";
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

// Birthday is stored split as "MM-DD" + an optional year (a birthday may have
// no year on file) — reassemble it for display. Reading client.birthday
// directly (as this panel used to) always showed "–" since no such field
// exists on the record, making saved birthdays look lost (SCRUM-1090).
function formatBirthday(dayMonth?: string | null, year?: number | null): string | null {
  if (!dayMonth) return null;
  const [mm, dd] = dayMonth.split("-").map(Number);
  if (!mm || !dd) return null;
  const d = new Date(year || 2000, mm - 1, dd);
  return d.toLocaleDateString("en-GB", year
    ? { day: "numeric", month: "long", year: "numeric" }
    : { day: "numeric", month: "long" });
}

function InfoRow({
  label,
  value,
  copyable,
  onCopy,
}: {
  label: string;
  value?: string | null;
  copyable?: boolean;
  onCopy?: (value: string) => void;
}) {
  return (
    <div className="cdd-info-row">
      <span className="cdd-info-label">{label}</span>
      <span className="cdd-info-value cdd-info-value--with-copy">
        {value || "–"}
        {copyable && value && (
          <button
            type="button"
            className="cdd-copy-btn"
            title="Copy referral code"
            onClick={() => {
              navigator.clipboard.writeText(value);
              onCopy?.(value);
            }}
          >
            <Clipboard size={12} />
          </button>
        )}
      </span>
    </div>
  );
}

export default function ClientDetailsDrawer({
  clientId,
  isOpen,
  onClose,
}: ClientDetailsDrawerProps) {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { showSuccess, overlay } = useStatusOverlay();

  // Which client the drawer is currently showing. It starts as the client the
  // parent selected (`clientId`), but the "Referred By" card pushes the
  // referrer's id on top so their details load in-place. The stack lets the
  // header's Back button return to whichever client we came from.
  const [idStack, setIdStack] = useState<(string | number)[]>(
    clientId != null ? [clientId] : [],
  );
  const activeClientId = idStack[idStack.length - 1] ?? null;
  const isViewingReferrer = idStack.length > 1;

  // Reset to the parent-selected client whenever it changes or the drawer
  // reopens, so a previously-viewed referrer chain doesn't linger.
  useEffect(() => {
    if (isOpen && clientId != null) setIdStack([clientId]);
  }, [isOpen, clientId]);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && activeClientId != null) {
      setLoading(true);
      api
        .get(CLIENT.BY_ID(activeClientId))
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
  }, [isOpen, activeClientId]);

  // Warm the lazy-loaded Add/Edit client page chunk (and its heavy
  // country-state-city import) as soon as the drawer opens, so clicking
  // "Edit" navigates instantly instead of waiting on a cold chunk fetch.
  useEffect(() => {
    if (isOpen) {
      import("../pages/AddClientPage");
    }
  }, [isOpen]);

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

  const birthday = formatBirthday(client?.birthday_day_month, client?.birthday_year);
  const anniversary = client?.anniversary
    ? new Date(client.anniversary).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const gender = client?.gender || null;
  const clientSource = client?.client_source || null;
  const additionalPhone = client?.additional_phone_number || null;

  const walletBalance = Number(client?.wallet_balance ?? client?.ewallet_balance ?? 0);
  const referralCode = client?.referral_code || null;
  const totalReferralEarnings = formatAmount(Number(client?.total_referral_earnings ?? 0));
  const totalSuccessfulReferrals = String(client?.total_successful_referrals ?? 0);

  // The client who referred THIS client — separate from the "Referral" section
  // above, which is about referrals THIS client has made to others.
  const referredBy = client?.referred_by || null;
  const referredByPhone = referredBy?.phone_number
    ? `${referredBy.phone_country_code || ""} ${referredBy.phone_number}`.trim()
    : null;

  return (
    <div
      className={`client-drawer-overlay ${isOpen ? "open" : ""}`}
      onClick={onClose}
    >
      {overlay}
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
            {isViewingReferrer && (
              <button
                type="button"
                className="cdd-back-btn"
                onClick={() => setIdStack((s) => s.slice(0, -1))}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {/* Avatar + Name */}
            <div className="cdd-header">
              <div className="cdd-avatar">{initials}</div>
              <div className="cdd-identity">
                <h3 className="cdd-name">{fullName}</h3>
                {email && <p className="cdd-email">{email}</p>}
              </div>
              <button
                className="cdd-edit-btn"
                onClick={() => navigate(`/dashboard/clients/edit/${activeClientId}`)}
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
              <InfoRow label="Anniversary" value={anniversary} />
              <InfoRow label="Gender" value={gender} />

              <div className="cdd-section-title cdd-section-title--mt">Wallet</div>
              <div className="cdd-wallet-row">
                <span className="cdd-wallet-value">{formatAmount(walletBalance)}</span>
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
              <InfoRow
                label="Referral Code"
                value={referralCode}
                copyable
                onCopy={() => showSuccess("Referral code copied!")}
              />
              <InfoRow label="Total Referral Earnings" value={totalReferralEarnings} />
              <InfoRow label="Total Successful Referrals" value={totalSuccessfulReferrals} />

              {referredBy && (
                <>
                  <div className="cdd-section-title cdd-section-title--mt">Referred By</div>
                  <div className="cdd-referrer-card">
                    <div className="cdd-referrer-avatar">
                      {(referredBy.full_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="cdd-referrer-info">
                      <span className="cdd-referrer-name">{referredBy.full_name || "–"}</span>
                      {referredByPhone && <span className="cdd-referrer-detail">{referredByPhone}</span>}
                      {referredBy.email && <span className="cdd-referrer-detail">{referredBy.email}</span>}
                    </div>
                    <button
                      type="button"
                      className="cdd-referrer-view-btn"
                      onClick={() => setIdStack((s) => [...s, referredBy.id])}
                    >
                      View
                    </button>
                  </div>
                </>
              )}

              <div className="cdd-section-title cdd-section-title--mt">Additional info</div>
              <InfoRow label="Client source" value={clientSource} />
              <InfoRow label="Additional phone" value={additionalPhone} />
              <InfoRow label="Joined" value={createdAt} />
            </div>
          </>
        )}
      </div>

      {showWalletModal && activeClientId != null && (
        <WalletBreakdownModal clientId={activeClientId} onClose={() => setShowWalletModal(false)} />
      )}
    </div>
  );
}
