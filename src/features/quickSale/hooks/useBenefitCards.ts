import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/theme/ThemeProvider";
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

export function useBenefitCards({ redemptions, selectedClient, totals }: Pick<CheckoutSheetProps, "redemptions" | "selectedClient" | "totals">) {
  const Colors = useThemeColors();
  return useMemo<BenefitCardConfig[]>(() => {
    const cards: BenefitCardConfig[] = [];

    if (redemptions.isMembershipWalletEligible) {
      cards.push({
        accent: Colors.primary,
        checked: redemptions.applyMembershipWallet,
        icon: "wallet-outline",
        input: {
          keyboardType: "decimal-pad",
          onChangeText: redemptions.setMembershipWalletRequestedInput,
          value: redemptions.membershipWalletRequestedInput,
        },
        key: "membership-wallet",
        onToggle: redemptions.setApplyMembershipWallet,
        subtitle: redemptions.membershipWalletName ?? selectedClient.membership ?? "Membership",
        title: "Membership Wallet",
        value: `${formatCurrency(redemptions.membershipWalletBalance ?? 0)} Remaining`,
      });
    }

    if (redemptions.isMembershipDiscountEligible) {
      cards.push({
        accent: Colors.primary,
        checked: redemptions.applyMembershipDiscount,
        icon: "pricetag-outline",
        key: "membership-discount",
        onToggle: redemptions.setApplyMembershipDiscount,
        subtitle: `${redemptions.membershipDiscountName ?? "Membership"} · ${redemptions.isValidityMembershipDiscount ? "Valid membership" : `${formatCurrency(redemptions.membershipDiscountBalanceRemaining)} left`}`,
        title: "Membership Discount",
        value: `${redemptions.membershipDiscountPercent}% Off`,
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
          value: redemptions.eWalletRequestedInput,
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
          value: redemptions.rewardPointsToRedeemInput,
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
          value: redemptions.referralCreditRequestedInput,
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
  }, [Colors, redemptions, selectedClient.id, selectedClient.membership, totals.referralCreditRejectedReason]);

}
