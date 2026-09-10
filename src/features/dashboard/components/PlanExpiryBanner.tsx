import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchActiveSubscriptionExpiryThunk } from "../../../store/billingSlice";
import { Modal, Button } from "../../../components/ui";
import "../styles/PlanExpiryBanner.scss";

const EXPIRY_WARNING_WINDOW_DAYS = 30;

// Small clickable pill (topbar) rather than a full-width strip — same
// "badge you click for details" pattern as e.g. Amazon's "Limited users
// left". Clicking it opens a simple modal with the full message instead of
// permanently eating banner space on every page.
export default function PlanExpiryBanner() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const role = useAppSelector((s) => s.auth.role);
  const salonId = useAppSelector((s) => s.salon.currentSalon?.id);
  const activePeriodEnd = useAppSelector((s) => s.billing.activePeriodEnd);

  const isOwnerOrAdmin = role === "salon_owner" || role === "admin";

  // Uses the multi-row STATUS endpoint (fetchActiveSubscriptionExpiryThunk),
  // not fetchSubscriptionThunk's single /billing/subscription record — that
  // endpoint returns whichever row was created most recently regardless of
  // status (see billing.repository.ts findBySalonId), so a salon with a
  // newer non-live row (a cancelled retry, a fresh "created" row from
  // clicking Upgrade) would silently hide this pill even while an older
  // row is still actively live and expiring soon.
  useEffect(() => {
    if (isOwnerOrAdmin && salonId) dispatch(fetchActiveSubscriptionExpiryThunk(salonId));
  }, [isOwnerOrAdmin, salonId, dispatch]);

  const daysRemaining = activePeriodEnd
    ? Math.floor((new Date(activePeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= EXPIRY_WARNING_WINDOW_DAYS;

  if (!isOwnerOrAdmin || !isExpiringSoon) return null;

  const remainingLabel = daysRemaining === 0 ? "Expires today" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`;

  return (
    <>
      <button
        type="button"
        className="plan-expiry-pill"
        onClick={() => setShowModal(true)}
      >
        <ExclamationTriangleFill size={12} />
        Plan expiring soon
      </button>

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Plan Expiring Soon" size="sm">
        <div className="plan-expiry-modal-body">
          <div className="plan-expiry-modal-icon">
            <ExclamationTriangleFill size={28} />
          </div>
          <p className="plan-expiry-modal-message">
            Your plan will expire soon. Please renew your plan to continue using all features without interruption.
          </p>
          <p className="plan-expiry-modal-remaining">{remainingLabel}</p>
        </div>
        <div className="plan-expiry-modal-footer">
          <Button variant="ghost" onClick={() => setShowModal(false)}>Dismiss</Button>
          <Button
            variant="primary"
            onClick={() => { setShowModal(false); navigate("/dashboard/settings/billing"); }}
          >
            Renew Plan
          </Button>
        </div>
      </Modal>
    </>
  );
}
