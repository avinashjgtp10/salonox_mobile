import { useEffect, useState } from "react";
import { X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { EWALLET } from "../../../services/api/endpoints";
import { Loader } from "../../../components/ui";
import { EMPTY_WALLET_BREAKDOWN, type WalletBreakdown } from "../../../types/wallet.types";

interface Props {
  clientId: string | number;
  onClose: () => void;
}

function fmt(n: number): string {
  const abs = Math.abs(Number(n) || 0);
  return `${n < 0 ? "-" : ""}₹${abs.toLocaleString("en-IN")}`;
}

export default function WalletBreakdownModal({ clientId, onClose }: Props) {
  const [breakdown, setBreakdown] = useState<WalletBreakdown>(EMPTY_WALLET_BREAKDOWN);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api
      .get(EWALLET.BREAKDOWN(clientId))
      .then((r) => {
        if (isMounted) setBreakdown({ ...EMPTY_WALLET_BREAKDOWN, ...(r.data?.data || r.data) });
      })
      .catch(() => {
        if (isMounted) setBreakdown(EMPTY_WALLET_BREAKDOWN);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [clientId]);

  const rows: { label: string; value: number }[] = [
    { label: "Referral Rewards", value: breakdown.referral_rewards },
    { label: "Reward Credits", value: breakdown.reward_credits },
    { label: "Other Wallet Credits", value: breakdown.other_credits },
    { label: "Wallet Debits", value: -Math.abs(breakdown.wallet_debits) },
  ];

  return (
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Wallet Breakdown</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <Loader message="Loading wallet details..." />
        ) : (
          <>
            {rows.map((row) => (
              <div className="wb-row" key={row.label}>
                <span className="wb-label">{row.label}</span>
                <span className="wb-value">{fmt(row.value)}</span>
              </div>
            ))}
            <div className="wb-row wb-row--total">
              <span className="wb-label">Current Wallet Balance</span>
              <span className="wb-value">{fmt(breakdown.balance)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
