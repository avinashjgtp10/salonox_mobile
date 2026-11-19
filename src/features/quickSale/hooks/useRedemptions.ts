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
  | "membershipDiscountIds"
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
  const [membershipHistory, setMembershipHistory] = useState<Awaited<ReturnType<typeof clientService.getClientHistoryWithSummary>>["memberships"]>([]);
  const [clientMembershipRecords, setClientMembershipRecords] = useState<Awaited<ReturnType<typeof clientService.getClientMemberships>>>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [rules, setRules] = useState<RedemptionRules | null>(null);

  const [applyEwallet, setApplyEwallet] = useState(false);
  const [eWalletRequestedInput, setEWalletRequestedInput] = useState<string | null>(null);
  const [applyMembershipWallet, setApplyMembershipWallet] = useState(false);
  const [membershipWalletRequestedInput, setMembershipWalletRequestedInput] = useState<string | null>(null);
  const [selectedMembershipDiscountIds, setSelectedMembershipDiscountIds] = useState<string[]>([]);
  const [applyLoyaltyDiscount, setApplyLoyaltyDiscount] = useState(false);
  const [applyRewardPoints, setApplyRewardPoints] = useState(false);
  const [rewardPointsToRedeemInput, setRewardPointsToRedeemInput] = useState<string | null>(null);
  const [applyReferralCredit, setApplyReferralCredit] = useState(false);
  const [referralCreditRequestedInput, setReferralCreditRequestedInput] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setIsLoadingBalances(false);
    setEWalletBalance(0);
    setRewardPointsBalance(0);
    setReferralBalance(0);
    setLoyaltyEligibility(null);
    setMembershipAssignments([]);
    setMembershipHistory([]);
    setClientMembershipRecords([]);
    setBalancesError(null);
    setRules(null);
    setApplyEwallet(false);
    setEWalletRequestedInput(null);
    setApplyMembershipWallet(false);
    setMembershipWalletRequestedInput(null);
    setSelectedMembershipDiscountIds([]);
    setApplyLoyaltyDiscount(false);
    setApplyRewardPoints(false);
    setRewardPointsToRedeemInput(null);
    setApplyReferralCredit(false);
    setReferralCreditRequestedInput(null);
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

      const [eWalletResult, historyResult, loyaltyResult, assignmentsResult, clientMembershipsResult, rulesResult] = await Promise.allSettled([
        ewalletService.getBalance(targetClientId, salonId),
        clientService.getClientHistoryWithSummary(targetClientId),
        membershipService.getLoyaltyEligibility(targetClientId, salonId),
        clientMembershipService.getClientAssignments(targetClientId, salonId),
        clientService.getClientMemberships(targetClientId),
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
        setMembershipHistory(historyResult.value.memberships);
        setRewardPointsBalance(rewardPointsService.getBalanceFromHistorySummary(summary).balance);
        setReferralBalance(referralService.getBalanceFromHistorySummary(summary).balance);
      }

      if (clientMembershipsResult.status === "fulfilled") {
        setClientMembershipRecords(clientMembershipsResult.value);
      }

      if (loyaltyResult.status === "fulfilled") {
        setLoyaltyEligibility(loyaltyResult.value);
      }

      {
        // Use the same full membership rows as the web client profile to
        // backfill wallet data. The history endpoint omits pricing/benefit
        // fields, and the assignments endpoint may omit wallet balances.
        // The redemption only sends an apply* flag (keyed to the client server
        // side), never an assignment id, so a synthesized entry is safe.
        const assignments = assignmentsResult.status === "fulfilled" ? assignmentsResult.value : [];
        const historyMemberships = historyResult.status === "fulfilled" ? historyResult.value.memberships : [];
        const profileMemberships = clientMembershipsResult.status === "fulfilled" ? clientMembershipsResult.value : [];
        const membershipDetailsById = new Map<string, (typeof historyMemberships)[number] | (typeof profileMemberships)[number]>();
        const membershipDetailsByName = new Map<string, (typeof historyMemberships)[number] | (typeof profileMemberships)[number]>();
        for (const record of historyMemberships) {
          if (record.status.trim().toLowerCase() !== "active") continue;
          membershipDetailsById.set(record.id, record);
          membershipDetailsByName.set(record.membershipName.trim().toLowerCase(), record);
        }
        for (const record of profileMemberships) {
          if (record.status.trim().toLowerCase() !== "active") continue;
          membershipDetailsById.set(record.id, record);
          membershipDetailsByName.set(record.membershipName.trim().toLowerCase(), record);
        }

        const enrichedAssignments = assignments.map((assignment) => {
          const record = membershipDetailsById.get(assignment.id)
            ?? membershipDetailsByName.get(assignment.membershipName.trim().toLowerCase());
          if (!record) return assignment;
          return {
            ...assignment,
            walletBalance: (assignment.walletBalance ?? 0) > 0 ? assignment.walletBalance : (record.membershipWalletBalance || assignment.walletBalance),
            discountBalanceRemaining: (assignment.discountBalanceRemaining ?? 0) > 0 ? assignment.discountBalanceRemaining : (record.discountBalanceRemaining || assignment.discountBalanceRemaining),
          };
        });

        const assignedIds = new Set(enrichedAssignments.map((assignment) => assignment.id));
        const synthesized: ClientMembershipAssignment[] = [...membershipDetailsById.values()]
          .filter((record) => !assignedIds.has(record.id) && (record.membershipWalletBalance > 0 || record.discountBalanceRemaining > 0))
          .map((record) => ({
            appliesTo: record.appliesTo,
            assignedAt: record.purchasedAt,
            benefits: [],
            benefitType: record.benefitType ?? "discount_balance",
            cancelledAt: null,
            categoryIds: [],
            clientId: targetClientId,
            clientName: "",
            discountBalanceRemaining: record.discountBalanceRemaining || null,
            expiresAt: record.expiresAt,
            history: [],
            id: record.id,
            membershipId: "",
            membershipName: record.membershipName,
            pricingType: record.pricingType ?? (record.membershipWalletBalance > 0 ? "value" : null),
            discountPercent: record.discountPercent,
            remainingBenefits: record.totalSessions > 0 ? record.remainingSessions : null,
            renewedAt: null,
            startsAt: record.purchasedAt,
            status: "active",
            walletBalance: record.membershipWalletBalance || null,
          }));

        setMembershipAssignments(
          [...enrichedAssignments, ...synthesized].filter((assignment) => assignment.status === "active" && (!assignment.expiresAt || (new Date(/^\d{4}-\d{2}-\d{2}$/.test(assignment.expiresAt) ? `${assignment.expiresAt}T23:59:59.999` : assignment.expiresAt).getTime() >= Date.now()))),
        );
      }
      setRules(rulesResult.status === "fulfilled" ? rulesResult.value : null);

      const firstFailure = [eWalletResult, historyResult, loyaltyResult, assignmentsResult, clientMembershipsResult, rulesResult].find(
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

  const activeProfileWallets = clientMembershipRecords
    .filter((membership) => {
      const expiresAt = membership.expiresAt ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(membership.expiresAt) ? `${membership.expiresAt}T23:59:59.999` : membership.expiresAt).getTime() : null;
      return membership.status.trim().toLowerCase() === "active"
        && (expiresAt === null || !Number.isFinite(expiresAt) || expiresAt >= Date.now())
        && membership.membershipWalletBalance > 0;
    })
    .map((membership) => ({ id: membership.id, membershipName: membership.membershipName, walletBalance: membership.membershipWalletBalance }));
  const activeAssignmentWallets = membershipAssignments
    .filter((assignment) => (assignment.walletBalance ?? 0) > 0)
    .map((assignment) => ({ id: assignment.id, membershipName: assignment.membershipName, walletBalance: assignment.walletBalance ?? 0 }));
  const walletById = new Map(activeAssignmentWallets.map((membership) => [membership.id, membership]));
  for (const membership of activeProfileWallets) walletById.set(membership.id, membership);
  const membershipWalletBenefits = [...walletById.values()];
  const membershipWalletBalance = membershipWalletBenefits.reduce((sum, assignment) => sum + assignment.walletBalance, 0);
  const membershipWalletName = membershipWalletBenefits.map((membership) => membership.membershipName).join(", ") || null;
  const pricingContext = useMemo(() => ({ eWalletBalance, rewardPointsBalance, referralBalance, rules }), [eWalletBalance, rewardPointsBalance, referralBalance, rules]);
  const membershipDiscountAssignment =
    membershipAssignments.find(hasMembershipDiscount) ?? null;
  const activeMemberships = membershipHistory.filter((record) => {
    const status = record.status.trim().toLowerCase();
    const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : null;
    return status === "active" && (expiresAt === null || !Number.isFinite(expiresAt) || expiresAt >= Date.now());
  });
  // Client history intentionally contains only purchase/session fields; the
  // assignment endpoint carries the plan's pricing and benefit configuration.
  // Use that same assignment data for checkout eligibility and selection IDs.
  const membershipsById = new Map<string, (typeof clientMembershipRecords)[number] | (typeof membershipAssignments)[number]>();
  for (const membership of clientMembershipRecords) {
    membershipsById.set(membership.id, membership);
  }
  for (const membership of membershipAssignments) {
    if (!membershipsById.has(membership.id)) membershipsById.set(membership.id, membership);
  }
  const eligibleMembershipDiscounts = [...membershipsById.values()].filter((membership) => {
    const expiresAt = membership.expiresAt ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(membership.expiresAt) ? `${membership.expiresAt}T23:59:59.999` : membership.expiresAt).getTime() : null;
    return membership.status.trim().toLowerCase() === "active"
      && (expiresAt === null || !Number.isFinite(expiresAt) || expiresAt >= Date.now())
      && membership.pricingType === "percentage"
      && (membership.benefitType === "validity" || (membership.discountBalanceRemaining ?? 0) > 0)
      && (membership.discountPercent ?? 0) > 0;
  });
  const eligibleMembershipDiscountIds = useMemo(
    () => new Set(eligibleMembershipDiscounts.map((record) => record.id)),
    [eligibleMembershipDiscounts],
  );
  const applyMembershipDiscount = selectedMembershipDiscountIds.some((id) => eligibleMembershipDiscountIds.has(id));
  const toggleMembershipDiscount = useCallback((id: string, checked: boolean) => {
    setSelectedMembershipDiscountIds((current) => checked
      ? (current.includes(id) ? current : [...current, id])
      : current.filter((selectedId) => selectedId !== id));
  }, []);
  useEffect(() => {
    setSelectedMembershipDiscountIds((current) => {
      const next = current.filter((id) => eligibleMembershipDiscountIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [eligibleMembershipDiscountIds]);
  const isLoyaltyEligible = loyaltyEligibility?.eligible ?? false;
  const loyaltyNextTierHint = loyaltyEligibility?.nextTier
    ? `next: ${loyaltyEligibility.nextTier.discountPercent}% at ${loyaltyEligibility.nextTier.thresholdValue} visits`
    : null;
  const toggleEwallet = useCallback((value: boolean) => { setApplyEwallet(value); setEWalletRequestedInput(null); }, []);
  const toggleMembershipWallet = useCallback((value: boolean) => { setApplyMembershipWallet(value); setMembershipWalletRequestedInput(null); }, []);
  const toggleRewardPoints = useCallback((value: boolean) => { setApplyRewardPoints(value); setRewardPointsToRedeemInput(null); }, []);
  const toggleReferralCredit = useCallback((value: boolean) => { setApplyReferralCredit(value); setReferralCreditRequestedInput(null); }, []);

  const buildPricingFlags = useCallback((): RedemptionPricingFlags => {
    if (!clientId) {
      return EMPTY_FLAGS;
    }

    return {
      ...(applyEwallet ? { applyEwallet: true, ...(eWalletRequestedInput !== null ? { eWalletRequested: parseAmount(eWalletRequestedInput) } : {}) } : {}),
      ...(applyMembershipWallet && membershipWalletBenefits.length > 0
        ? { applyMembershipWallet: true, ...(membershipWalletRequestedInput !== null ? { membershipWalletRequested: parseAmount(membershipWalletRequestedInput) } : {}) }
        : {}),
      // The server owns final membership eligibility and discount calculation.
      // Allow an explicitly selected active membership card to reach pricing,
      // even when the client-assignment summary omitted its discount fields.
      ...(applyMembershipDiscount ? { applyMembershipDiscount: true, membershipDiscountIds: selectedMembershipDiscountIds } : {}),
      ...(applyLoyaltyDiscount && isLoyaltyEligible ? { applyLoyaltyDiscount: true } : {}),
      ...(applyRewardPoints
        ? { applyRewardPoints: true, ...(rewardPointsToRedeemInput !== null ? { rewardPointsToRedeem: Math.floor(parseAmount(rewardPointsToRedeemInput)) } : {}) }
        : {}),
      ...(applyReferralCredit
        ? { applyReferralCredit: true, ...(referralCreditRequestedInput !== null ? { referralCreditRequested: parseAmount(referralCreditRequestedInput) } : {}) }
        : {}),
    };
  }, [
    applyEwallet,
    applyLoyaltyDiscount,
    applyMembershipDiscount,
    selectedMembershipDiscountIds,
    applyMembershipWallet,
    applyReferralCredit,
    applyRewardPoints,
    clientId,
    eWalletRequestedInput,
    isLoyaltyEligible,
    membershipDiscountAssignment,
    membershipWalletBenefits.length,
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
    isMembershipDiscountEligible: eligibleMembershipDiscounts.length > 0,
    activeMemberships,
    eligibleMembershipDiscounts,
    selectedMembershipDiscountIds,
    isMembershipWalletEligible: membershipWalletBenefits.length > 0,
    loyaltyDiscountPercent: loyaltyEligibility?.discountPercent ?? 0,
    loyaltyName: loyaltyEligibility?.name ?? null,
    loyaltyNextTierHint,
    membershipDiscountBalanceRemaining: membershipDiscountAssignment?.discountBalanceRemaining ?? 0,
    isValidityMembershipDiscount: membershipDiscountAssignment?.benefitType === "validity",
    membershipDiscountName: membershipDiscountAssignment?.membershipName ?? null,
    membershipDiscountPercent: membershipDiscountAssignment?.discountPercent ?? 0,
    membershipWalletBalance,
    membershipWalletBenefits,
    membershipWalletName,
    pricingContext,
    membershipWalletRequestedInput,
    referralBalance,
    referralCreditRequestedInput,
    refreshBalances: () => refreshBalances(clientId),
    rewardPointsBalance,
    rewardPointsToRedeemInput,
    setApplyEwallet: toggleEwallet,
    setApplyLoyaltyDiscount,
    toggleMembershipDiscount,
    setApplyMembershipWallet: toggleMembershipWallet,
    setApplyReferralCredit: toggleReferralCredit,
    setApplyRewardPoints: toggleRewardPoints,
    setEWalletRequestedInput,
    setMembershipWalletRequestedInput,
    setReferralCreditRequestedInput,
    setRewardPointsToRedeemInput,
  };
};
