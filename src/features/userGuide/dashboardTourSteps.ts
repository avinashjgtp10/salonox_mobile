export const dashboardTourSteps = [
  { target: "menu", title: "Your salon shortcuts", description: "Tap this menu for more salon tools and quick actions." },
  { target: "notifications", title: "Stay up to date", description: "Tap the bell to read notifications. The badge shows how many are unread." },
  { target: "This Month Revenue", title: "Monthly revenue", description: "See revenue for this calendar month. Tap this card to open the breakdown." },
  { target: "Today's Revenue", title: "Today's revenue", description: "Check today's earnings and tap to see the details." },
  { target: "Total Clients", title: "Your clients", description: "See your client count. Tap this card to find clients and open their profiles." },
  { target: "Bookings", title: "Your bookings", description: "Tap this card to browse bookings and review appointment details." },
  { target: "This Month vs Last Month", title: "Compare your revenue", description: "Compare this month's revenue with last month and see the change." },
  { target: "Appointment", title: "Book an appointment", description: "Use this shortcut to start a new appointment for a client." },
  { target: "Client", title: "Add a client", description: "Use this button to create a client profile." },
  { target: "Reports", title: "Check your reports", description: "Open reports to review your salon's business performance." },
  { target: "Attendance", title: "Manage attendance", description: "Check staff in or out and review today's attendance. You can replay this tour anytime." },
] as const;

export type TourRect = { x: number; y: number; width: number; height: number };

// Keep the cutout inside the overlay, including partially clipped native views.
export function clipTourRect(rect: TourRect, width: number, height: number): TourRect | null {
  const x = Math.max(0, rect.x - 5);
  const y = Math.max(0, rect.y - 5);
  const right = Math.min(width, rect.x + rect.width + 5);
  const bottom = Math.min(height, rect.y + rect.height + 5);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}
