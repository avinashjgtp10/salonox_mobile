import type { ClientFilterValue, ClientListItem } from "@/types/client";

export const STATUS_FILTERS = ["All", "Active", "Inactive", "Blocked"] as const;
export const MEMBERSHIP_FILTERS = ["All", "Has Membership", "No Membership"] as const;
export const CLIENT_SORT_OPTIONS = ["Recent", "Name A-Z", "Last Visit", "Highest Spending"] as const;

export type ClientStatusFilter = (typeof STATUS_FILTERS)[number];
export type ClientMembershipFilter = (typeof MEMBERSHIP_FILTERS)[number];
export type ClientSortOption = (typeof CLIENT_SORT_OPTIONS)[number];

export const DEFAULT_STATUS_FILTER: ClientStatusFilter = "All";
export const DEFAULT_MEMBERSHIP_FILTER: ClientMembershipFilter = "All";
export const DEFAULT_SORT_OPTION: ClientSortOption = "Recent";

export const getClientListKey = (client: ClientListItem, index: number) =>
  client.hasValidId ? client.id : `invalid-client-row-${index}`;

export function getStatusQueryValue(status: ClientStatusFilter): "active" | "all" | "blocked" | "inactive" {
  switch (status) {
    case "Active":
      return "active";
    case "Blocked":
      return "blocked";
    case "Inactive":
      return "inactive";
    case "All":
    default:
      return "all";
  }
}

export function getMembershipQueryValue(membership: ClientMembershipFilter): "all" | "has" | "none" {
  switch (membership) {
    case "Has Membership":
      return "has";
    case "No Membership":
      return "none";
    case "All":
    default:
      return "all";
  }
}

export function getFilterValue(
  status: ClientStatusFilter,
  membership: ClientMembershipFilter,
): ClientFilterValue | null {
  if (membership === "Has Membership") {
    return "membership";
  }

  if (membership === "No Membership") {
    return "no_membership";
  }

  switch (status) {
    case "Active":
      return "active";
    case "Blocked":
      return "blocked";
    case "Inactive":
      return "inactive";
    case "All":
    default:
      return null;
  }
}

export function isCreatedToday(createdAt: string | null) {
  if (!createdAt) {
    return false;
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const today = new Date();
  return (
    parsedDate.getFullYear() === today.getFullYear() &&
    parsedDate.getMonth() === today.getMonth() &&
    parsedDate.getDate() === today.getDate()
  );
}

export function getSortQuery(sortOption: ClientSortOption) {
  switch (sortOption) {
    case "Name A-Z":
      return { sort_by: "full_name", sort_order: "asc" as const };
    case "Highest Spending":
      return { sort_by: "lifetime_spend", sort_order: "desc" as const };
    case "Last Visit":
      return { sort_by: "last_visit", sort_order: "desc" as const };
    case "Recent":
    default:
      return { sort_by: "created_at", sort_order: "desc" as const };
  }
}
