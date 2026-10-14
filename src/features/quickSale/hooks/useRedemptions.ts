import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseAmount } from "@/features/quickSale/utils/money";
import { hasMembershipDiscount } from "@/features/quickSale/utils/membershipEligibility";
import { clientMembershipService } from "@/services/clientMembership.service";
import { clientService } from "@/services/client.service";
import { ewalletService } from "@/services/ewallet.service";
import { getApiErrorMessage } from "@/services/api";
import { membershipService } from "@/services/membership.service";
import { referralService } from "@/services/referral.service";
import { rewardPointsService } from "@/services/rewardPoints.service";
import type { ClientMembershipAssignment } from "@/types/clientMembership";
import type { CalculateTotalsBody } from "@/types/pricing";
import type { LoyaltyEligibility } from "@/types/wallet";
import { redemptionRulesService } from "@/services/redemptionRules.service";
import type { RedemptionRules } from "@/features/quickSale/utils/automaticRedemptions";

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
  const [loyaltyEligibility, setLoyaltyEligibility] = useState<LoyaltyEligibility | null>(null);
  const [membershipAssignments, setMembershipAssignments] = useState<ClientMembershipAssignment[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [rules, setRules] = useState<RedemptionRules | null>(null);

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
    requestIdRef.current += 1;
    setIsLoadingBalances(false);
    setEWalletBalance(0);
    setRewardPointsBalance(0);
    setReferralBalance(0);
    setLoyaltyEligibility(null);
    setMembershipAssignments([]);
    setBalancesError(null);
    setRules(null);
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

      const [eWalletResult, historyResult, loyaltyResult, assignmentsResult, rulesResult] = await Promise.allSettled([
        ewalletService.getBalance(targetClientId, salonId),
        clientService.getClientHistoryWithSummary(targetClientId),
        membershipService.getLoyaltyEligibility(targetClientId, salonId),
        clientMembershipService.getClientAssignments(targetClientId, salonId),
        redemptionRulesService.get(),
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
        setLoyaltyEligibility(loyaltyResult.value);
      }

      if (assignmentsResult.status === "fulfilled") {
        setMembershipAssignments(
          assignmentsResult.value.filter((assignment) => assignment.status === "active" && (!assignment.expiresAt || (new Date(/^\d{4}-\d{2}-\d{2}$/.test(assignment.expiresAt) ? `${assignment.expiresAt}T23:59:59.999` : assignment.expiresAt).getTime() >= Date.now()))),
        );
      }
      setRules(rulesResult.status === "fulfilled" ? rulesResult.value : null);

      const firstFailure = [eWalletResult, historyResult, loyaltyResult, assignmentsResult, rulesResult].find(
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
    return () => { requestIdRef.current += 1; };
  }, [clientId, refreshBalances, reset]);

  const membershipWalletAssignment =
    membershipAssignments.find(
      (assignment) => (assignment.walletBalance ?? 0) > 0,
    ) ?? null;
  const membershipWalletAssignments = membershipAssignments.filter(assignment => (assignment.walletBalance ?? 0) > 0);
  const membershipWalletBalance = membershipWalletAssignments.reduce((sum, assignment) => sum + (assignment.walletBalance ?? 0), 0);
  const pricingContext = useMemo(() => ({ eWalletBalance, rewardPointsBalance, referralBalance, rules }), [eWalletBalance, rewardPointsBalance, referralBalance, rules]);
  const membershipDiscountAssignment =
    membershipAssignments.find(hasMembershipDiscount) ?? null;
  const isLoyaltyEligible = loyaltyEligibility?.eligible ?? false;
  const loyaltyNextTierHint = loyaltyEligibility?.nextTier
    ? `next: ${loyaltyEligibility.nextTier.discountPercent}% at ${loyaltyEligibility.nextTier.thresholdValue} visits`
    : null;
  const toggleEwallet = useCallback((value: boolean) => { setApplyEwallet(value); setEWalletRequestedInput(""); }, []);
  const toggleMembershipWallet = useCallback((value: boolean) => { setApplyMembershipWallet(value); setMembershipWalletRequestedInput(""); }, []);
  const toggleRewardPoints = useCallback((value: boolean) => { setApplyRewardPoints(value); setRewardPointsToRedeemInput(""); }, []);
  const toggleReferralCredit = useCallback((value: boolean) => { setApplyReferralCredit(value); setReferralCreditRequestedInput(""); }, []);

  const buildPricingFlags = useCallback((): RedemptionPricingFlags => {
    if (!clientId) {
      return EMPTY_FLAGS;
    }

    return {
      ...(applyEwallet ? { applyEwallet: true, ...(eWalletRequestedInput.trim() ? { eWalletRequested: parseAmount(eWalletRequestedInput) } : {}) } : {}),
      ...(applyMembershipWallet && membershipWalletAssignment
        ? { applyMembershipWallet: true, ...(membershipWalletRequestedInput.trim() ? { membershipWalletRequested: parseAmount(membershipWalletRequestedInput) } : {}) }
        : {}),
      ...(applyMembershipDiscount && membershipDiscountAssignment ? { applyMembershipDiscount: true } : {}),
      ...(applyLoyaltyDiscount && isLoyaltyEligible ? { applyLoyaltyDiscount: true } : {}),
      ...(applyRewardPoints
        ? { applyRewardPoints: true, ...(rewardPointsToRedeemInput.trim() ? { rewardPointsToRedeem: Math.floor(parseAmount(rewardPointsToRedeemInput)) } : {}) }
        : {}),
      ...(applyReferralCredit
        ? { applyReferralCredit: true, ...(referralCreditRequestedInput.trim() ? { referralCreditRequested: parseAmount(referralCreditRequestedInput) } : {}) }
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
    loyaltyDiscountPercent: loyaltyEligibility?.discountPercent ?? 0,
    loyaltyName: loyaltyEligibility?.name ?? null,
    loyaltyNextTierHint,
    membershipDiscountBalanceRemaining: membershipDiscountAssignment?.discountBalanceRemaining ?? 0,
    isValidityMembershipDiscount: membershipDiscountAssignment?.benefitType === "validity",
    membershipDiscountName: membershipDiscountAssignment?.membershipName ?? null,
    membershipDiscountPercent: membershipDiscountAssignment?.discountPercent ?? 0,
    membershipWalletBalance,
    membershipWalletName: membershipWalletAssignments.map(a => a.membershipName).join(", ") || null,
    pricingContext,
    membershipWalletRequestedInput,
    referralBalance,
    referralCreditRequestedInput,
    refreshBalances: () => refreshBalances(clientId),
    rewardPointsBalance,
    rewardPointsToRedeemInput,
    setApplyEwallet: toggleEwallet,
    setApplyLoyaltyDiscount,
    setApplyMembershipDiscount,
    setApplyMembershipWallet: toggleMembershipWallet,
    setApplyReferralCredit: toggleReferralCredit,
    setApplyRewardPoints: toggleRewardPoints,
    setEWalletRequestedInput,
    setMembershipWalletRequestedInput,
    setReferralCreditRequestedInput,
    setRewardPointsToRedeemInput,
  };
};
