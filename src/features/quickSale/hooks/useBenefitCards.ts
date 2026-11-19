import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import { formatCurrency } from "../utils/money";
import type { CheckoutSheetProps } from "../components/checkout/types";

type BenefitCardInput = {
  keyboardType: "decimal-pad" | "number-pad";
  onChangeText: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  value: string;
};

type BenefitCardConfig = {
  accent: string;
  checked: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  input?: BenefitCardInput;
  key: string;
  note?: string;
  onToggle: (value: boolean) => void;
  subtitle: string;
  title: string;
  value: string;
};

export function useBenefitCards({ packageBenefit, redemptions, selectedClient, totals }: Pick<CheckoutSheetProps, "packageBenefit" | "redemptions" | "selectedClient" | "totals">) {
  const Colors = usePearlColors();
  return useMemo<BenefitCardConfig[]>(() => {
    const cards: BenefitCardConfig[] = [];

    if (packageBenefit) {
      cards.push({
        accent: Colors.gold,
        checked: packageBenefit.checked,
        icon: "albums-outline",
        key: "package",
        onToggle: packageBenefit.onToggle,
        subtitle: packageBenefit.packageName,
        title: "Package",
        value: `${packageBenefit.remainingSessions}/${packageBenefit.totalSessions} Remaining`,
      });
    }

    for (const membership of redemptions.eligibleMembershipDiscounts) {
      const isSelected = redemptions.selectedMembershipDiscountIds.includes(membership.id);
      cards.push({
        accent: Colors.primaryText,
        checked: isSelected,
        icon: "pricetag-outline",
        key: `membership-discount-${membership.id}`,
        onToggle: (checked) => redemptions.toggleMembershipDiscount(membership.id, checked),
        subtitle: membership.pricingType === "percentage"
          ? membership.benefitType === "validity"
            ? (membership.expiresAt ? `Valid until ${membership.expiresAt.slice(0, 10)}` : "Valid membership")
            : `${formatCurrency(membership.discountBalanceRemaining ?? 0)} Discount Balance Remaining`
          : (membership.expiresAt ? `Membership · Valid until ${membership.expiresAt.slice(0, 10)}` : "Active membership"),
        title: membership.membershipName,
        value: membership.pricingType === "percentage" ? `${membership.discountPercent ?? 0}% Off` : "Membership",
      });
    }

    for (const membership of redemptions.membershipWalletBenefits) {
      cards.push({
        accent: Colors.primary,
        checked: redemptions.applyMembershipWallet,
        icon: "wallet-outline",
        input: {
          keyboardType: "decimal-pad",
          onChangeText: redemptions.setMembershipWalletRequestedInput,
          value: redemptions.membershipWalletRequestedInput ?? String(totals.appliedMembershipWallet),
          placeholder: "Auto",
        },
        key: `membership-wallet-${membership.id}`,
        onToggle: redemptions.setApplyMembershipWallet,
        subtitle: "Membership Wallet Balance",
        title: membership.membershipName,
        value: `${formatCurrency(membership.walletBalance)} Remaining`,
      });
    }

    if (redemptions.isLoyaltyEligible) {
      cards.push({
        accent: Colors.gold,
        checked: redemptions.applyLoyaltyDiscount,
        icon: "ribbon-outline",
        key: "loyalty-discount",
        onToggle: redemptions.setApplyLoyaltyDiscount,
        subtitle: redemptions.loyaltyNextTierHint
          ? `${redemptions.loyaltyName ?? "Loyalty"} · ${redemptions.loyaltyNextTierHint}`
          : (redemptions.loyaltyName ?? "Loyalty tier benefit"),
        title: "Loyalty Discount",
        value: `${redemptions.loyaltyDiscountPercent}% Off`,
      });
    }

    if (selectedClient.id && redemptions.eWalletBalance >= 100) {
      cards.push({
        accent: Colors.success,
        checked: redemptions.applyEwallet,
        icon: "wallet-outline",
        input: {
          keyboardType: "decimal-pad",
          onChangeText: redemptions.setEWalletRequestedInput,
          value: redemptions.eWalletRequestedInput ?? String(totals.appliedEWallet),
          placeholder: "Auto",
        },
        key: "ewallet",
        onToggle: redemptions.setApplyEwallet,
        subtitle: "Available Balance",
        title: "eWallet",
        value: formatCurrency(redemptions.eWalletBalance),
      });
    }

    if (selectedClient.id && redemptions.rewardPointsBalance > 0) {
      cards.push({
        accent: Colors.gold,
        checked: redemptions.applyRewardPoints,
        icon: "star-outline",
        input: {
          keyboardType: "number-pad",
          onChangeText: redemptions.setRewardPointsToRedeemInput,
          placeholder: "0 pts",
          suffix: "pts",
          value: redemptions.rewardPointsToRedeemInput ?? String(redemptions.pricingContext.rules && redemptions.pricingContext.rules.valuePerRedemption > 0 ? Math.round(totals.appliedRewardPointsValue * redemptions.pricingContext.rules.pointsPerRedemption / redemptions.pricingContext.rules.valuePerRedemption) : 0),
        },
        key: "reward-points",
        onToggle: redemptions.setApplyRewardPoints,
        subtitle: "Available Points",
        title: "Reward Points",
        value: `${redemptions.rewardPointsBalance.toLocaleString("en-IN")} pts`,
      });
    }

    if (selectedClient.id && redemptions.referralBalance > 0) {
      cards.push({
        accent: Colors.info,
        checked: redemptions.applyReferralCredit,
        icon: "people-outline",
        input: {
          keyboardType: "decimal-pad",
          onChangeText: redemptions.setReferralCreditRequestedInput,
          value: redemptions.referralCreditRequestedInput ?? String(totals.appliedReferralCredit),
          placeholder: "Auto",
        },
        key: "referral-credit",
        note: redemptions.applyReferralCredit ? totals.referralCreditRejectedReason : undefined,
        onToggle: redemptions.setApplyReferralCredit,
        subtitle: "Available Credit",
        title: "Referral Credit",
        value: formatCurrency(redemptions.referralBalance),
      });
    }

    return cards;
  }, [Colors, packageBenefit, redemptions, selectedClient.id, selectedClient.membership, totals]);

}
