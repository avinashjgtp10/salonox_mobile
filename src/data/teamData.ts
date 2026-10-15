export type TeamFilter = "All" | "Working" | "Available" | "Busy" | "On Leave" | "Inactive";

export type TeamSortOption =
  | "Highest Revenue"
  | "Most Appointments"
  | "Best Rating"
  | "Alphabetical";

export type StaffAvailability = "Available" | "Busy" | "On Leave" | "Offline";

export type StaffStatus =
  | "Working"
  | "Available"
  | "Busy"
  | "Break"
  | "On Leave"
  | "Inactive";

export type StaffMember = {
  id: string;
  userId?: string | null;
  staffIdAliases?: string[];
  initials: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  gender: string;
  joiningDate: string;
  workingHours: string;
  status: StaffStatus;
  availability: StaffAvailability;
  todayAppointments: number;
  todayRevenue: number;
  servicesCompleted: number;
  averageRating: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  attendance: string;
  leaveBalance: string;
  assignedServices: string[];
  notes: string;
  avatarBg: string;
  avatarColor: string;
  availabilityLabel: string;
  todayScheduleNote: string;
  lastSeen: string;
  employeeCode?: string;
  address?: string;
  avatarUrl?: string | null;
  birthdayDay?: number | null;
  birthdayMonth?: number | null;
  designation?: string;
  holidays?: number | null;
  permissionLevel?: string;
  phoneCountryCode?: string;
  workingHoursPerDay?: number | null;
  loginAccess?: boolean;
  emailVerified?: boolean;
};

export type TeamSummaryItem = {
  id: string;
  icon: "people-outline" | "briefcase-outline" | "flash-outline" | "calendar-clear-outline";
  subtitle: string;
  title: string;
  value: string;
};

export const TEAM_FILTERS: TeamFilter[] = [
  "All",
  "Working",
  "Available",
  "Busy",
  "On Leave",
  "Inactive",
];

export const TEAM_SORT_OPTIONS: TeamSortOption[] = [
  "Highest Revenue",
  "Most Appointments",
  "Best Rating",
  "Alphabetical",
];

export const getTeamSummary = (staffMembers: StaffMember[]): TeamSummaryItem[] => {
  const totalStaff = staffMembers.length;
  const workingToday = staffMembers.filter(
    (member) => member.status !== "On Leave" && member.status !== "Inactive",
  ).length;
  const availableNow = staffMembers.filter(
    (member) => member.availability === "Available",
  ).length;
  const onLeave = staffMembers.filter((member) => member.status === "On Leave").length;

  return [
    {
      id: "total",
      icon: "people-outline",
      subtitle: "Registered employees",
      title: "Total Staff",
      value: String(totalStaff),
    },
    {
      id: "working",
      icon: "briefcase-outline",
      subtitle: "Scheduled on today's floor",
      title: "Working Today",
      value: String(workingToday),
    },
    {
      id: "available",
      icon: "flash-outline",
      subtitle: "Ready for the next client",
      title: "Available Now",
      value: String(availableNow),
    },
    {
      id: "leave",
      icon: "calendar-clear-outline",
      subtitle: "Approved leave requests",
      title: "On Leave",
      value: String(onLeave),
    },
  ];
};

export const matchesTeamSearch = (staffMember: StaffMember, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const digitsOnly = normalizedQuery.replace(/\D/g, "");

  return (
    staffMember.name.toLowerCase().includes(normalizedQuery) ||
    staffMember.role.toLowerCase().includes(normalizedQuery) ||
    (digitsOnly.length > 0 && staffMember.phone.includes(digitsOnly))
  );
};

export const matchesTeamFilter = (staffMember: StaffMember, filter: TeamFilter) => {
  switch (filter) {
    case "All":
      return true;
    case "Working":
      return ["Working", "Available", "Busy", "Break"].includes(staffMember.status);
    case "Available":
      return staffMember.availability === "Available";
    case "Busy":
      return staffMember.availability === "Busy";
    case "On Leave":
      return staffMember.status === "On Leave";
    case "Inactive":
      return staffMember.status === "Inactive" || staffMember.availability === "Offline";
    default:
      return true;
  }
};

export const sortTeamMembers = (staffMembers: StaffMember[], sortOption: TeamSortOption) => {
  const sorted = [...staffMembers];

  switch (sortOption) {
    case "Highest Revenue":
      return sorted.sort((left, right) => right.todayRevenue - left.todayRevenue);
    case "Most Appointments":
      return sorted.sort((left, right) => right.todayAppointments - left.todayAppointments);
    case "Best Rating":
      return sorted.sort((left, right) => right.averageRating - left.averageRating);
    case "Alphabetical":
      return sorted.sort((left, right) => left.name.localeCompare(right.name));
    default:
      return sorted;
  }
};
