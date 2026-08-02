import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { XLg, Pencil, CardList, PersonFill } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { useCurrency } from "../../../hooks/useCurrency";
import type { AppDispatch } from "../../../store/store";
import type { Membership } from "../../../services/api/endpoints/memberships.endpoints";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import { selectAllCategories } from "../../../store/selectors/slices.selectors";
import { getMembershipMeta, TYPE_LABEL, APPLIES_TO_LABEL } from "../utils/membershipMeta";
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
  const dispatch = useDispatch<AppDispatch>();
  const { formatAmount } = useCurrency();

  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading,    setLoading]    = useState(false);

  const categories = useSelector(selectAllCategories) as { id: string | number; name: string }[];
  useEffect(() => { dispatch(fetchCategoriesThunk()); }, [dispatch]);
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(String(c.id), c.name));
    return map;
  }, [categories]);

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

  const meta = getMembershipMeta(membership ?? {});
  const bonusCredit  = Number(meta.bonusCredit) || 0;
  const walletValue  = (Number(membership?.price) || 0) + bonusCredit;
  const type: "value" | "percentage" | "loyalty" = membership?.pricingType ?? "value";
  const appliesToLabel = APPLIES_TO_LABEL[membership?.appliesTo ?? "services"] ?? "Services";
  const categoriesLabel = membership?.categoryIds?.length
    ? membership.categoryIds.map((id) => categoryNameById.get(id) ?? id).join(", ")
    : "All categories";
  if (!isOpen) return null;

  return (
    <div className={`mdd-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="mdd" onClick={e => e.stopPropagation()}>

        <header className="mdd__header">
          <div className="header-content">
            <div
              className="membership-icon"
              style={{ background: (membership?.colour || "#000") + "22" }}
            >
              <CardList size={24} style={{ color: membership?.colour }} />
            </div>
            <div className="title-section">
              <h3 className="membership-name">{membership?.name || "Loading..."}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {membership && (
                  <span className={`type-pill type-pill--${type}`}>
                    {TYPE_LABEL[type] ?? "Wallet"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mdd__header-actions">
            <button
              className="edit-btn"
              onClick={() => { navigate(`/dashboard/catalog/memberships/edit/${membershipId}`); onClose(); }}
            >
              <Pencil size={14} /> Edit
            </button>
            <button className="close-btn" onClick={onClose}><XLg size={20} /></button>
          </div>
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

            {/* ── Wallet ─────────────────────────────────────────────── */}
            {type === "value" && (
              <section className="mdd__section">
                <h4 className="section-title">Wallet Details</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Membership Fee</span>
                    <span className="value fw-bold">
                      {formatAmount(Number(membership?.price || 0))}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Bonus Credit</span>
                    <span className="value fw-bold" style={{ color: bonusCredit > 0 ? "#16a34a" : undefined }}>
                      {bonusCredit > 0 ? `+${formatAmount(bonusCredit)}` : "—"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Wallet Value</span>
                    <span className="value fw-bold" style={{ color: "#2563eb" }}>
                      {formatAmount(walletValue)}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ── Discount Balance ───────────────────────────────────── */}
            {type === "percentage" && (
              <section className="mdd__section">
                <h4 className="section-title">Discount Details</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Membership Fee</span>
                    <span className="value fw-bold">
                      {formatAmount(Number(membership?.price || 0))}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Discount Percentage</span>
                    <span className="value fw-bold" style={{ color: "#2563eb" }}>
                      {membership?.discountPercent ?? 0}%
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ── Loyalty ────────────────────────────────────────────── */}
            {type === "loyalty" && (
              <>
                <section className="mdd__section">
                  <h4 className="section-title">Loyalty Configuration</h4>
                  <div className="services-list">
                    {membership?.loyaltyTiers?.length ? (
                      membership.loyaltyTiers.map((t, i) => (
                        <div key={i} className="service-tag">
                          {t.thresholdValue} Visits → {t.discountPercent}%
                        </div>
                      ))
                    ) : (
                      <div className="empty-services">No tiers configured</div>
                    )}
                  </div>
                </section>
                <section className="mdd__section">
                  <h4 className="section-title">Eligibility</h4>
                  <p className="description-text">Automatic enrollment for all clients.</p>
                </section>
              </>
            )}

            {/* ── Usage (all types) ──────────────────────────────────── */}
            <section className="mdd__section">
              <h4 className="section-title">Usage</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Applies To</span>
                  <span className="value">{appliesToLabel}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Categories</span>
                  <span className="value">{categoriesLabel}</span>
                </div>
              </div>
            </section>

            {/* ── Validity (all types) ───────────────────────────────── */}
            <section className="mdd__section">
              <h4 className="section-title">Validity</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Expiry</span>
                  <span className="value">
                    {type === "loyalty"
                      ? (membership?.validFor && membership.validFor !== "lifetime" ? membership.validFor : "Lifetime")
                      : (membership?.validFor || "–")}
                  </span>
                </div>
              </div>
            </section>

            {/* ── Description (all types) ────────────────────────────── */}
            <section className="mdd__section">
              <h4 className="section-title">Description</h4>
              <p className="description-text">
                {meta.description?.trim() || "No description provided."}
              </p>
            </section>

          </div>
        )}
      </div>
    </div>
  );
};

export default MembershipDetailsDrawer;
