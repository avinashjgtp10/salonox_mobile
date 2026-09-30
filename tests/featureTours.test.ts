import fs from "node:fs";
import path from "node:path";
import { getFeatureTourRoutes } from "@/features/userGuide/featureTourRoutes";
import { screenTours } from "@/features/userGuide/screenTours";
import { VISIBLE_REPORT_GROUPS } from "@/features/reports/report-config";

test("staff can only launch tours in the staff experience", () => {
  expect(getFeatureTourRoutes(true).length).toBeGreaterThan(1);
  for (const tour of getFeatureTourRoutes(true)) expect(tour.route).toMatch(/^\/\(staff\)\//);
});

test("every tour picker destination is an existing app route", () => {
  for (const tour of [...getFeatureTourRoutes(false), ...getFeatureTourRoutes(true)]) {
    const base = path.join(__dirname, "../src/app", tour.route);
    expect(fs.existsSync(`${base}.tsx`) || fs.existsSync(path.join(base, "index.tsx"))).toBe(true);
  }
});

test("report spotlights use the actual visible report categories", () => {
  for (const step of screenTours.reports.steps) expect(VISIBLE_REPORT_GROUPS).toContain(step.target);
});

const screens: Record<keyof typeof screenTours, string[]> = {
  clients: ["features/clients/screens/ClientsScreen.tsx"],
  services: ["app/services/index.tsx"],
  memberships: ["app/memberships/index.tsx"],
  sales: ["app/sales/index.tsx"],
  team: ["app/(tabs)/team.tsx"],
  attendance: ["features/attendance/screens/AttendanceScreen.tsx"],
  calendar: ["features/appointments/screens/AppointmentCalendarScreen.tsx"],
  reports: ["features/reports/screens/reports-home-screen.tsx"],
  settings: ["app/(tabs)/more.tsx"],
  staffHome: ["app/(staff)/home.tsx"],
  staffCalendar: ["features/appointments/components/shared/FilterBar.tsx"],
  bookings: ["features/appointments/screens/AppointmentDashboardScreen.tsx", "features/appointments/components/shared/FilterBar.tsx"],
  staffAppointments: ["features/appointments/screens/StaffMyAppointmentsScreen.tsx"],
};

test.each(Object.keys(screens) as (keyof typeof screenTours)[])("%s tips point to registered controls", (name) => {
  const source = screens[name].map(file => fs.readFileSync(path.join(__dirname, "../src", file), "utf8")).join("\n");
  for (const step of screenTours[name].steps) {
    if (name === "reports") expect(source).toContain("tourId={group}");
    else if (name === "settings") {
      expect(source).toContain("tourId={item.title}");
      expect(source).toContain(`title: "${step.target}"`);
    } else expect(source).toContain(`tourId="${step.target}"`);
  }
});
