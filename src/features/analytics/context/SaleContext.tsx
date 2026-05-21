import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  createSaleThunk,
  updateSaleThunk,
} from "../../../middleware/sale/sale.thunk";
import type { Sale, SaleItemType } from "../../../types/sale.types";

// ── Local cart item (UI-only, not persisted until save/checkout) ──────────────
export interface SaleItem {
  id: number | string;
  name: string;
  price: number;
  type: "service" | "product" | "membership" | "giftcard" | "quick";
  duration?: string;
  quantity?: number;
}

export interface Client {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email?: string;
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface SaleContextType {
  cart: SaleItem[];
  client: Client | null;
  /** Draft sales from the Redux store */
  drafts: Sale[];
  addToCart: (item: SaleItem) => void;
  removeFromCart: (itemId: number | string) => void;
  setClient: (client: Client | null) => void;
  clearCart: () => void;
  getTotal: () => number;
  /** Saves current cart to the backend as a draft sale */
  saveDraft: (data: { cart: SaleItem[]; client: Client | null }) => Promise<void>;
  /** Deletes a draft sale from the backend */
  cancelDraft: (id: string | number) => void;
}

const SaleContext = createContext<SaleContextType | undefined>(undefined);

// ── Helper: map local cart type to backend item_type ─────────────────────────
function toBackendItemType(type: SaleItem["type"]): SaleItemType {
  if (type === "giftcard") return "gift_card";
  return type as SaleItemType;
}

export function SaleProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  // salon_id is required by the backend for every sale
  const salonId = useSelector(
    (state: RootState) => state.salon.currentSalon?.id,
  );

  // Drafts live in Redux — filter from the sale list
  const drafts = useSelector((state: RootState) =>
    ((state.sale as any).items as Sale[]).filter(
      (s) => s.status === "draft",
    ),
  );

  // Local cart state (UI-only until saved/checked-out)
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [client, setClientState] = useState<Client | null>(null);

  const setClient = (c: Client | null) => setClientState(c);

  const addToCart = (item: SaleItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.id === item.id && i.type === item.type,
      );
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: (i.quantity || 1) + 1 }
            : i,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number | string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const clearCart = useCallback(() => {
    setCart([]);
    setClientState(null);
  }, []);

  const getTotal = () =>
    cart.reduce((total, item) => total + item.price * (item.quantity || 1), 0);

  // ── saveDraft → POST /api/v1/sales with status: "draft" ────────────────────
  const saveDraft = useCallback(
    async (data: { cart: SaleItem[]; client: Client | null }) => {
      if (!salonId) {
        console.warn("[SaleContext] saveDraft: no salon ID available");
        return;
      }
      if (data.cart.length === 0) return;

      await dispatch(
        createSaleThunk({
          client_id: data.client?.id ?? null,
          status: "draft",
          items: data.cart.map((item) => ({
            item_type: toBackendItemType(item.type),
            name: item.name,
            quantity: item.quantity || 1,
            unit_price: String(item.price),
          })),
        }),
      );

      clearCart();
    },
    [dispatch, salonId, clearCart],
  );

  // ── cancelDraft → PATCH /api/v1/sales/:id  { status: "cancelled" } ──────────
  // (Backend has no DELETE route — cancelled drafts are soft-deleted via status)
  const cancelDraft = useCallback(
    (id: string | number) => {
      dispatch(updateSaleThunk({ id, data: { status: "cancelled" } }));
    },
    [dispatch],
  );

  return (
    <SaleContext.Provider
      value={{
        cart,
        client,
        drafts,
        addToCart,
        removeFromCart,
        setClient,
        clearCart,
        getTotal,
        saveDraft,
        cancelDraft,
      }}
    >
      {children}
    </SaleContext.Provider>
  );
}

export function useSale() {
  const context = useContext(SaleContext);
  if (!context) {
    throw new Error("useSale must be used within a SaleProvider");
  }
  return context;
}
