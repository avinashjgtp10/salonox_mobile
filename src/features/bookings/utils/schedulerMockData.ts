import type { Staff, Client, Booking, BlockedTime } from "../types/scheduler-types";

export const STAFF_LIST: Staff[] = [
  { id: "1", name: "MICHEL", initials: "MI", color: "#4f46e5" },
  { id: "2", name: "STEVE", initials: "ST", color: "#0891b2" },
  { id: "3", name: "PRITI", initials: "PR", color: "#be185d" },
  { id: "4", name: "SWAPNALI", initials: "SW", color: "#059669" },
  { id: "5", name: "NIKITA J.", initials: "NJ", color: "#d97706" },
  { id: "6", name: "NIKITA K.", initials: "NK", color: "#7c3aed" },
];

export const CLIENT_LIST: Client[] = [
  { id: "1", name: "Mayuri Jadhav", phone: "9834300856", eWallet: 0 },
  { id: "2", name: "Shivani Dhumal", phone: "9812345678", eWallet: 150 },
  { id: "3", name: "Priya Sharma", phone: "9876543210", eWallet: 0 },
  { id: "4", name: "Anjali Patil", phone: "9823456789", eWallet: 200 },
];

export const SERVICES_LIST: string[] = [
  "Choco Revival Facial", "Argan Oil Wax - Full", "Hair Cut",
  "Blow Dry", "Head Massage", "Pedicure", "Manicure",
  "Threading", "Waxing - Arms", "Deep Conditioning",
  "Keratin Treatment", "Hair Color", "Highlights",
  "Nail Art", "Body Polishing",
];

export const PACKAGES_LIST = [
  { id: "p1", name: "Bridal Package", price: 8000, services: ["Hair Color", "Highlights", "Blow Dry", "Manicure"] },
  { id: "p2", name: "Glow Package", price: 3500, services: ["Choco Revival Facial", "Body Polishing"] },
  { id: "p3", name: "Nail Package", price: 1200, services: ["Manicure", "Pedicure", "Nail Art"] },
  { id: "p4", name: "Hair Package", price: 2500, services: ["Hair Cut", "Blow Dry", "Deep Conditioning"] },
];

export const REWARD_POINTS_OPTIONS: string[] = [
  "None", "Silver (50pts)", "Gold (100pts)", "Platinum (200pts)",
];

export const COUPON_CODES: Record<string, number> = {
  SAVE10: 10,
  FLAT50: 50,
  NEW20: 20,
};

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "b1", clientId: "1", clientName: "Mayuri Jadhav", clientPhone: "9834300856",
    staffId: "6", date: new Date().toISOString().slice(0, 10),
    billDate: new Date().toISOString().slice(0, 10),
    startTime: "09:00", endTime: "09:30",
    services: [{ id: "s1", service: "Choco Revival Facial", staff: "NIKITA K.", staffId: "6", time: "09:00", price: 1400, qty: 1, total: 1400 }],
    status: "Confirmed", paymentStatus: "Unpaid", paymentMode: "Cash",
    subtotal: 1400, taxableAmount: 1400, grandTotal: 1400, payingNow: 0, dueAmount: 1400,
  },
  {
    id: "b2", clientId: "2", clientName: "Shivani Dhumal", clientPhone: "9812345678",
    staffId: "3", date: new Date().toISOString().slice(0, 10),
    billDate: new Date().toISOString().slice(0, 10),
    startTime: "10:00", endTime: "11:00",
    services: [{ id: "s2", service: "Hair Color", staff: "PRITI", staffId: "3", time: "10:00", price: 2500, qty: 1, total: 2500 }],
    status: "Confirmed", paymentStatus: "Paid", paymentMode: "UPI",
    subtotal: 2500, taxableAmount: 2500, grandTotal: 2500, payingNow: 2500, dueAmount: 0,
  },
  {
    id: "b3", clientId: "3", clientName: "Priya Sharma", clientPhone: "9876543210",
    staffId: "1", date: "2026-03-17", billDate: "2026-03-17",
    startTime: "11:00", endTime: "12:00",
    services: [{ id: "s3", service: "Pedicure", staff: "MICHEL", staffId: "1", time: "11:00", price: 800, qty: 1, total: 800 }],
    status: "Completed", paymentStatus: "Paid", paymentMode: "Cash",
    subtotal: 800, taxableAmount: 800, grandTotal: 800, payingNow: 800, dueAmount: 0,
  },
  {
    id: "b4", clientId: "4", clientName: "Anjali Patil", clientPhone: "9823456789",
    staffId: "2", date: "2026-03-17", billDate: "2026-03-17",
    startTime: "12:30", endTime: "13:15",
    services: [{ id: "s4", service: "Hair Cut", staff: "STEVE", staffId: "2", time: "12:30", price: 600, qty: 1, total: 600 }],
    status: "Booked", paymentStatus: "Unpaid", paymentMode: "UPI",
    subtotal: 600, taxableAmount: 600, grandTotal: 600, payingNow: 0, dueAmount: 600,
  },
  {
    id: "b5", clientId: "1", clientName: "Mayuri Jadhav", clientPhone: "9834300856",
    staffId: "4", date: "2026-03-16", billDate: "2026-03-16",
    startTime: "14:00", endTime: "15:00",
    services: [{ id: "s5", service: "Manicure", staff: "SWAPNALI", staffId: "4", time: "14:00", price: 700, qty: 1, total: 700 }],
    status: "Confirmed", paymentStatus: "Paid", paymentMode: "Card",
    subtotal: 700, taxableAmount: 700, grandTotal: 700, payingNow: 700, dueAmount: 0,
  },
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: `b${i + 6}`,
    clientId: String((i % 4) + 1),
    clientName: i % 2 === 0 ? "Jane Doe" : "John Smith",
    clientPhone: "9000000000",
    staffId: String((i % 6) + 1),
    date: `2026-03-${String(10 + i).padStart(2, '0')}`,
    billDate: `2026-03-${String(10 + i).padStart(2, '0')}`,
    startTime: "10:00",
    endTime: "11:00",
    services: [{ id: `s${i + 6}`, service: "Facial", staff: "STAFF", staffId: String((i % 6) + 1), time: "10:00", price: 1000, qty: 1, total: 1000 }],
    status: i % 3 === 0 ? "Completed" : "Confirmed",
    paymentStatus: "Paid",
    paymentMode: "Cash",
    subtotal: 1000,
    taxableAmount: 1000,
    grandTotal: 1000,
    payingNow: 1000,
    dueAmount: 0,
  }))
];

export const CLIENT_STATS = [
  {
    clientId: "1",
    address: "Pune, MH",
    rewardPoints: "Silver (50pts)",
    ewalletAmt: 0,
    unpaidAmt: 0,
    assignDiscount: 0,
    discountValidity: "N/A",
    membership: "NA",
    noShow: 0,
    cancelled: 0,
    totalVisit: 5,
    lastVisit: "2023-10-10",
    totalRevenue: 5000,
    notes: "",
    staffAlert: ""
  },
  {
    clientId: "2",
    address: "Mumbai, MH",
    rewardPoints: "Gold (100pts)",
    ewalletAmt: 150,
    unpaidAmt: 0,
    assignDiscount: 10,
    discountValidity: "2024-12-31",
    membership: "Gold",
    noShow: 1,
    cancelled: 0,
    totalVisit: 12,
    lastVisit: "2024-02-15",
    totalRevenue: 15000,
    notes: "Prefers evening appointments",
    staffAlert: "Allergic to certain hair dyes"
  }
];

export const INITIAL_BLOCKED: BlockedTime[] = [];
