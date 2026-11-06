import type { RootState } from "@/store";
import { salonCountry, validSalonTimezone } from "@/utils/salonRegion";

function activeRegion(state: RootState) {
  const id = state.branch.activeBranchId ?? state.user.user?.salonId;
  return state.salon.salons.find(salon => salon.id === id) ?? state.branch.branches.find(branch => branch.id === id);
}

export const selectSalonTimezone = (state: RootState) => validSalonTimezone(activeRegion(state)?.timezone);
export const selectSalonCountry = (state: RootState) => {
  const region = activeRegion(state);
  // No region yet: keep ordinary suggestions until branch metadata arrives.
  return region ? salonCountry(region.country, region.countryCode, region.timezone) : null;
};
