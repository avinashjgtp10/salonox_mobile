import { salonService } from "@/services/salon.service";
import type { Branch } from "@/types/branch";
import type { SalonListItem } from "@/types/salon";
import { connectedBranchesService } from "./connectedBranches.service";
import { tokenStorage } from "./tokenStorage";

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
    const user = await tokenStorage.getStoredUser();
    if (user?.role === "salon_owner") {
      const main = await connectedBranchesService.main();
      if (!main.user.salonId) return [];
      const name = await connectedBranchesService.mainSalonName();
      const own: Branch = { id: main.user.salonId!, name, city: "", isActive: true, isMain: true };
      try {
        const data = await connectedBranchesService.list();
        return [own, ...data.branches.filter(branch => branch.branchSalonId !== own.id).map(branch => ({ id: branch.branchSalonId, name: branch.name || "Unnamed branch", city: "", isActive: branch.subscription.live }))];
      } catch (error) {
        if (error && typeof error === "object" && "status" in error && error.status === 403) return [own];
        throw error;
      }
    }
    const salon = await salonService.getSalonMe();

    if (!salon?.id) {
      return [];
    }

    return [toBranch(salon)];
  },
};
