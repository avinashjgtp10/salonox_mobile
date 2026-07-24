import { useCallback, useMemo, useReducer } from "react";

import type { CartItem, CartItemSource } from "@/features/quickSale/types";
import type { SaleLineItemRequest } from "@/types/sales";

export type AddItemInput = {
  category?: string | null;
  defaultStaffId?: string | null;
  defaultStaffName?: string | null;
  duration?: string;
  itemId: string;
  itemType: CartItemSource;
  name: string;
  packageCoverageClientPackageId?: string;
  packageCoverageRemaining?: number;
  packageCoverageServiceId?: string;
  taxAmount?: number;
  taxRate?: number;
  unitPrice: number;
};

type CartAction =
  | { input: AddItemInput; type: "add" }
  | { lineId: string; type: "remove" }
  | { index: number; item: CartItem; type: "restore" }
  | { lineId: string; quantity: number; type: "setQuantity" }
  | { lineId: string; staffId: string | null; staffName: string | null; type: "setStaff" }
  | { lineId: string; note: string; type: "setNote" }
  | { discountAmount: number; lineId: string; type: "setDiscount" }
  | { lineId: string; type: "duplicate" }
  | { unitPrice: number; lineId: string; type: "setPrice" }
  | { input: AddItemInput; lineId: string; type: "replace" }
  | { type: "clear" };

let lineIdCounter = 0;
const nextLineId = () => {
  lineIdCounter += 1;
  return `cart-line-${lineIdCounter}`;
};

const isSaleLineItem = (item: CartItem): item is CartItem & { itemType: Exclude<CartItemSource, "package"> } =>
  item.itemType !== "package";

const cartReducer = (state: CartItem[], action: CartAction): CartItem[] => {
  switch (action.type) {
    case "add": {
      const existing = state.find(
        (item) => item.itemType === action.input.itemType && item.itemId === action.input.itemId,
      );

      if (existing) {
        return state.map((item) =>
          item.lineId === existing.lineId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      const newItem: CartItem = {
        category: action.input.category ?? null,
        discountAmount: 0,
        duration: action.input.duration,
        itemId: action.input.itemId,
        itemType: action.input.itemType,
        lineId: nextLineId(),
        name: action.input.name,
        note: "",
        originalUnitPrice: action.input.unitPrice,
        packageCoverageClientPackageId: action.input.packageCoverageClientPackageId,
        packageCoverageRemaining: action.input.packageCoverageRemaining,
        packageCoverageServiceId: action.input.packageCoverageServiceId,
        quantity: 1,
        staffId: action.input.defaultStaffId ?? null,
        staffName: action.input.defaultStaffName ?? null,
        taxAmount: action.input.taxAmount,
        taxRate: action.input.taxRate,
        unitPrice: action.input.unitPrice,
      };

      return [...state, newItem];
    }

    case "remove":
      return state.filter((item) => item.lineId !== action.lineId);

    case "restore": {
      const existing = state.find(
        (item) => item.itemType === action.item.itemType && item.itemId === action.item.itemId,
      );

      if (existing) {
        return state.map((item) =>
          item.lineId === existing.lineId ? { ...item, quantity: item.quantity + action.item.quantity } : item,
        );
      }

      const next = [...state];
      next.splice(Math.min(action.index, next.length), 0, action.item);
      return next;
    }

    case "setQuantity":
      return state.map((item) =>
        item.lineId === action.lineId
          ? { ...item, quantity: Math.max(1, Math.round(action.quantity)) }
          : item,
      );

    case "setStaff":
      return state.map((item) =>
        item.lineId === action.lineId
          ? { ...item, staffId: action.staffId, staffName: action.staffName }
          : item,
      );

    case "setNote":
      return state.map((item) => (item.lineId === action.lineId ? { ...item, note: action.note } : item));

    case "setDiscount":
      return state.map((item) =>
        item.lineId === action.lineId
          ? {
              ...item,
              discountAmount: Math.max(0, Math.min(action.discountAmount, item.unitPrice * item.quantity)),
            }
          : item,
      );

    case "setPrice":
      return state.map((item) =>
        item.lineId === action.lineId ? { ...item, unitPrice: Math.max(0, action.unitPrice) } : item,
      );

    case "duplicate": {
      const source = state.find((item) => item.lineId === action.lineId);

      if (!source) {
        return state;
      }

      return state.map((item) =>
        item.lineId === source.lineId ? { ...item, quantity: item.quantity + 1 } : item,
      );
    }

    case "replace": {
      const target = state.find((item) => item.lineId === action.lineId);

      if (!target) {
        return state;
      }

      const existing = state.find(
        (item) =>
          item.lineId !== action.lineId &&
          item.itemType === action.input.itemType &&
          item.itemId === action.input.itemId,
      );

      if (existing) {
        return state
          .filter((item) => item.lineId !== action.lineId)
          .map((item) =>
            item.lineId === existing.lineId ? { ...item, quantity: item.quantity + target.quantity } : item,
          );
      }

      return state.map((item) =>
        item.lineId === action.lineId
          ? {
              ...item,
              category: action.input.category ?? null,
              duration: action.input.duration,
              itemId: action.input.itemId,
              name: action.input.name,
              originalUnitPrice: action.input.unitPrice,
              packageCoverageClientPackageId: action.input.packageCoverageClientPackageId,
              packageCoverageRemaining: action.input.packageCoverageRemaining,
              packageCoverageServiceId: action.input.packageCoverageServiceId,
              taxAmount: action.input.taxAmount,
              taxRate: action.input.taxRate,
              unitPrice: action.input.unitPrice,
            }
          : item,
      );
    }

    case "clear":
      return [];

    default:
      return state;
  }
};

export const useCart = () => {
  const [items, dispatch] = useReducer(cartReducer, []);

  const addItem = useCallback((input: AddItemInput) => dispatch({ input, type: "add" }), []);

  const removeItem = useCallback(
    (lineId: string) => {
      const index = items.findIndex((item) => item.lineId === lineId);
      const removed = items[index];

      dispatch({ lineId, type: "remove" });

      return removed && index >= 0 ? { index, item: removed } : null;
    },
    [items],
  );

  const restoreItem = useCallback(
    (item: CartItem, index: number) => dispatch({ index, item, type: "restore" }),
    [],
  );

  const setQuantity = useCallback(
    (lineId: string, quantity: number) => dispatch({ lineId, quantity, type: "setQuantity" }),
    [],
  );

  const setStaff = useCallback(
    (lineId: string, staffId: string | null, staffName: string | null) =>
      dispatch({ lineId, staffId, staffName, type: "setStaff" }),
    [],
  );

  const setNote = useCallback(
    (lineId: string, note: string) => dispatch({ lineId, note, type: "setNote" }),
    [],
  );

  const setDiscount = useCallback(
    (lineId: string, discountAmount: number) => dispatch({ discountAmount, lineId, type: "setDiscount" }),
    [],
  );

  const setPrice = useCallback(
    (lineId: string, unitPrice: number) => dispatch({ lineId, type: "setPrice", unitPrice }),
    [],
  );

  const duplicateItem = useCallback((lineId: string) => dispatch({ lineId, type: "duplicate" }), []);

  const replaceItem = useCallback(
    (lineId: string, input: AddItemInput) => dispatch({ input, lineId, type: "replace" }),
    [],
  );

  const clearCart = useCallback(() => dispatch({ type: "clear" }), []);

  const toSaleLineItemRequests = useCallback((): SaleLineItemRequest[] => {
    return items.filter(isSaleLineItem).map((item) => ({
      discountAmount: item.discountAmount || undefined,
      itemId: item.itemId || undefined,
      itemType: item.itemType,
      name: item.name,
      quantity: item.quantity,
      staffId: item.staffId ?? undefined,
      unitPrice: item.unitPrice,
    }));
  }, [items]);

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  return {
    addItem,
    clearCart,
    duplicateItem,
    itemCount,
    items,
    removeItem,
    replaceItem,
    restoreItem,
    setDiscount,
    setNote,
    setPrice,
    setQuantity,
    setStaff,
    toSaleLineItemRequests,
  };
};
