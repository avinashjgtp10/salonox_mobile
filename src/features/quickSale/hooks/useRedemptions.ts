import { useCallback, useEffect, useRef, useState } from "react";

import { parseAmount } from "@/features/quickSale/utils/money";
import { clientMembershipService } from "@/services/clientMembership.service";
import { clientService } from "@/services/client.service";
import { ewalletService } from "@/services/ewallet.service";
import { getApiErrorMessage } from "@/services/api";
import { membershipService } from "@/services/membership.service";
import { referralService } from "@/services/referral.service";
import { rewardPointsService } from "@/services/rewardPoints.service";
import type { ClientMembershipAssignment } from "@/types/clientMembership";
import type { CalculateTotalsBody } from "@/types/pricing";

export type RedemptionPricingFlags = Pick<
  CalculateTotalsBody,
  | "applyEwallet"
  | "eWalletRequested"
  | "applyMembershipWallet"
  | "membershipWalletRequested"
  | "applyMembershipDiscount"
  | "applyLoyaltyDiscount"
  | "applyRewardPoints"
  | "rewardPointsToRedeem"
  | "applyReferralCredit"
  | "referralCreditRequested"
>;

const EMPTY_FLAGS: RedemptionPricingFlags = {};

export const useRedemptions = (clientId: string, salonId?: string | null) => {
  const [eWalletBalance, setEWalletBalance] = useState(0);
  const [rewardPointsBalance, setRewardPointsBalance] = useState(0);
  const [referralBalance, setReferralBalance] = useState(0);
  const [isLoyaltyEligible, setIsLoyaltyEligible] = useState(false);
  const [membershipAssignments, setMembershipAssignments] = useState<ClientMembershipAssignment[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);

  const [applyEwallet, setApplyEwallet] = useState(false);
  const [eWalletRequestedInput, setEWalletRequestedInput] = useState("");
  const [applyMembershipWallet, setApplyMembershipWallet] = useState(false);
  const [membershipWalletRequestedInput, setMembershipWalletRequestedInput] = useState("");
  const [applyMembershipDiscount, setApplyMembershipDiscount] = useState(false);
  const [applyLoyaltyDiscount, setApplyLoyaltyDiscount] = useState(false);
  const [applyRewardPoints, setApplyRewardPoints] = useState(false);
  const [rewardPointsToRedeemInput, setRewardPointsToRedeemInput] = useState("");
  const [applyReferralCredit, setApplyReferralCredit] = useState(false);
  const [referralCreditRequestedInput, setReferralCreditRequestedInput] = useState("");

  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    setEWalletBalance(0);
    setRewardPointsBalance(0);
    setReferralBalance(0);
    setIsLoyaltyEligible(false);
    setMembershipAssignments([]);
    setBalancesError(null);
    setApplyEwallet(false);
    setEWalletRequestedInput("");
    setApplyMembershipWallet(false);
    setMembershipWalletRequestedInput("");
    setApplyMembershipDiscount(false);
    setApplyLoyaltyDiscount(false);
    setApplyRewardPoints(false);
    setRewardPointsToRedeemInput("");
    setApplyReferralCredit(false);
    setReferralCreditRequestedInput("");
  }, []);

  const refreshBalances = useCallback(
    async (targetClientId: string) => {
      if (!targetClientId) {
        reset();
        return;
      }

      const requestId = ++requestIdRef.current;
      setIsLoadingBalances(true);
      setBalancesError(null);

      // Each source is independent (e-wallet has its own endpoint; reward
      // points and referral balance both come from the client history
      // response) — allSettled so one failing doesn't wipe out the others.
      const [eWalletResult, historyResult, loyaltyResult, assignmentsResult] = await Promise.allSettled([
        ewalletService.getBalance(targetClientId, salonId),
        clientService.getClientHistoryWithSummary(targetClientId),
        membershipService.getLoyaltyEligibility(targetClientId, salonId),
        clientMembershipService.getClientAssignments(targetClientId, salonId),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (eWalletResult.status === "fulfilled") {
        setEWalletBalance(eWalletResult.value.balance);
      }

      if (historyResult.status === "fulfilled") {
        const { summary } = historyResult.value;
        setRewardPointsBalance(rewardPointsService.getBalanceFromHistorySummary(summary).balance);
        setReferralBalance(referralService.getBalanceFromHistorySummary(summary).balance);
      }

      if (loyaltyResult.status === "fulfilled") {
        setIsLoyaltyEligible(loyaltyResult.value.eligible);
      }

      if (assignmentsResult.status === "fulfilled") {
        setMembershipAssignments(
          assignmentsResult.value.filter((assignment) => assignment.status === "active"),
        );
      }

      const firstFailure = [eWalletResult, historyResult, loyaltyResult, assignmentsResult].find(
        (result) => result.status === "rejected",
      );

      if (firstFailure && firstFailure.status === "rejected") {
        setBalancesError(getApiErrorMessage(firstFailure.reason));
      }

      setIsLoadingBalances(false);
    },
    [reset, salonId],
  );

  useEffect(() => {
    reset();
    void refreshBalances(clientId);
    // reset() is intentionally excluded: it's stable identity-wise but
    // re-running it whenever refreshBalances changes would wipe user toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const membershipWalletAssignment =
    membershipAssignments.find(
      (assignment) => assignment.pricingType === "value" && (assignment.walletBalance ?? 0) > 0,
    ) ?? null;
  const membershipDiscountAssignment =
    membershipAssignments.find(
      (assignment) => assignment.pricingType === "percentage" && (assignment.discountBalanceRemaining ?? 0) > 0,
    ) ?? null;

  const buildPricingFlags = useCallback((): RedemptionPricingFlags => {
    if (!clientId) {
      return EMPTY_FLAGS;
    }

    return {
      ...(applyEwallet ? { applyEwallet: true, eWalletRequested: parseAmount(eWalletRequestedInput) } : {}),
      ...(applyMembershipWallet && membershipWalletAssignment
        ? { applyMembershipWallet: true, membershipWalletRequested: parseAmount(membershipWalletRequestedInput) }
        : {}),
      ...(applyMembershipDiscount && membershipDiscountAssignment ? { applyMembershipDiscount: true } : {}),
      ...(applyLoyaltyDiscount && isLoyaltyEligible ? { applyLoyaltyDiscount: true } : {}),
      ...(applyRewardPoints
        ? { applyRewardPoints: true, rewardPointsToRedeem: Math.floor(parseAmount(rewardPointsToRedeemInput)) }
        : {}),
      ...(applyReferralCredit
        ? { applyReferralCredit: true, referralCreditRequested: parseAmount(referralCreditRequestedInput) }
        : {}),
    };
  }, [
    applyEwallet,
    applyLoyaltyDiscount,
    applyMembershipDiscount,
    applyMembershipWallet,
    applyReferralCredit,
    applyRewardPoints,
    clientId,
    eWalletRequestedInput,
    isLoyaltyEligible,
    membershipDiscountAssignment,
    membershipWalletAssignment,
    membershipWalletRequestedInput,
    referralCreditRequestedInput,
    rewardPointsToRedeemInput,
  ]);

  return {
    applyEwallet,
    applyLoyaltyDiscount,
    applyMembershipDiscount,
    applyMembershipWallet,
    applyReferralCredit,
    applyRewardPoints,
    balancesError,
    buildPricingFlags,
    eWalletBalance,
    eWalletRequestedInput,
    isLoadingBalances,
    isLoyaltyEligible,
    isMembershipDiscountEligible: Boolean(membershipDiscountAssignment),
    isMembershipWalletEligible: Boolean(membershipWalletAssignment),
    membershipWalletBalance: membershipWalletAssignment?.walletBalance ?? null,
    membershipWalletRequestedInput,
    referralBalance,
    referralCreditRequestedInput,
    refreshBalances: () => refreshBalances(clientId),
    rewardPointsBalance,
    rewardPointsToRedeemInput,
    setApplyEwallet,
    setApplyLoyaltyDiscount,
    setApplyMembershipDiscount,
    setApplyMembershipWallet,
    setApplyReferralCredit,
    setApplyRewardPoints,
    setEWalletRequestedInput,
    setMembershipWalletRequestedInput,
    setReferralCreditRequestedInput,
    setRewardPointsToRedeemInput,
  };
};
