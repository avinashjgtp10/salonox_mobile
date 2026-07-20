// Relocated to the shared UI primitives so other modules (Clients,
// Notifications, etc.) can reuse the same EmptyState/ErrorState/InlineLoader/
// SkeletonBlock instead of hand-rolling their own. Re-exported here so no
// existing import path in the quickSale module needs to change.
export * from "@/components/ui/StateViews";
