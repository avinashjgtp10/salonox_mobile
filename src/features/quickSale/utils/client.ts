import type { ClientListItem } from "@/types/client";
import type { QuickSaleClient } from "@/features/quickSale/types";

export const clientFromListItem = (client: ClientListItem): QuickSaleClient => ({
  avatarBg: "#e4edf9",
  avatarColor: "#7488a0",
  id: client.id,
  initials: client.initials,
  membership: client.membership,
  name: client.fullName,
  phone: client.phone,
});

export const getClientInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "WI";
