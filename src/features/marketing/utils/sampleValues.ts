// Realistic sample text per named variable — used to compute a preview-
// rendered character/segment count (not the raw "{{token}}" text length,
// which would understate what an actual message costs).
export const SAMPLE_VALUES: Record<string, string> = {
  customer_name: "Priya Sharma",
  salon_name: "Bloom Salon",
  appointment_date: "12 Sep 2026",
  appointment_time: "3:30 PM",
  old_date: "10 Sep 2026",
  old_time: "2:00 PM",
  new_date: "12 Sep 2026",
  new_time: "3:30 PM",
  service_name: "Hair Cut",
  staff_name: "Anita",
  amount: "1,250",
  package_name: "Glow Package",
  membership_name: "Gold Membership",
  expiry_date: "30 Sep 2026",
  remaining_sessions: "3",
  remaining_balance: "1,500",
  remaining_services_breakdown: "Hair Cut-2, Facial-1",
  services: "Hair Cut, Facial",
  total_sessions: "5",
  package_value: "4,999",
  invoice_number: "INV-1024",
  benefit: "10% off every visit",
  start_date: "1 Sep 2026",
  membership_price: "6,999",
  items: "Hair Cut — 500, Facial — 750, Total Paid: 1,250",
  feedback_line: "We'd love your feedback: https://feedback.salonox.com/f/abc123",
  amount_used: "500",
  points_earned: "50",
  total_points: "320",
  referred_customer_name: "Rahul Verma",
  reward: "100",
  points_used: "50",
  remaining_points: "270",
};

// Renders {{token}} → sample value (or a bracketed placeholder if unknown),
// for both the SMS character counter and any live preview.
export function renderSamplePreview(text: string): string {
  return text.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_match, name: string) => SAMPLE_VALUES[name] ?? `[${name}]`);
}
