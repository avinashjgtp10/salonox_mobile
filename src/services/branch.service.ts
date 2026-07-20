import { salonService } from "@/services/salon.service";
import type { Branch } from "@/types/branch";
import type { SalonListItem } from "@/types/salon";

// The backend has no multi-branch endpoint yet — a "branch" is the caller's
// single salon (GET /salons/me). Once a real "list my branches" endpoint
// exists, only this file needs to change; everything above it (slice, UI,
// refresh coordination, persistence) already works over a Branch[] of any
// length.
const toBranch = (salon: SalonListItem): Branch => ({
  city: salon.city,
  id: salon.id,
  isActive: salon.isActive,
  name: salon.name,
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
