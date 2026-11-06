import { salonService } from "@/services/salon.service";
import type { Branch } from "@/types/branch";
import type { SalonListItem } from "@/types/salon";

const toBranch = (salon: SalonListItem): Branch => ({
  city: salon.city,
  id: salon.id,
  isActive: salon.isActive,
  name: salon.name,
  timezone: salon.timezone,
  country: salon.country,
  countryCode: salon.countryCode,
});

export const branchService = {
  async getMyBranches(): Promise<Branch[]> {
    const salon = await salonService.getSalonMe();

    if (!salon?.id) {
      return [];
    }

    return [toBranch(salon)];
  },
};
