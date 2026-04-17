import type { RootState } from "../store"; // adjust to your store path

export const selectMemberships           = (state: RootState) => state.memberships.items;
export const selectMembershipsTotal      = (state: RootState) => state.memberships.total;
export const selectSelectedMembership    = (state: RootState) => state.memberships.selectedMembership;
export const selectMembershipsLoading    = (state: RootState) => state.memberships.loading;
export const selectMembershipsSubmitting = (state: RootState) => state.memberships.submitting;
export const selectMembershipsError      = (state: RootState) => state.memberships.error;

export const selectMembershipById =
  (id: string) => (state: RootState) =>
    state.memberships.items.find((m) => m.id === id) ?? null;
