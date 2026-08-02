import React, { useMemo, useState } from "react";
import PlainStatCard from "./PlainStatCard";
import Pagination from "../../../components/ui/Pagination";
import TabToolbar from "./TabToolbar";
import { useTableSearchSort } from "../hooks/useTableSearchSort";

interface LedgerEntry {
  id: string;
  type: string;
  amount?: number;
  points?: number;
  balance_after: number;
  source_type: string | null;
  note: string | null;
  created_at: string;
}

interface ClientLike {
  referral_code: string | null;
  total_referral_earnings: number;
  total_successful_referrals: number;
  referral_balance: number;
  reward_points_balance: number;
}

const fmtDMY = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const TYPE_LABEL: Record<string, string> = { earn: "Earned", redeem: "Redeemed", adjust: "Adjusted" };

interface LedgerRow {
  id: string;
  dateLabel: string;
  typeLabel: string;
  value: number;
  balance: number;
  reference: string;
  remarks: string;
  createdAt: string;
}

function useLedgerTable(ledger: LedgerEntry[], valueField: "points" | "amount") {
  const rows: LedgerRow[] = useMemo(() => ledger.map((l) => ({
    id: l.id,
    dateLabel: fmtDMY(l.created_at),
    typeLabel: TYPE_LABEL[l.type] || l.type,
    value: Number(l[valueField] ?? 0),
    balance: Number(l.balance_after) || 0,
    reference: l.source_type || "–",
    remarks: l.note || "–",
    createdAt: l.created_at,
  })), [ledger, valueField]);

  return useTableSearchSort<LedgerRow>({
    rows, searchFields: ["typeLabel", "reference", "remarks"], defaultSortKey: "createdAt",
  });
}

interface ReferralsRewardsTabProps {
  client: ClientLike;
  rewardLedger: LedgerEntry[];
  referralLedger: LedgerEntry[];
  formatAmount: (n: number) => string;
  rewardsPage: number; rewardsPageSize: number;
  onRewardsPageChange: (p: number) => void; onRewardsPageSizeChange: (sz: number) => void;
  referralPage: number; referralPageSize: number;
  onReferralPageChange: (p: number) => void; onReferralPageSizeChange: (sz: number) => void;
}

const ReferralsRewardsTab: React.FC<ReferralsRewardsTabProps> = ({
  client, rewardLedger, referralLedger, formatAmount,
  rewardsPage, rewardsPageSize, onRewardsPageChange, onRewardsPageSizeChange,
  referralPage, referralPageSize, onReferralPageChange, onReferralPageSizeChange,
}) => {
  const reward = useLedgerTable(rewardLedger, "points");
  const referral = useLedgerTable(referralLedger, "amount");
  const [rewardDateRange, setRewardDateRange] = useState({ startDate: "", endDate: "" });
  const [referralDateRange, setReferralDateRange] = useState({ startDate: "", endDate: "" });

  const rewardRows = reward.filteredSortedRows;
  const referralRows = referral.filteredSortedRows;
  const pagedReward = rewardRows.slice((rewardsPage - 1) * rewardsPageSize, rewardsPage * rewardsPageSize);
  const pagedReferral = referralRows.slice((referralPage - 1) * referralPageSize, referralPage * referralPageSize);

  const renderLedgerTable = (
    rows: LedgerRow[], paged: LedgerRow[], valueHeader: string,
    formatValue: (v: number) => string,
  ) => (
    rows.length === 0 ? (
      <div className="chp-no-data">No transactions found</div>
    ) : (
      <table className="chp-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th style={{ textAlign: "right" }}>{valueHeader}</th>
            <th style={{ textAlign: "right" }}>Balance</th>
            <th>Reference</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((r) => (
            <tr key={r.id}>
              <td>{r.dateLabel}</td>
              <td>{r.typeLabel}</td>
              <td style={{ textAlign: "right" }}>{formatValue(r.value)}</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{formatValue(r.balance)}</td>
              <td>{r.reference}</td>
              <td>{r.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  );

  return (
    <div className="chp-card">
      <div className="chp-card-header">
        <span className="chp-card-title">Referrals &amp; Rewards</span>
      </div>

      <div className="chp-overview__stats" style={{ marginBottom: 20 }}>
        <PlainStatCard label="Reward Points Balance" value={client.reward_points_balance} />
        {client.referral_code && (
          <>
            <PlainStatCard label="Referral Balance" value={formatAmount(client.referral_balance)} />
            <PlainStatCard label="Total Referral Earnings" value={formatAmount(client.total_referral_earnings)} />
            <PlainStatCard label="Successful Referrals" value={client.total_successful_referrals} />
          </>
        )}
      </div>

      <div className="chp-card-header">
        <span className="chp-card-title">Reward Points History</span>
      </div>
      <TabToolbar
        searchValue={reward.search}
        onSearchChange={reward.setSearch}
        searchPlaceholder="Search reward points history..."
        dateRange={{ ...rewardDateRange, onChange: (s, e) => setRewardDateRange({ startDate: s, endDate: e }) }}
        exportConfig={{
          title: "Reward Points History",
          headers: ["Date", "Type", "Points", "Balance", "Reference", "Remarks"],
          rows: () => rewardRows.map((r) => [r.dateLabel, r.typeLabel, r.value, r.balance, r.reference, r.remarks]),
          filename: "reward-points-history",
        }}
      />
      {renderLedgerTable(rewardRows, pagedReward, "Points", (v) => String(v))}
      {rewardRows.length > 0 && (
        <Pagination
          currentPage={rewardsPage} pageSize={rewardsPageSize} totalItems={rewardRows.length}
          onPageChange={onRewardsPageChange} onPageSizeChange={onRewardsPageSizeChange}
        />
      )}

      <div className="chp-card-header" style={{ marginTop: 28 }}>
        <span className="chp-card-title">Referral Credit History</span>
      </div>
      <TabToolbar
        searchValue={referral.search}
        onSearchChange={referral.setSearch}
        searchPlaceholder="Search referral credit history..."
        dateRange={{ ...referralDateRange, onChange: (s, e) => setReferralDateRange({ startDate: s, endDate: e }) }}
        exportConfig={{
          title: "Referral Credit History",
          headers: ["Date", "Type", "Amount", "Balance", "Reference", "Remarks"],
          rows: () => referralRows.map((r) => [r.dateLabel, r.typeLabel, formatAmount(r.value), formatAmount(r.balance), r.reference, r.remarks]),
          filename: "referral-credit-history",
        }}
      />
      {renderLedgerTable(referralRows, pagedReferral, "Amount", formatAmount)}
      {referralRows.length > 0 && (
        <Pagination
          currentPage={referralPage} pageSize={referralPageSize} totalItems={referralRows.length}
          onPageChange={onReferralPageChange} onPageSizeChange={onReferralPageSizeChange}
        />
      )}
    </div>
  );
};

export default ReferralsRewardsTab;
