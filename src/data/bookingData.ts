export const BOOKING_FILTERS = [
  "All",
  "Confirmed",
  "Waiting",
  "Completed",
  "Cancelled",
] as const;

export type BookingFilter = (typeof BOOKING_FILTERS)[number];
export type AppointmentStatus =
  | "Confirmed"
  | "Waiting"
  | "Checked In"
  | "In Service"
  | "Completed"
  | "Cancelled";
export type BookingStatus = AppointmentStatus;
export type PaymentStatus = "Paid" | "Partially Paid" | "Pending" | "Refund Pending";

export type BookingSlot = {
  key: string;
  label: string;
};

export type BookingRecord = {
  amount: number;
  clientName: string;
  dayOffset: number;
  id: string;
  phone: string;
  service: string;
  slotKey: BookingSlot["key"];
  staffName: string;
  status: BookingStatus;
};

export type AppointmentService = {
  duration: string;
  name: string;
  price: number;
};

export type AppointmentDetail = {
  appointmentId: string;
  assignedStaff: string;
  avatar: string;
  clientId: string;
  clientName: string;
  dateLabel: string;
  duration: string;
  id: string;
  membership?: string;
  notes?: string;
  paymentStatus: PaymentStatus;
  phone: string;
  services: AppointmentService[];
  status: AppointmentStatus;
  tax: number;
  discount: number;
  subtotal: number;
  timeLabel: string;
  total: number;
};

export const BOOKING_SLOTS: BookingSlot[] = [
  { key: "09:00", label: "9:00 AM" },
  { key: "10:30", label: "10:30 AM" },
  { key: "12:00", label: "12:00 PM" },
  { key: "1:30", label: "1:30 PM" },
  { key: "3:00", label: "3:00 PM" },
  { key: "4:30", label: "4:30 PM" },
  { key: "6:00", label: "6:00 PM" },
];

export const MOCK_BOOKINGS: BookingRecord[] = [
  {
    id: "apt-101",
    dayOffset: 0,
    slotKey: "09:00",
    clientName: "Maya Kapoor",
    phone: "9876543210",
    service: "Color Refresh + Blowout",
    staffName: "Ariana",
    status: "Confirmed",
    amount: 1800,
  },
  {
    id: "apt-102",
    dayOffset: 0,
    slotKey: "12:00",
    clientName: "Rhea Shah",
    phone: "9811155522",
    service: "Keratin Treatment",
    staffName: "Neha",
    status: "Waiting",
    amount: 2600,
  },
  {
    id: "apt-103",
    dayOffset: 0,
    slotKey: "4:30",
    clientName: "Anika Patel",
    phone: "9898981212",
    service: "Bridal Makeup",
    staffName: "Pooja",
    status: "Completed",
    amount: 3200,
  },
  {
    id: "apt-104",
    dayOffset: 0,
    slotKey: "6:00",
    clientName: "Sara Mehta",
    phone: "9822001144",
    service: "Express Facial",
    staffName: "Ariana",
    status: "Cancelled",
    amount: 900,
  },
  {
    id: "apt-201",
    dayOffset: 1,
    slotKey: "10:30",
    clientName: "Ishita Rao",
    phone: "9911223344",
    service: "Hair Spa",
    staffName: "Neha",
    status: "Confirmed",
    amount: 1400,
  },
  {
    id: "apt-202",
    dayOffset: 1,
    slotKey: "3:00",
    clientName: "Priya Kapoor",
    phone: "9888877776",
    service: "Signature Blow Dry",
    staffName: "Ariana",
    status: "Waiting",
    amount: 1100,
  },
  {
    id: "apt-301",
    dayOffset: -1,
    slotKey: "1:30",
    clientName: "Naina Joshi",
    phone: "9777009988",
    service: "Gloss + Trim",
    staffName: "Pooja",
    status: "Completed",
    amount: 1650,
  },
];

export const MOCK_APPOINTMENT_DETAILS: AppointmentDetail[] = [
  {
    id: "apt-101",
    appointmentId: "SOX-240101",
    clientId: "client-maya-kapoor",
    clientName: "Maya Kapoor",
    avatar: "https://i.pravatar.cc/160?img=32",
    phone: "9876543210",
    membership: "Gold Member",
    dateLabel: "Today, 28 Jun 2026",
    timeLabel: "9:00 AM",
    duration: "1 hr 30 min",
    assignedStaff: "Ariana Dsouza",
    status: "Confirmed",
    services: [
      { name: "Color Refresh", duration: "60 min", price: 1400 },
      { name: "Signature Blowout", duration: "30 min", price: 400 },
    ],
    subtotal: 1800,
    discount: 150,
    tax: 297,
    total: 1947,
    paymentStatus: "Partially Paid",
    notes: "Prefers a low-ammonia formula and a quiet chair near the mirror wall.",
  },
  {
    id: "apt-102",
    appointmentId: "SOX-240102",
    clientId: "client-rhea-shah",
    clientName: "Rhea Shah",
    avatar: "https://i.pravatar.cc/160?img=5",
    phone: "9811155522",
    membership: "Silver Member",
    dateLabel: "Today, 28 Jun 2026",
    timeLabel: "12:00 PM",
    duration: "2 hr",
    assignedStaff: "Neha Malhotra",
    status: "Waiting",
    services: [{ name: "Keratin Treatment", duration: "120 min", price: 2600 }],
    subtotal: 2600,
    discount: 0,
    tax: 468,
    total: 3068,
    paymentStatus: "Pending",
    notes: "First-time keratin client. Confirm final product recommendation before service.",
  },
  {
    id: "apt-103",
    appointmentId: "SOX-240103",
    clientId: "client-anika-patel",
    clientName: "Anika Patel",
    avatar: "https://i.pravatar.cc/160?img=44",
    phone: "9898981212",
    membership: "Platinum Bridal",
    dateLabel: "Today, 28 Jun 2026",
    timeLabel: "4:30 PM",
    duration: "3 hr",
    assignedStaff: "Pooja Khanna",
    status: "Completed",
    services: [
      { name: "Bridal Makeup", duration: "150 min", price: 2600 },
      { name: "Lash Styling", duration: "30 min", price: 600 },
    ],
    subtotal: 3200,
    discount: 200,
    tax: 540,
    total: 3540,
    paymentStatus: "Paid",
    notes: "Client approved final look. Send invoice to WhatsApp after checkout.",
  },
  {
    id: "apt-104",
    appointmentId: "SOX-240104",
    clientId: "client-sara-mehta",
    clientName: "Sara Mehta",
    avatar: "https://i.pravatar.cc/160?img=20",
    phone: "9822001144",
    dateLabel: "Today, 28 Jun 2026",
    timeLabel: "6:00 PM",
    duration: "45 min",
    assignedStaff: "Ariana Dsouza",
    status: "Cancelled",
    services: [{ name: "Express Facial", duration: "45 min", price: 900 }],
    subtotal: 900,
    discount: 0,
    tax: 162,
    total: 1062,
    paymentStatus: "Refund Pending",
    notes: "",
  },
  {
    id: "apt-201",
    appointmentId: "SOX-240201",
    clientId: "client-ishita-rao",
    clientName: "Ishita Rao",
    avatar: "https://i.pravatar.cc/160?img=12",
    phone: "9911223344",
    membership: "Gold Member",
    dateLabel: "Tomorrow, 29 Jun 2026",
    timeLabel: "10:30 AM",
    duration: "1 hr 15 min",
    assignedStaff: "Neha Malhotra",
    status: "Checked In",
    services: [
      { name: "Hair Spa", duration: "45 min", price: 900 },
      { name: "Head Massage", duration: "30 min", price: 500 },
    ],
    subtotal: 1400,
    discount: 100,
    tax: 234,
    total: 1534,
    paymentStatus: "Pending",
    notes: "Walked in early on the last visit. Offer tea if she arrives before the slot.",
  },
  {
    id: "apt-202",
    appointmentId: "SOX-240202",
    clientId: "client-priya-kapoor",
    clientName: "Priya Kapoor",
    avatar: "https://i.pravatar.cc/160?img=47",
    phone: "9888877776",
    membership: "VIP Circle",
    dateLabel: "Tomorrow, 29 Jun 2026",
    timeLabel: "3:00 PM",
    duration: "1 hr",
    assignedStaff: "Ariana Dsouza",
    status: "In Service",
    services: [
      { name: "Signature Blow Dry", duration: "35 min", price: 700 },
      { name: "Gloss Finish", duration: "25 min", price: 400 },
    ],
    subtotal: 1100,
    discount: 0,
    tax: 198,
    total: 1298,
    paymentStatus: "Pending",
    notes: "No notes added.",
  },
  {
    id: "apt-301",
    appointmentId: "SOX-240301",
    clientId: "client-naina-joshi",
    clientName: "Naina Joshi",
    avatar: "https://i.pravatar.cc/160?img=15",
    phone: "9777009988",
    dateLabel: "Yesterday, 27 Jun 2026",
    timeLabel: "1:30 PM",
    duration: "1 hr 10 min",
    assignedStaff: "Pooja Khanna",
    status: "Completed",
    services: [
      { name: "Gloss", duration: "40 min", price: 1100 },
      { name: "Trim", duration: "30 min", price: 550 },
    ],
    subtotal: 1650,
    discount: 50,
    tax: 288,
    total: 1888,
    paymentStatus: "Paid",
    notes: "",
  },
];
