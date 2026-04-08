import { createContext, useContext, useState, type ReactNode } from "react";

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

interface SaleContextType {
  cart: SaleItem[];
  client: Client | null;
  drafts: any[];
  addToCart: (item: SaleItem) => void;
  removeFromCart: (itemId: number | string) => void;
  setClient: (client: Client | null) => void;
  clearCart: () => void;
  getTotal: () => number;
  saveDraft: (data: { cart: SaleItem[]; client: Client | null }) => void;
  cancelDraft: (id: string) => void;
}

const SaleContext = createContext<SaleContextType | undefined>(undefined);

export function SaleProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);

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

  const clearCart = () => {
    setCart([]);
    setClient(null);
  };

  const getTotal = () => {
    return cart.reduce(
      (total, item) => total + item.price * (item.quantity || 1),
      0,
    );
  };

  const saveDraft = (data: { cart: SaleItem[]; client: Client | null }) => {
    const newDraft = {
      id: `#${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      client: data.client?.name || "Walk-In",
      status: "Draft",
      created: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: data.cart,
      total: data.cart.reduce(
        (sum, item) => sum + item.price * (item.quantity || 1),
        0,
      ),
    };
    setDrafts((prev) => [newDraft, ...prev]);
    clearCart();
  };

  const cancelDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

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
