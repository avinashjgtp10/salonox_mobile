import { useSyncExternalStore } from "react";

import { environmentConfig } from "@/config/environment";
import { salonService } from "@/services/salon.service";
import type { AuthUser } from "@/types/auth";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { isStaffExperienceUser } from "@/utils/routeResolver";

/**
 * On the web an owner's profile picture is the salon logo (salons.logo_url):
 * it's what the topbar shows and what Business Settings uploads. The app uses
 * the same picture for owners so a change on either side shows on the other.
 * Staff keep their personal photo (users.avatar_url); they can't change the logo.
 */
type OwnerPhotoState = { loaded: boolean; url: string | null };

let state: OwnerPhotoState = { loaded: false, url: null };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

const emit = (next: OwnerPhotoState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usesSalonLogoAsProfilePhoto = (user: AuthUser | null | undefined) =>
  Boolean(user) && !isStaffExperienceUser(user);

export const setOwnerProfilePhoto = (url: string | null) => emit({ loaded: true, url });

export const resetOwnerProfilePhoto = () => emit({ loaded: false, url: null });

/** Re-reads the salon logo, bypassing the cached salon, so a change made on the web shows up. */
export function refreshOwnerProfilePhoto(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      salonService.clearSalonMeCache();
      const salon = await salonService.getSalonMe();
      setOwnerProfilePhoto(resolveMediaUrl(salon?.logoUrl, environmentConfig.apiBaseUrl));
    } catch {
      // Keep the last known picture; the next refresh tries again.
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** The profile picture to show for this user: the salon logo for owners, their own photo for staff. */
export function useProfilePhotoUrl(user: AuthUser | null | undefined): string | null {
  const owner = useSyncExternalStore(subscribe, () => state);
  if (!usesSalonLogoAsProfilePhoto(user)) return user?.avatarUrl ?? null;
  return owner.loaded ? owner.url : null;
}
