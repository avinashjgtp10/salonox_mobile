export const APPOINTMENTS = [
  {
    id: "1",
    time: "10:30",
    ampm: "AM",
    name: "Maya Kapoor",
    service: "Color Refresh + Blowout",
    staff: [
      { initials: "AR", bg: "#FAECE7", color: "#712B13" },
      { initials: "NM", bg: "#E1F5EE", color: "#085041" },
    ],
    meta: "Chair 3 · 90 min · ₹180",
    status: "Paid" as const,
  },
  {
    id: "2",
    time: "11:15",
    ampm: "AM",
    name: "Rhea Shah",
    service: "Keratin Treatment",
    staff: [{ initials: "SL", bg: "#F1EEF8", color: "#6B52C1" }],
    meta: "Chair 1 · 120 min · ₹260",
    status: "Due" as const,
  },
  {
    id: "3",
    time: "2:00",
    ampm: "PM",
    name: "Anika Patel",
    service: "Bridal Makeup",
    staff: [{ initials: "PK", bg: "#FBF3E5", color: "#8A5A0E" }],
    meta: "Chair 2 · 180 min · ₹3,200",
    status: "VIP" as const,
  },
];

export type AppointmentStatus = "Paid" | "Due" | "VIP";

export const QUICK_SERVICES = [
  { id: "1", name: "Haircut", price: 350, iconBg: "#EEF4F1", icon: "cut" },
  { id: "2", name: "Facial", price: 600, iconBg: "#FBF3E5", icon: "sparkle" },
  { id: "3", name: "Hair Wash", price: 150, iconBg: "#EAF5EF", icon: "droplet" },
  { id: "4", name: "Blowout", price: 250, iconBg: "#F1EEF8", icon: "wind" },
  { id: "5", name: "Threading", price: 80, iconBg: "#FAECE7", icon: "scissors" },
  { id: "6", name: "Head Massage", price: 200, iconBg: "#EEF4F1", icon: "hand" },
];

export const STAFF = [
  {
    id: "1",
    initials: "AR",
    name: "Ariana",
    jobs: 5,
    pct: 88,
    status: "Busy",
    slotsLeft: 2,
    avatarBg: "#FAECE7",
    avatarColor: "#712B13",
    barColor: "#D85A30",
    pillBg: "#FAECE7",
    pillColor: "#712B13",
  },
  {
    id: "2",
    initials: "NM",
    name: "Neha",
    jobs: 3,
    pct: 64,
    status: "Open",
    slotsLeft: 4,
    avatarBg: "#E1F5EE",
    avatarColor: "#085041",
    barColor: "#4B8F68",
    pillBg: "#EAF5EF",
    pillColor: "#2E7049",
  },
];

export const INVENTORY_ALERTS = [
  {
    id: "1",
    name: "Color Toner 7A is low",
    sub: "2 bottles left · reorder by Friday",
    iconBg: "#FFF4E3",
    iconColor: "#D8A84F",
    action: "Order →",
    actionColor: "#496A5D",
    level: "warning" as const,
  },
  {
    id: "2",
    name: "Keratin Serum — out of stock",
    sub: "0 bottles · 1 booking needs it today",
    iconBg: "#FEECEC",
    iconColor: "#D65B5B",
    action: "Urgent",
    actionColor: "#D65B5B",
    level: "error" as const,
  },
];

export const TOP_CLIENT = {
  initials: "PK",
  name: "Priya Kapoor",
  points: 420,
  visits: 12,
  lastVisit: "3 days ago",
  nextRewardPts: 68,
  progressPct: 68,
  tag: "VIP",
};
