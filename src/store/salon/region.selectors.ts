import type { RootState } from "@/store";
import { salonCountry, validSalonTimezone } from "@/utils/salonRegion";

function activeRegion(state: RootState) {
  const id = state.branch.activeBranchId ?? state.user.user?.salonId;
  return state.salon.salons.find(salon => salon.id === id) ?? state.branch.branches.find(branch => branch.id === id);
}

export const selectSalonTimezone = (state: RootState) => validSalonTimezone(activeRegion(state)?.timezone);
// null (not the default) until a salon/branch is actually known, so the app-wide
// timezone shim doesn't force Asia/Kolkata on a signed-out device before any salon loads.
export const selectAppTimezoneSetting = (state: RootState) => {
  const region = activeRegion(state);
  return region ? validSalonTimezone(region.timezone) : null;
};
export const selectSalonCountry = (state: RootState) => {
  const region = activeRegion(state);
  // No region yet: keep ordinary suggestions until branch metadata arrives.
  return region ? salonCountry(region.country, region.countryCode, region.timezone) : null;
};
