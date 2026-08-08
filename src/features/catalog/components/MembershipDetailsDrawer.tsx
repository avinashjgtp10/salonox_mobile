import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { XLg, Pencil } from "react-bootstrap-icons";
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

  // Structure deliberately mirrors ConsumableDetailPanel section-for-section
  // (header + subtitle, __section/h4, __field-row label/value, __mini-table,
  // __empty) so the two side panels read as one component. Still its own
  // markup for now — the shared shell in components/ui comes later, and this
  // being a 1:1 shape match is what makes that extraction mechanical.
  return (
    <div className="mdd-overlay" onClick={onClose}>
      <div className="mdd" onClick={e => e.stopPropagation()}>

        <div className="mdd__header">
          <div>
            <h3>{membership?.name || "Loading…"}</h3>
            {membership && (
              <span className="mdd__subtitle">
                Membership · {TYPE_LABEL[type] ?? "Wallet"}
              </span>
            )}
          </div>
          <div className="mdd__header-actions">
            <button
              className="mdd__edit-btn"
              onClick={() => { navigate(`/dashboard/catalog/memberships/edit/${membershipId}`); onClose(); }}
            >
              <Pencil size={13} /> Edit
            </button>
            <button className="mdd__close" onClick={onClose}><XLg size={20} /></button>
          </div>
        </div>

        {loading || !membership ? (
          <div className="mdd__loading">Loading…</div>
        ) : (
          <div className="mdd__body">

            {assignedClient && (
              <section className="mdd__section">
                <h4>Assigned Client</h4>
                <div className="mdd__field-row"><span>Name</span><span>{assignedClient.name}</span></div>
                {assignedClient.phone && (
                  <div className="mdd__field-row"><span>Phone</span><span>{assignedClient.phone}</span></div>
                )}
              </section>
            )}

            {type === "value" && (
              <section className="mdd__section">
                <h4>Wallet Details</h4>
                <div className="mdd__field-row">
                  <span>Membership Fee</span><span>{formatAmount(Number(membership.price) || 0)}</span>
                </div>
                <div className="mdd__field-row">
                  <span>Bonus Credit</span>
                  <span>{bonusCredit > 0 ? `+${formatAmount(bonusCredit)}` : "—"}</span>
                </div>
                <div className="mdd__field-row">
                  <span>Total Wallet Value</span><span>{formatAmount(walletValue)}</span>
                </div>
              </section>
            )}

            {type === "percentage" && (
              <section className="mdd__section">
                <h4>Discount Details</h4>
                <div className="mdd__field-row">
                  <span>Membership Fee</span><span>{formatAmount(Number(membership.price) || 0)}</span>
                </div>
                <div className="mdd__field-row">
                  <span>Discount Percentage</span><span>{membership.discountPercent ?? 0}%</span>
                </div>
              </section>
            )}

            {type === "loyalty" && (
              <>
                <section className="mdd__section">
                  <h4>Loyalty Tiers</h4>
                  {membership.loyaltyTiers?.length ? (
                    <table className="mdd__mini-table">
                      <thead><tr><th>Visits</th><th>Discount</th></tr></thead>
                      <tbody>
                        {membership.loyaltyTiers.map((t, i) => (
                          <tr key={i}>
                            <td>{t.thresholdValue}</td>
                            <td>{t.discountPercent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="mdd__empty">No tiers configured.</p>
                  )}
                </section>
                <section className="mdd__section">
                  <h4>Eligibility</h4>
                  <p className="mdd__empty">Automatic enrollment for all clients.</p>
                </section>
              </>
            )}

            <section className="mdd__section">
              <h4>Usage</h4>
              <div className="mdd__field-row"><span>Applies To</span><span>{appliesToLabel}</span></div>
              <div className="mdd__field-row"><span>Categories</span><span>{categoriesLabel}</span></div>
            </section>

            <section className="mdd__section">
              <h4>Validity</h4>
              <div className="mdd__field-row">
                <span>Expiry</span>
                <span>
                  {type === "loyalty"
                    ? (membership.validFor && membership.validFor !== "lifetime" ? membership.validFor : "Lifetime")
                    : (membership.validFor || "—")}
                </span>
              </div>
            </section>

            <section className="mdd__section">
              <h4>Description</h4>
              <p className="mdd__empty">{meta.description?.trim() || "No description provided."}</p>
            </section>

          </div>
        )}
      </div>
    </div>
  );
};

export default MembershipDetailsDrawer;
