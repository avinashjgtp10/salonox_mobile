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

export const MOCK_STAFF_MEMBERS: StaffMember[] = [
  {
    assignedServices: ["Hair Cut", "Hair Spa", "Hair Color", "Keratin Treatment"],
    attendance: "96% this month",
    availability: "Busy",
    availabilityLabel: "With client until 3:15 PM",
    avatarBg: "#F2EFE9",
    avatarColor: "#726A63",
    averageRating: 4.9,
    email: "ariana.dsouza@salonox.com",
    gender: "Female",
    id: "ariana-dsouza",
    initials: "AD",
    joiningDate: "12 Mar 2022",
    lastSeen: "On floor",
    leaveBalance: "4 days",
    monthlyRevenue: 186500,
    name: "Ariana Dsouza",
    notes: "Top performer for premium color packages. Prefers morning slot allocation for long chemical services.",
    phone: "9876543210",
    role: "Senior Hair Stylist",
    servicesCompleted: 7,
    status: "Busy",
    todayAppointments: 6,
    todayRevenue: 18400,
    todayScheduleNote: "Color correction at 04:00 PM",
    weeklyRevenue: 68400,
    workingHours: "09:00 AM – 06:00 PM",
  },
  {
    assignedServices: ["Facial", "Cleanup", "Hydra Therapy", "Skin Consultation"],
    attendance: "98% this month",
    availability: "Available",
    availabilityLabel: "Next slot free in 20 mins",
    avatarBg: "#F2EFE9",
    avatarColor: "#726A63",
    averageRating: 4.8,
    email: "neha.malhotra@salonox.com",
    gender: "Female",
    id: "neha-malhotra",
    initials: "NM",
    joiningDate: "04 Jul 2021",
    lastSeen: "Treatment room 2",
    leaveBalance: "6 days",
    monthlyRevenue: 159800,
    name: "Neha Malhotra",
    notes: "Excellent upsell conversion on membership facials and advanced skin rituals.",
    phone: "9811122233",
    role: "Skin Therapist",
    servicesCompleted: 5,
    status: "Available",
    todayAppointments: 4,
    todayRevenue: 13200,
    todayScheduleNote: "Free before 02:30 PM appointment",
    weeklyRevenue: 54100,
    workingHours: "10:00 AM – 07:00 PM",
  },
  {
    assignedServices: ["Nail Art", "Gel Polish", "Manicure", "Pedicure"],
    attendance: "94% this month",
    availability: "Available",
    availabilityLabel: "Ready for walk-ins",
    avatarBg: "#F2EFE9",
    avatarColor: "#726A63",
    averageRating: 4.7,
    email: "pooja.khanna@salonox.com",
    gender: "Female",
    id: "pooja-khanna",
    initials: "PK",
    joiningDate: "18 Jan 2023",
    lastSeen: "Nail bar",
    leaveBalance: "5 days",
    monthlyRevenue: 118900,
    name: "Pooja Khanna",
    notes: "Strong retail product conversion. Popular for bridal nail prep packages.",
    phone: "9822233344",
    role: "Nail Artist",
    servicesCompleted: 8,
    status: "Working",
    todayAppointments: 7,
    todayRevenue: 9700,
    todayScheduleNote: "Walk-in friendly this afternoon",
    weeklyRevenue: 38600,
    workingHours: "11:00 AM – 08:00 PM",
  },
  {
    assignedServices: ["Beard Trim", "Hair Cut", "Head Massage", "Kids Cut"],
    attendance: "91% this month",
    availability: "Busy",
    availabilityLabel: "In service until 5:00 PM",
    avatarBg: "#F2EFE9",
    avatarColor: "#726A63",
    averageRating: 4.6,
    email: "rohit.mehra@salonox.com",
    gender: "Male",
    id: "rohit-mehra",
    initials: "RM",
    joiningDate: "22 Nov 2022",
    lastSeen: "Barber chair 1",
    leaveBalance: "3 days",
    monthlyRevenue: 126200,
    name: "Rohit Mehra",
    notes: "Efficient at high-volume men's grooming and quick turnaround bookings.",
    phone: "9899912345",
    role: "Barber",
    servicesCompleted: 9,
    status: "Busy",
    todayAppointments: 8,
    todayRevenue: 11400,
    todayScheduleNote: "Fully booked till evening",
    weeklyRevenue: 43100,
    workingHours: "09:30 AM – 06:30 PM",
  },
  {
    assignedServices: ["Hair Color", "Highlights", "Balayage", "Gloss Treatment"],
    attendance: "100% this month",
    availability: "On Leave",
    availabilityLabel: "Annual leave until tomorrow",
    avatarBg: "#F2EFE9",
    avatarColor: "#726A63",
    averageRating: 4.9,
    email: "sneha.iyer@salonox.com",
    gender: "Female",
    id: "sneha-iyer",
    initials: "SI",
    joiningDate: "10 Feb 2021",
    lastSeen: "On leave",
    leaveBalance: "2 days",
    monthlyRevenue: 201400,
    name: "Sneha Iyer",
    notes: "Leads advanced color consultations and premium transformation packages.",
    phone: "9870011223",
    role: "Color Specialist",
    servicesCompleted: 0,
    status: "On Leave",
    todayAppointments: 0,
    todayRevenue: 0,
    todayScheduleNote: "Leave approved by owner",
    weeklyRevenue: 49200,
    workingHours: "10:00 AM – 07:00 PM",
  },
  {
    assignedServices: ["Check-in", "Billing", "Walk-in Allocation", "Membership Support"],
    attendance: "97% this month",
    availability: "Available",
    availabilityLabel: "Front desk coverage active",
    avatarBg: "#F2EFE9",
    avatarColor: "#726A63",
    averageRating: 4.8,
    email: "aditya.rao@salonox.com",
    gender: "Male",
    id: "aditya-rao",
    initials: "AR",
    joiningDate: "29 Sep 2023",
    lastSeen: "Front desk",
    leaveBalance: "7 days",
    monthlyRevenue: 0,
    name: "Aditya Rao",
    notes: "Handles priority walk-ins and owner escalations with strong customer satisfaction scores.",
    phone: "9811009988",
    role: "Front Desk Coordinator",
    servicesCompleted: 16,
    status: "Working",
    todayAppointments: 13,
    todayRevenue: 0,
    todayScheduleNote: "Managing afternoon rush",
    weeklyRevenue: 0,
    workingHours: "09:00 AM – 06:00 PM",
  },
  {
    assignedServices: ["Bridal Makeup", "Party Makeup", "Consultation"],
    attendance: "88% this month",
    availability: "Offline",
    availabilityLabel: "Not scheduled today",
    avatarBg: "#F2EFE9",
    avatarColor: "#726A63",
    averageRating: 4.5,
    email: "kavya.sen@salonox.com",
    gender: "Female",
    id: "kavya-sen",
    initials: "KS",
    joiningDate: "14 Apr 2024",
    lastSeen: "Offline since yesterday",
    leaveBalance: "8 days",
    monthlyRevenue: 84200,
    name: "Kavya Sen",
    notes: "Part-time weekend makeup artist. Usually activated for events and festive rush.",
    phone: "9867788990",
    role: "Makeup Artist",
    servicesCompleted: 0,
    status: "Inactive",
    todayAppointments: 0,
    todayRevenue: 0,
    todayScheduleNote: "No shift assigned today",
    weeklyRevenue: 14800,
    workingHours: "11:00 AM – 07:00 PM",
  },
  {
    assignedServices: ["Body Spa", "Head Massage", "Deep Tissue Therapy", "Foot Ritual"],
    attendance: "95% this month",
    availability: "Busy",
    availabilityLabel: "Therapy room occupied",
    avatarBg: "#F2EFE9",
    avatarColor: "#726A63",
    averageRating: 4.8,
    email: "sameer.khan@salonox.com",
    gender: "Male",
    id: "sameer-khan",
    initials: "SK",
    joiningDate: "06 Jun 2022",
    lastSeen: "Spa room 1",
    leaveBalance: "5 days",
    monthlyRevenue: 143700,
    name: "Sameer Khan",
    notes: "High repeat client retention on therapy packages and premium relaxation services.",
    phone: "9845566778",
    role: "Spa Therapist",
    servicesCompleted: 4,
    status: "Break",
    todayAppointments: 5,
    todayRevenue: 12800,
    todayScheduleNote: "Back from break at 03:00 PM",
    weeklyRevenue: 46800,
    workingHours: "12:00 PM – 09:00 PM",
  },
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

export const getStaffMemberById = (id?: string) =>
  MOCK_STAFF_MEMBERS.find((staffMember) => staffMember.id === id);
