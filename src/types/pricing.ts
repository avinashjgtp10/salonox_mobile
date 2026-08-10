export interface LineItem {
  price: number;
  qty: number;
  discount?: number;
  total?: number;
  categoryId?: string;
  isPackageService?: boolean;
  walletUsed?: number;
  membershipDiscountUsed?: number;
}

export interface CalculateTotalsBody {
  client_id?: string;
  appointment_id?: string;

  serviceRows: LineItem[];
  packageRows: LineItem[];
  productRows: LineItem[];
  membershipRows: LineItem[];

  discountType: "percentage" | "flat";
  discountValue: number;

  couponCode?: string;

  exCharges: number;
  tip: number;
  includeGst: boolean;

  applyEwallet?: boolean;
  eWalletRequested?: number;

  applyMembershipWallet?: boolean;
  membershipWalletRequested?: number;

  applyMembershipDiscount?: boolean;
  applyLoyaltyDiscount?: boolean;

  applyRewardPoints?: boolean;
  rewardPointsToRedeem?: number;

  applyReferralCredit?: boolean;
  referralCreditRequested?: number;
}

export interface TaxBreakdownEntry {
  name: string;
  rate: number;
  amount: number;
  inclusive: boolean;
}

export interface CalculateTotalsResponse {
  catalogTotal: number;
  itemDiscountTotal: number;
  subtotal: number;
  manualDiscount: number;
  totalDisc: number;
  taxable: number;
  gstAmount: number;
  taxBreakdown: TaxBreakdownEntry[];
  grandTotal: number;
  roundOff: number;
  preRedemptionTotal: number;
  displaySubtotal: number;

  rowTax?: { service: number[]; packages: number[]; product: number[]; membership: number[] };
  rowTaxableAmount?: { service: number[]; packages: number[]; product: number[]; membership: number[] };
  rowMembershipDiscount?: { service: number[]; product: number[] };
  rowMembershipWallet?: { service: number[]; product: number[] };

  appliedEWallet: number;
  appliedMembershipWallet: number;
  appliedRewardPointsValue: number;
  appliedReferralCredit: number;
  appliedMembershipDiscount: number;

  referralDiscountPreview: number;

  couponRejectedReason?: string;
  referralCreditRejectedReason?: string;

  alreadyAppliedThisAppointment?: {
    ewalletUsed: number;
    membershipWalletUsed: number;
    rewardPointsUsed: number;
    referralCreditUsed: number;
  };
}
