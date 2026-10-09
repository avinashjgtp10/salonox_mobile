import type { AuthUser } from "@/types/auth";
import { normalizeAuthUser } from "@/utils/authUser";
import { isStaffBusinessWrite } from "@/utils/staffAccess";

// The staff write guard reads the user back from storage, which runs it
// through normalizeAuthUser. The Calendar & Quick Sale switch must survive
// that round trip or every Quick Sale payment fails as "read-only".
const staff: AuthUser = {
  id: "user-1", email: "raj@example.com", role: "staff", salonId: "salon-1", mobileCalendarAccess: true,
} as AuthUser;
const stored = (user: AuthUser) => normalizeAuthUser(JSON.parse(JSON.stringify(user)));

describe("staff Calendar & Quick Sale access", () => {
  it("keeps the switch through a save/load round trip", () => {
    expect(stored(staff).mobileCalendarAccess).toBe(true);
    expect(stored({ ...staff, mobileCalendarAccess: false }).mobileCalendarAccess).toBe(false);
  });

  it.each([
    ["post", "/sales"],
    ["patch", "/sales/sale-1"],
    ["post", "/sales/sale-1/checkout"],
    ["post", "/appointments"],
    ["post", "/appointments/appt-1/checkout"],
    ["post", "/payments"],
  ])("lets a staff member with the switch on %s %s", (method, url) => {
    expect(isStaffBusinessWrite(stored(staff), method, url)).toBe(false);
  });

  it("still blocks those writes when the switch is off", () => {
    expect(isStaffBusinessWrite(stored({ ...staff, mobileCalendarAccess: false }), "post", "/payments")).toBe(true);
  });
});
