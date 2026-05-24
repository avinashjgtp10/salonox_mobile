import type { PaymentMethod } from "../../../types/sale.types";

export interface InitStaff { id: string; name: string; }
export interface InitService { id: string; name: string; price: number; duration: number; }
export interface LazyProduct { id: string; name: string; price: number | null; stock: number; }
export interface LazyMembership { name: string; price: number; }

export interface SvcRow {
  tempId: string; id: string; service: string; staffId: string;
  time: string; price: number; qty: number; total: number;
  duration: number; search: string; showDrop: boolean;
  discountVal: number; discountType: "percentage" | "flat";
  errors: string[];
}

export interface ProdRow {
  tempId: string; id: string; productName: string; price: number;
  qty: number; total: number; staffId: string; search: string;
  showDrop: boolean; stock: number | null;
  discountVal: number; discountType: "percentage" | "flat";
  errors: string[];
}

export interface MemRow {
  tempId: string; name: string; price: number; qty: number;
  total: number; staffId: string; search: string; showDrop: boolean;
  discountVal: number; discountType: "percentage" | "flat";
  errors: string[];
}

export interface SelectedClient {
  id: string; name: string; phone: string; initials: string; eWallet?: number;
}

export type ItemTab = "services" | "products" | "memberships";

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "cash",      label: "Cash",      icon: "💵" },
  { id: "card",      label: "Card",      icon: "💳" },
  { id: "upi",       label: "UPI",       icon: "📱" },
  { id: "gift_card", label: "Gift Card", icon: "🎁" },
];

export const SPLIT_METHODS: { id: string; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi",  label: "UPI"  },
];
