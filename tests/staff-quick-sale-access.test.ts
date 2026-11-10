import type { AuthUser } from "@/types/auth";
import { normalizeAuthUser } from "@/utils/authUser";
import { isStaffBusinessWrite } from "@/utils/staffAccess";

// The staff write guard reads the user back from storage, which runs it
// through normalizeAuthUser. The backend-resolved web permissions must survive
// that round trip or every authorized Quick Sale payment fails as "read-only".
const staff: AuthUser = {
  id: "user-1", email: "raj@example.com", role: "staff", salonId: "salon-1",
  effective_permissions: { view_calendar: true, access_quick_sale: true },
} as AuthUser;
const stored = (user: AuthUser) => normalizeAuthUser(JSON.parse(JSON.stringify(user)));

describe("staff Calendar & Quick Sale access", () => {
  it("keeps web permissions through a save/load round trip", () => {
    expect(stored(staff).mobileCalendarAccess).toBe(true);
    expect(stored(staff).effective_permissions).toEqual(staff.effective_permissions);
    expect(stored(stored(staff)).mobileCalendarAccess).toBe(true);
  });

  it.each([
    ["post", "/sales"],
    ["patch", "/sales/sale-1"],
    ["post", "/sales/sale-1/checkout"],
    ["post", "/appointments"],
    ["post", "/appointments/appt-1/checkout"],
    ["post", "/payments"],
  ])("lets a staff member with web permissions %s %s", (method, url) => {
    expect(isStaffBusinessWrite(stored(staff), method, url)).toBe(false);
  });

  it.each<Record<string, boolean>>([
    { view_calendar: false, access_quick_sale: true },
    { view_calendar: true, access_quick_sale: false },
    {},
  ])("blocks writes when either required web permission is missing: %j", (effective_permissions) => {
    const user = stored({ ...staff, effective_permissions, mobileCalendarAccess: true });
    expect(user.mobileCalendarAccess).toBe(false);
    expect(isStaffBusinessWrite(user, "post", "/payments")).toBe(true);
  });

  it("does not allow the retired mobile switch to grant access", () => {
    const user = stored({ ...staff, effective_permissions: null, mobileCalendarAccess: true });
    expect(user.mobileCalendarAccess).toBe(false);
    expect(isStaffBusinessWrite(user, "post", "/sales")).toBe(true);
  });

  it("uses web permissions even when a stored mobile flag is stale", () => {
    const user = stored({ ...staff, mobileCalendarAccess: false });
    expect(user.mobileCalendarAccess).toBe(true);
    expect(isStaffBusinessWrite(user, "post", "/payments")).toBe(false);
  });

  it("does not grant unrelated staff writes with Quick Sale permissions", () => {
    expect(isStaffBusinessWrite(stored(staff), "post", "/staff")).toBe(true);
  });
});
