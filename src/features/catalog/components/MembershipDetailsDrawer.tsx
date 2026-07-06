import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { XLg, Pencil, CardList, InfoCircle, PersonFill } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import "../styles/MembershipDetailsDrawer.scss";

interface MembershipDetailsDrawerProps {
  membershipId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const MembershipDetailsDrawer: React.FC<MembershipDetailsDrawerProps> = ({
  membershipId,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  const [membership, setMembership] = useState<any>(null);
  const [loading,    setLoading]    = useState(false);

  const [assignedClient, setAssignedClient] = useState<{ id: string | null; name: string; phone: string | null } | null>(null);

  useEffect(() => {
    if (isOpen && membershipId) {
      setLoading(true);
      setAssignedClient(null);
      api.get(`/api/v1/memberships/${membershipId}`)
        .then(res => {
          const data = res.data?.data || res.data;
          setMembership(data);

          // 1. Try fields from the API response
          const apiName  = data?.clientName
                           || data?.client?.name
                           || (data?.client?.first_name
                                ? `${data.client.first_name} ${data.client.last_name ?? ""}`.trim()
                                : null);
          const apiId    = data?.clientId || data?.client?.id || null;
          const apiPhone = data?.clientPhone || data?.client?.phone_number || data?.client?.phone || null;

          if (apiName) {
            setAssignedClient({ id: apiId, name: apiName, phone: apiPhone });
            return;
          }

          // 2. Fallback: localStorage (saved at create/update time)
          try {
            const stored = localStorage.getItem(`mem_client_${membershipId}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.name) {
                setAssignedClient({ id: parsed.id || null, name: parsed.name, phone: parsed.phone || null });
                return;
              }
            }
          } catch { /* ignore */ }

          setAssignedClient(null);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (!isOpen) {
      setMembership(null);
      setAssignedClient(null);
    }
  }, [isOpen, membershipId]);

  // Parse description JSON
  const descMeta = (() => {
    try { return JSON.parse(membership?.description ?? "{}"); } catch { return {}; }
  })();
  const bonusCredit  = Number(descMeta.bonusCredit) || 0;
  const walletValue  = (Number(membership?.price) || 0) + bonusCredit;
  if (!isOpen) return null;

  return (
    <div className={`mdd-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="mdd" onClick={e => e.stopPropagation()}>

        <header className="mdd__header">
          <button className="close-btn" onClick={onClose}><XLg size={20} /></button>
          <div className="header-content">
            <div
              className="membership-icon"
              style={{ background: (membership?.colour || "#000") + "22" }}
            >
              <CardList size={24} style={{ color: membership?.colour }} />
            </div>
            <div className="title-section">
              <h3 className="membership-name">{membership?.name || "Loading..."}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="validity-badge">{membership?.validFor || "–"}</span>
                {membership && (
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, padding: "2px 9px",
                    borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em",
                    background: membership.status === "active" ? "#dcfce7" : "#f1f5f9",
                    color:      membership.status === "active" ? "#16a34a" : "#64748b",
                  }}>
                    {membership.status === "active" ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            className="edit-btn"
            onClick={() => { navigate(`/dashboard/catalog/memberships/edit/${membershipId}`); onClose(); }}
          >
            <Pencil size={14} /> Edit
          </button>
        </header>

        {loading ? (
          <div className="mdd__loading">
            <div className="spinner-border spinner-border-sm" role="status" />
            <span>Loading...</span>
          </div>
        ) : (
          <div className="mdd__body">

            {/* ── Assigned Client (from membership record only) ──────── */}
            {assignedClient && (
              <section className="mdd__section mdd__section--sell">
                <h4 className="section-title">Assigned Client</h4>
                <div className="mdd__sell-client">
                  <div className="mdd__sell-avatar">
                    {assignedClient.name
                      ? assignedClient.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
                      : <PersonFill size={16} />}
                  </div>
                  <div>
                    <span className="mdd__sell-name">{assignedClient.name}</span>
                    {assignedClient.phone && (
                      <span className="mdd__sell-phone">{assignedClient.phone}</span>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="mdd__section">
              <h4 className="section-title">Price & Details</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Customer Pays</span>
                  <span className="value fw-bold">
                    ₹{Number(membership?.price || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                {bonusCredit > 0 && (
                  <div className="detail-item">
                    <span className="label">Bonus Credit</span>
                    <span className="value" style={{ color: "#16a34a", fontWeight: 700 }}>
                      +₹{bonusCredit.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="label">Wallet Value</span>
                  <span className="value fw-bold" style={{ color: "#2563eb" }}>
                    ₹{walletValue.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Validity</span>
                  <span className="value">{membership?.validFor || "–"}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status</span>
                  <span className="value" style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, color: membership?.status === "active" ? "#16a34a" : "#64748b" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, display: "inline-block", background: membership?.status === "active" ? "#22c55e" : "#cbd5e1" }} />
                    {membership?.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Visit Limit</span>
                  <span className="value">
                    {membership?.sessionType === "unlimited"
                      ? "No cap (use until balance ₹0)"
                      : `${membership?.numberOfSessions || 0} visits`}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Tax Rate</span>
                  <span className="value">
                    {membership?.taxRate ? `${membership.taxRate}%` : "No tax"}
                  </span>
                </div>
              </div>
            </section>

            <section className="mdd__section">
              <h4 className="section-title">Included Services</h4>
              <div className="services-list">
                {membership?.includedServices?.length > 0 ? (
                  membership.includedServices.map((s: any) => (
                    <div key={s.serviceId} className="service-tag">{s.serviceName}</div>
                  ))
                ) : (
                  <div className="empty-services">
                    <InfoCircle size={14} /> All services included
                  </div>
                )}
              </div>
            </section>

            <section className="mdd__section">
              <h4 className="section-title">Online & T&C</h4>
              <div className="settings-list">
                <div className="setting-row">
                  <span>Online Sales</span>
                  <span className={`status-dot ${membership?.enableOnlineSales ? "active" : ""}`} />
                  <span className="status-text">
                    {membership?.enableOnlineSales ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="setting-row">
                  <span>Online Redemption</span>
                  <span className={`status-dot ${membership?.enableOnlineRedemption ? "active" : ""}`} />
                  <span className="status-text">
                    {membership?.enableOnlineRedemption ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="tc-box mt-3">
                <h5 className="tc-title">Terms & Conditions</h5>
                <p className="tc-text">
                  {membership?.termsAndConditions || "No terms and conditions provided."}
                </p>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
};

export default MembershipDetailsDrawer;
