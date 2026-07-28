export interface HelpTopic {
  title: string;
  description: string;
}

// Short contextual blurbs shown on the Help & Support page when a "Learn more"
// link is clicked from a specific screen. Keyed by the `topic` passed to
// <LearnMoreLink topic="...">. Add an entry here whenever a new "Learn more"
// link is wired up so it never lands on a bare/empty page.
export const HELP_TOPICS: Record<string, HelpTopic> = {
  clients: {
    title: "Managing clients",
    description: "View, add, edit and delete your client's details from the Clients page. Each client profile tracks their booking history, contact info, and notes.",
  },
  "service-menu": {
    title: "Service menu",
    description: "Add the services your business offers, set pricing and duration, and organize them into categories clients see when booking.",
  },
  "service-addons": {
    title: "Service add-ons",
    description: "Add-ons let clients customize a booking with optional extras (e.g. a deep conditioning treatment) for an additional charge and time.",
  },
  "staff-wages": {
    title: "Staff member wages",
    description: "Set up how a staff member earns — hourly wage, salary, or a mix — so wages calculate correctly on their pay runs and timesheets.",
  },
  "staff-payruns-settings": {
    title: "Pay run settings",
    description: "Choose how a staff member is paid (bank transfer, cash, etc.) and which fees or deductions are automatically applied during a pay run.",
  },
  "staff-commissions": {
    title: "Staff member commissions",
    description: "Configure commission rates a staff member earns on services, products, memberships, and gift cards they sell, plus deductions applied to those calculations.",
  },
  "staff-list": {
    title: "Managing your staff",
    description: "Add staff members, assign roles and access levels, and manage their availability from the Staff page.",
  },
  payruns: {
    title: "Pay runs",
    description: "Calculate and settle what you owe your staff — tips, commissions, and wages — for a given pay period, then mark the run as paid.",
  },
  stocktakes: {
    title: "Stocktakes",
    description: "Count and record the quantity and value of stock your business holds, and reconcile differences against your recorded inventory.",
  },
  "add-stocktake": {
    title: "Starting a stocktake",
    description: "A full inventory count helps keep your recorded stock levels accurate. Select the products to count, then enter the counted quantities.",
  },
  suppliers: {
    title: "Suppliers",
    description: "Keep track of the suppliers you buy stock from, including contact details, so you can link them to stock orders.",
  },
  "stock-orders": {
    title: "Stock orders",
    description: "Create and track orders placed with suppliers to replenish your product stock, and receive stock against an order once it arrives.",
  },
  "reserve-with-google": {
    title: "Reserve with Google",
    description: "Reserve with Google lets clients book appointments directly from Google Search and Maps. It requires an active, verified Google Business Profile linked to your salon.",
  },
  "repeating-shifts": {
    title: "Repeating shifts",
    description: "Set a weekly, biweekly, or custom shift pattern for a staff member. Changes you save apply to all upcoming shifts for the selected period.",
  },
  "stocktakes-landing": {
    title: "Stocktakes",
    description: "Count and record the quantity and value of stock your business holds, and reconcile differences against your recorded inventory.",
  },
  "products-landing": {
    title: "Products",
    description: "Add retail products to sell at checkout, track stock on hand, and set supply/retail pricing and markup.",
  },
};
