export const getFeatureTourRoutes = (staff: boolean) => staff ? [
  { title: "My home", route: "/(staff)/home" },
  { title: "My appointments", route: "/(staff)/appointments" },
  { title: "My calendar", route: "/(staff)/calendar" },
] as const : [
  { title: "Dashboard", route: "/(tabs)/dashboard" },
  { title: "Calendar", route: "/(tabs)/calendar" },
  { title: "Appointments", route: "/bookings" },
  { title: "Clients", route: "/clients" },
  { title: "Staff", route: "/(tabs)/team" },
  { title: "Services", route: "/services" },
  { title: "Memberships", route: "/memberships" },
  { title: "Sales", route: "/sales" },
  { title: "Attendance", route: "/team/attendance" },
  { title: "Reports", route: "/reports" },
  { title: "Settings", route: "/(tabs)/more" },
] as const;
