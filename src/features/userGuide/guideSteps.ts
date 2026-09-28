export type GuideStep = {
  title: string;
  description: string;
  location: string;
  icon: string;
  tab: string;
};

export const getGuideTabs = (staff: boolean) => staff
  ? ["Home", "Appointments", "Calendar", "Settings"]
  : ["Home", "Calendar", "Staff", "Settings"];

export const getGuideSteps = (staff: boolean): GuideStep[] => [
  {
    title: "Welcome to Salonox",
    description: "Let’s take a quick look around. This guide shows where to find the essentials. You can skip it and open it again from Settings.",
    location: "Your app at a glance",
    icon: "hand-wave-outline",
    tab: "Home",
  },
  {
    title: "Start your day here",
    description: staff
      ? "Home brings together your daily work and attendance. Start here to see what needs your attention."
      : "Home gives you a snapshot of your salon, today’s appointments and business activity. Use the bell at the top to check notifications.",
    location: "Bottom navigation → Home",
    icon: "home-outline",
    tab: "Home",
  },
  ...(staff ? [{
    title: "Find your appointments",
    description: "Open Appointments to review your bookings and view their details. Available actions depend on your assigned permissions.",
    location: "Bottom navigation → Appointments",
    icon: "clipboard-text-outline",
    tab: "Appointments",
  }] : []),
  {
    title: "See your schedule",
    description: "Calendar shows bookings by date and time. Select a booking to view its details and plan your day.",
    location: "Bottom navigation → Calendar",
    icon: "calendar-month-outline",
    tab: "Calendar",
  },
  ...(!staff ? [{
    title: "Know your team",
    description: "Open Staff to find team members and their details. Manage your team using the options available to your role.",
    location: "Bottom navigation → Staff",
    icon: "account-group-outline",
    tab: "Staff",
  }, {
    title: "Clients, sales and more",
    description: "Settings is also your menu for Clients, Services, Memberships and Sales Summary. Open a client’s details and choose Quick Sale to start a sale for them.",
    location: "Bottom navigation → Settings",
    icon: "storefront-outline",
    tab: "Settings",
  }] : []),
  {
    title: "You’re ready to go",
    description: "Find your account options in Settings. Whenever you need a refresher, tap User guide there to replay this tour.",
    location: "Settings → User guide",
    icon: "compass-outline",
    tab: "Settings",
  },
];
