import type { SpotlightFeature } from "../types";

export const SPOTLIGHT_SEED_DATA: SpotlightFeature[] = [
  {
    id: "spotlight-consumable-inventory",
    featureName: "Consumable Inventory",
    module: "Catalog → Inventory → Consumable Inventory",
    moduleRoute: "/dashboard/inventory/consumables",
    shortDescription:
      "Manage all consumable products used during salon services — stock, unit conversion, service assignment, and usage status.",
    whatIsThis:
      "Consumable Inventory tracks products used up during services (not sold to clients) — stock and available stock in their own units, which services each one is assigned to, monthly usage, and a Healthy/Low/Out of Stock status per product.",
    howItWorks:
      "Go to Catalog → Inventory → Consumable Inventory.\nCheck the summary cards — Total Consumable Products, Low Stock, Out of Stock, and Assigned Services.\nClick + Add to add a new consumable product, or Usage to review consumption history.\nUse Search or Filter to find a specific product, and Newest to sort the list.\nCheck Assigned Services to see how many services use a product, and Status for Healthy, Low, or Out of Stock.\nUse the ⋮ actions menu on a row to edit or adjust a product.",
    benefits:
      "See which consumables are running low or out before a service gets interrupted.\nKnow exactly how many services each consumable is assigned to.\nTrack monthly usage per product instead of guessing consumption rates.\nSee stock and available stock in the actual unit you use (ml, pcs, etc.).\nGet a business-wide view — total products, low stock, out of stock, assigned services — from the summary cards.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-purchase-history",
    featureName: "Purchase History",
    module: "Catalog → Inventory → Purchase History",
    moduleRoute: "/dashboard/inventory/purchases",
    shortDescription:
      "Every purchase recorded from Product Inventory, with its Supplier Number and line items, in one searchable list.",
    whatIsThis:
      "Purchase History is a running record of every purchase you've recorded from Product Inventory — supplier, purchase date, number of products, and total amount — so you can look back on what was bought and from whom at any time.",
    howItWorks:
      "Go to Catalog → Inventory → Purchase History.\nUse Search to find a purchase by Supplier Number or supplier name.\nCheck Purchase Date, Products, and Total Amount for each entry at a glance.\nClick a row to open the full purchase details and line items.",
    benefits:
      "Look back on any past purchase without digging through supplier paperwork.\nSee total amount and product count per purchase at a glance.\nSearch by Supplier Number or supplier name to find any purchase instantly.\nKeep a complete, chronological record of everything bought into inventory.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-product-inventory",
    featureName: "Product Inventory",
    module: "Catalog → Inventory → Product Inventory",
    moduleRoute: "/dashboard/inventory/products",
    shortDescription:
      "Track retail stock and record new deliveries — purchased, sold, consumed, and available quantities in one view.",
    whatIsThis:
      "Product Inventory tracks retail stock levels for every product — how much was purchased, sold, and consumed, what's still Available, and its Status (In Stock, Expired, Out of Stock) — separate from consumables, which have their own page.",
    howItWorks:
      "Go to Catalog → Inventory → Product Inventory.\nClick + Purchase to record a new delivery of stock.\nUse Search to find a product by name, SKU, or barcode, or Filters to narrow the list.\nCheck Purchased, Sold, Consumed, and Available columns to see stock movement per product.\nWatch the Status column for In Stock, Expired, or Out of Stock items that need attention.\nUse Options for bulk actions across products.",
    benefits:
      "See exactly how much of each product is available without manual counting.\nCatch expired or out-of-stock items immediately via the Status column.\nTrack purchased, sold, and consumed quantities together per product.\nRecord new deliveries in seconds with + Purchase.\nSearch by name, SKU, or barcode to find any product instantly.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-memberships",
    featureName: "Memberships",
    module: "Catalog → Memberships",
    moduleRoute: "/dashboard/catalog/memberships",
    shortDescription:
      "Create and manage membership plans for your clients — wallet balance, discounts, and bonuses in one place.",
    whatIsThis:
      "Memberships lets you sell prepaid or discount-based membership plans — Wallet balance (with optional bonus) or Discount Balance — that apply to Services, Products, or both, each with its own fee, expiry, and benefit.",
    howItWorks:
      "Go to Catalog → Memberships.\nCheck the summary bar — Total plans, Loaded, Plan revenue, and Avg. price — for a quick overview.\nClick + Add membership to create a new plan.\nChoose the Membership Type — Wallet (with an optional bonus amount) or Discount Balance (a % discount).\nSet what it Applies To — Services, Products, or both — the Membership Fee, and the Expiry in days.\nUse Search or Filter to find an existing plan, and the ⋮ actions menu to edit or remove one.",
    benefits:
      "Turn one-time clients into repeat clients with prepaid wallet or discount plans.\nOffer bonus value on wallet top-ups to make bigger purchases more attractive.\nControl exactly what each plan applies to — Services, Products, or both.\nSee Total plans, Plan revenue, and Avg. price at a glance from the summary bar.\nSet a clear expiry on every plan so benefits don't run indefinitely.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-suppliers",
    featureName: "Suppliers",
    module: "Catalog → Inventory → Suppliers",
    moduleRoute: "/dashboard/inventory/suppliers",
    shortDescription:
      "Add and manage supplier details — contact info, orders, and dues — all in one list.",
    whatIsThis:
      "Suppliers keeps every vendor you buy inventory from in one place, tracking their contact details alongside pending orders, total and due amounts, and overdue status so nothing slips through.",
    howItWorks:
      "Go to Catalog → Inventory → Suppliers.\nClick + Add to create a new supplier with their contact person, email, and phone.\nUse Search to find a supplier by name, contact, or email, or Filters to narrow the list.\nCheck Pending Orders, Due Amount, and Status (Overdue / Due) for each supplier at a glance.\nClick Create Payout to settle a due amount.\nClick a supplier to view their full order history and details.",
    benefits:
      "See every supplier's dues and overdue status without opening each one.\nTrack pending orders per supplier alongside their contact details.\nSettle payments directly with Create Payout instead of tracking it separately.\nSearch by name, contact, or email to find any supplier instantly.\nKeep purchasing relationships organized instead of scattered across notes or spreadsheets.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-purchase-orders",
    featureName: "Orders",
    module: "Catalog → Inventory → Orders",
    moduleRoute: "/dashboard/inventory/orders",
    shortDescription:
      "Create and manage purchase orders sent to your suppliers, with status and quantity tracked in one list.",
    whatIsThis:
      "Orders tracks every purchase order you've sent to a supplier — quantity, total price, payment terms, and whether it's Sent, Partially Received, or fully received — so you always know what stock is on the way.",
    howItWorks:
      "Go to Catalog → Inventory → Orders.\nClick + New Order to create a purchase order for a supplier, adding products and quantities.\nUse Search to find an order by order number or supplier.\nCheck Status — Sent or Partially Received — to see what's still incoming.\nUse the ⋮ actions menu on a row to view, edit, or update an order's received quantity.\nUse Rows per page and Prev/Next to page through your full order history.",
    benefits:
      "Know exactly what stock is on order and from which supplier at any time.\nCatch partially received orders before assuming stock has fully arrived.\nSearch by order number or supplier to find any purchase order in seconds.\nTrack total quantity, total price, and payment terms together per order.\nKeep a complete, paged history of every purchase order instead of loose paperwork.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-client-packages",
    featureName: "Client Packages",
    module: "Catalog → Packages → Client Packages",
    moduleRoute: "/dashboard/catalog/packages",
    shortDescription:
      "Track and manage session-based service packages — sessions used, sessions remaining, and expiry, all in one list.",
    whatIsThis:
      "Client Packages tracks every session-based package a client has purchased — how many sessions they've used, how many remain, when it expires, and whether it's Active, Completed, or Expired — so you always know where each client stands.",
    howItWorks:
      "Go to Catalog → Packages → Client Packages.\nCheck the summary cards — Total Packages, Active Packages, Expired Packages, and Sessions Remaining — for an at-a-glance overview.\nUse Search to find a package by client or package name.\nUse All Status or Newest First to filter and sort the list.\nClick + Create Package to sell a new session-based package to a client.\nUse the ⋮ actions menu on a row to view, edit, or manage a package.",
    benefits:
      "See exactly how many sessions each client has left without checking their full history.\nCatch expired or soon-to-expire packages before a client shows up expecting a session.\nTrack Active, Completed, and Expired packages separately at a glance.\nSearch by client or package name to find any package in seconds.\nGet a business-wide view of total and active packages and remaining sessions from the summary cards.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-products",
    featureName: "Products",
    module: "Catalog → Products",
    moduleRoute: "/dashboard/catalog/products",
    shortDescription:
      "Manage your entire product inventory — category, supplier, stock, and pricing — in one searchable list.",
    whatIsThis:
      "Products is your inventory catalog for everything you sell or use in-salon — retail products and consumables alike — with category, supplier, unit size, stock level, and retail price all visible together.",
    howItWorks:
      "Go to Catalog → Products.\nClick Add to create a new product, or Options for bulk actions.\nUse Search to find a product by name, SKU, or supplier.\nUse Filters or Category to narrow the list down.\nCheck Stock Left to spot low or out-of-stock items at a glance.\nUse the ⋮ actions menu on a row to edit, adjust stock, or remove a product.",
    benefits:
      "See stock levels for every product without opening each one individually.\nSpot out-of-stock items immediately with the Out of stock status badge.\nTell Retail and Consumable items apart at a glance with type tags.\nSearch by name, SKU, or supplier to find any product in seconds.\nKeep category, supplier, and pricing organized in a single view instead of scattered records.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-enquiries",
    featureName: "Enquiries",
    module: "Enquiries",
    moduleRoute: "/dashboard/enquiries",
    shortDescription:
      "Track every client enquiry from first contact to conversion, with reschedule reminders and status at a glance.",
    whatIsThis:
      "Enquiries is where every incoming lead lands — walk-ins, calls, or online interest — so you can log their details, follow up on time, and track whether they turned into a booking or a client, all from one list.",
    howItWorks:
      "Go to Enquiries from the sidebar.\nClick + Create Enquiry to log a new one with the client's name, phone number, and any notes.\nUse Search, All Time, or Status filters to find a specific enquiry quickly.\nClick Reschedule on any row to set or move a follow-up date and time.\nUpdate the Status as the enquiry progresses — New, Follow-up, or Converted.\nUse the ⋮ actions menu on a row to edit or remove an enquiry.",
    benefits:
      "Never lose track of a lead between first contact and conversion.\nSee every enquiry's status — New, Follow-up, Converted — at a glance.\nSet reschedule reminders so follow-ups happen on time instead of being forgotten.\nSearch and filter by name, phone, or status to find any enquiry fast.\nMeasure how many enquiries actually convert into bookings or clients.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-help-support",
    featureName: "Help & Support",
    module: "Help",
    moduleRoute: "/dashboard/help",
    shortDescription:
      "Submit a support request, track your tickets, and see support hours, response times, and contact details in one place.",
    whatIsThis:
      "Help & Support is where you raise a request when something's wrong or you need help, and where you can see how quickly to expect a response, review recent SalonOX updates, and find every way to reach the support team.",
    howItWorks:
      "Go to Help.\nClick Submit a Request to open a New Support Request, or My Tickets to see requests you've already raised.\nFill in the Subject, choose a Category, and set a Priority — Low, Medium, or High.\nDescribe your issue in the Message box (up to 1000 characters), including any error messages or steps you've already tried.\nClick Submit Request to send it, or Cancel to discard it.\nCheck the sidebar for Support Hours, Average Response Time by priority, Recent Updates from the SalonOX team, and Contact Us details (email, phone, WhatsApp, or Visit Help Center).",
    benefits:
      "Raise a support request in minutes with the details support needs up front.\nSet the right priority so urgent issues get seen faster.\nKnow what response time to expect before you even submit.\nTrack all your past requests under My Tickets instead of digging through email.\nReach support the way that's easiest for you — email, phone, or WhatsApp.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-reports",
    featureName: "Reports",
    module: "Reports",
    moduleRoute: "/reports",
    shortDescription:
      "View and analyze your salon's performance with favorites, recently opened reports, and every report organized by category.",
    whatIsThis:
      "Reports is the home for every report in SalonOX — star the ones you check often as Favorites, jump back into anything you recently opened, or browse All Report Categories (Sales, Payments, Clients, Staff, Appointments, Inventory, Package and Membership, Marketing) to find exactly the report you need.",
    howItWorks:
      "Go to Reports from the sidebar.\nUse the search bar to find a report by name.\nUnder Favorites, click any starred report to open it instantly, or Manage Favorites to change which ones are pinned.\nUnder Recently Opened, click a report to pick up where you left off.\nUnder All Report Categories, browse by category — Sales, Payments, Clients, Staff, Appointments, Inventory, Package and Membership, and Marketing — each showing how many reports it contains.\nClick a category to expand it and open a specific report inside.",
    benefits:
      "Get straight to the reports you check most often via Favorites.\nPick up recently viewed reports in one click instead of re-navigating.\nBrowse every report by business area instead of hunting through one long list.\nSearch by name when you know exactly what you're looking for.\nCover the whole business — sales, payments, clients, staff, appointments, inventory, packages, and marketing — from a single starting point.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-cash-dashboard",
    featureName: "Cash Dashboard",
    module: "Cash Management → Dashboard",
    moduleRoute: "/dashboard/cash-management",
    shortDescription:
      "Track opening cash, revenue, expenses, reconciliation, and daily counter closing in one place.",
    whatIsThis:
      "Cash Dashboard is your daily cash register — open a counter with an opening balance, track cash revenue and expenses as the day goes, and close the counter with a reconciled closing balance at the end of the shift.",
    howItWorks:
      "Go to Cash Management.\nClick Open Counter to start the day with an Opening Balance.\nThroughout the day, check the Summary Cards — Today's Revenue, Opening Balance, Cash Revenue, Cash Expense, Closing Balance, In Store Cash, and Reconciliation Amount.\nUse Add Expenses to log any cash expenses under Expense Summary.\nUse All Refresh to pull the latest numbers at any time.\nAt the end of the day, click Close Counter to reconcile and close out the cash register.",
    benefits:
      "Know your exact cash position at any moment during the day.\nCatch reconciliation mismatches before they become a bigger problem.\nLog cash expenses as they happen instead of reconstructing them later.\nOpen and close the counter with a clear, auditable trail every day.\nSee revenue, expenses, and balances together instead of piecing them together from separate reports.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-staff-history",
    featureName: "Staff History",
    module: "Staff → Staff History",
    moduleRoute: "/dashboard/team/history",
    shortDescription:
      "Pick any staff member to view their full profile, performance, and history in one place.",
    whatIsThis:
      "Staff History is a searchable directory of your whole team — active and inactive — where selecting a staff member opens their complete profile, performance, and history.",
    howItWorks:
      "Go to Staff → Staff history.\nUse the search bar to find a staff member by name, role, or phone.\nUse the Status filter to narrow the list to All Statuses, Active, or Inactive staff.\nBrowse the staff cards — each shows their name, role, status (Active/Inactive), and phone number.\nClick a staff card to open their full profile, performance, and history.\nUse the pagination at the bottom to move through all staff when there are more than fit on one page.",
    benefits:
      "Find any staff member instantly by name, role, or phone.\nSee active vs. inactive staff at a glance without opening each profile.\nGet a complete performance and history view for any staff member in one click.\nBrowse your whole team, even across multiple pages, without losing your place.\nUseful as a quick directory before diving into payroll, commission, or scheduling for a specific staff member.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-payroll-dashboard",
    featureName: "Payroll Dashboard",
    module: "Staff → Payroll",
    moduleRoute: "/dashboard/team/payroll",
    shortDescription:
      "Review salary, commission, attendance deductions, and payments for every staff member in one dashboard.",
    whatIsThis:
      "Payroll Dashboard pulls together each staff member's base salary, commission paid/pending, attendance-based deductions, tips, and bonuses for a payroll period, so you can review and pay everyone from a single screen.",
    howItWorks:
      "Go to Staff → Payroll.\nCheck the summary cards — Total Staff, Gross Payroll, Total Deductions, Net Payroll, Total Paid, Total Pending, and the Current Payroll Period.\nUse the Payroll Period dropdown (e.g. This month) to switch periods, and Search staff or Filter to narrow the list.\nUnder Staff Payroll Details, review each staff member's Role, Base Salary, Commission Paid/Pending, Tips, Tip Status, Bonus / Incentive, and Actions.\nClick + Add Entry to record a new payroll entry, or + Add Advance to record a salary advance for a staff member.\nUse the ⋯ menu on any staff row for further actions on their payroll record.",
    benefits:
      "See gross payroll, deductions, and net payroll for the whole team at a glance.\nReview salary, commission, tips, and bonuses together instead of across separate reports.\nTrack total paid vs. pending payroll for the current period.\nRecord salary advances and payroll entries without leaving the dashboard.\nFilter and search to quickly find any staff member's payroll status.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-attendance",
    featureName: "Attendance",
    module: "Staff → Attendance",
    moduleRoute: "/dashboard/team/attendance",
    shortDescription:
      "Track staff check-in/check-out, working hours, and attendance status for any date.",
    whatIsThis:
      "Attendance is a daily register for your whole team — see who's Present, Late, Absent, On Leave, or Half Day for any date, and check staff in or out directly from the list.",
    howItWorks:
      "Go to Staff → Attendance.\nUse the date picker (with ← / → arrows) to jump to any day, or the refresh icon to reload the list.\nCheck the summary cards — Present, Late, Absent, On Leave, and Half Day — for that date.\nUse the search bar to find a specific staff member.\nFor each staff member, review Check In, Check Out, Working Hours, Source (e.g. Manual), and Status (Not Marked, Present, Late, etc.).\nClick Check In (and later Check Out) to mark attendance directly from the row.\nClick Attendance Rules to configure how late/absent/half-day thresholds are defined.",
    benefits:
      "See your whole team's attendance for any date in one screen.\nMark check-in/check-out manually when needed, without a separate system.\nSpot late arrivals, absences, and half-days at a glance from the summary cards.\nLook up a specific staff member's attendance instantly with search.\nDefine your own attendance rules to match how your salon actually operates.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-tip-settle",
    featureName: "Tip Settle",
    module: "Staff → Tip",
    moduleRoute: "/dashboard/team/commissions",
    shortDescription:
      "Track and settle staff tip payouts, with total, paid, pending, and accrued tips in one view.",
    whatIsThis:
      "Tip Settle is the Tip counterpart to Commission Settle — it tracks how much tip money each staff member has received and lets you settle any pending payouts, with a summary bar and a per-staff breakdown.",
    howItWorks:
      "Go to Staff → Commission, then switch to the Tip tab (next to Commission).\nCheck the summary bar — Total Tips, Tips Paid, Pending Tips, and Total Accrued.\nPick a period (e.g. This month) to change the date range.\nUnder Tip Summary, review each staff member's Total Tips, Tips Paid, Pending Payout, and Status (Settled or Pending).\nClick Settle to pay out a staff member's pending tips, or View to review an already-Settled row.",
    benefits:
      "See exactly how much tip money is owed across the whole team, at a glance.\nSettle staff tip payouts directly from the summary, without manual tracking.\nSpot which staff still have pending tips instantly by Status.\nChange the reporting period to review any month's tip activity.\nKeep tip payouts transparent and auditable per staff member, alongside commission.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-commission-rules",
    featureName: "Commission Rules",
    module: "Staff → Commission Rule",
    moduleRoute: "/dashboard/team/commissions",
    shortDescription:
      "Create and manage the commission rules that decide how much staff earn on services, products, memberships, and packages.",
    whatIsThis:
      "Commission Rules is where you define how commission is calculated — which staff a rule applies to, what it's based on (Services, Products, Memberships, or Packages), how often it's paid, and the commission value — instead of setting a rate per staff member by hand.",
    howItWorks:
      "Go to Staff → Commission, then switch to the Commission Rule tab (next to Commission Settle).\nCheck the summary bar — Total Rules, Total Staff, Configured, and No Commission — to see coverage across your team.\nUse the All Rules / Services / Products / Memberships / Packages filter chips to narrow the list by source.\nClick + Add Commission Rule to create a new rule — set its Rule Name, Source, Frequency (e.g. Monthly), Scope (which staff it applies to), and Value (e.g. a percentage).\nReview each rule's Status (Active) in the table, and use the ⋮ menu on any row to edit or remove it.",
    benefits:
      "Set commission once per rule instead of configuring it staff-by-staff.\nCover services, products, memberships, and packages with their own rules.\nSpot staff with No Commission configured so nothing gets missed.\nControl payout frequency and scope precisely per rule.\nKeep every commission rule visible and editable in one place.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-commission-settle",
    featureName: "Commission Settle",
    module: "Staff → Commission",
    moduleRoute: "/dashboard/team/commissions",
    shortDescription:
      "Review and settle staff commission payouts, with revenue, accrued, paid, and pending totals in one view.",
    whatIsThis:
      "Commission Settle is where you review how much commission each staff member has earned and pay it out. It shows Total Revenue, Commission Paid, Pending Payout, and Total Accrued at a glance, then breaks it down per staff member with a Settle action.",
    howItWorks:
      "Go to Staff → Commission, under the Commission tab (Tip is a separate tab alongside it).\nSwitch to Commission Settle (Commission Rule is where the underlying commission rates are configured).\nCheck the summary bar — Total Revenue, Commission Paid, Pending Payout, and Total Accrued.\nUnder Commission Summary, pick a period (e.g. This month) to change the date range.\nFor each staff member, review Total Sales, Commission Accrued, Commission Paid, Pending Payout, and Status (Partial, Pending, or Settled).\nClick Settle to pay out a staff member's pending commission, or View to review an already-Settled row.",
    benefits:
      "See exactly how much commission is owed across the whole team, at a glance.\nSettle staff payouts directly from the summary, without manual calculations.\nTrack partial vs. pending vs. settled commission per staff member.\nChange the reporting period to review any month's commission activity.\nKeep commission payouts transparent and auditable per staff member.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-staff-schedule",
    featureName: "Staff Schedule",
    module: "Staff → Schedule",
    moduleRoute: "/dashboard/team/shifts",
    shortDescription:
      "Plan every staff member's working hours, blocked hours, and days off for the week in one grid.",
    whatIsThis:
      "Staff Schedule is a week-at-a-glance grid with one row per staff member and one column per day, colour-coded for Daily Working Hours, Blocked Hours, and Day Off, so you can plan the whole team's week without opening each person's shift individually.",
    howItWorks:
      "Go to Staff → Schedule.\nUse the ← / Today / → controls, or pick a date, to move between weeks.\nFor each staff member and day, click + to add Daily Working Hours, Blocked Hours, or a Day Off — shown with the green, red, and yellow legend at the top.\nClick the pencil icon next to an active staff member's name to edit their default schedule.\nInactive staff show an INACTIVE badge and can't be scheduled until reactivated.\nClick Copy on a staff member's row to copy their schedule to other days or staff, instead of re-entering it.\nUse the pagination at the bottom to move through all staff when you have more than fit on one page.",
    benefits:
      "See the whole team's week at a glance instead of checking each staff member individually.\nSpot gaps or double-bookings in coverage immediately.\nReuse a schedule across days or staff with Copy instead of re-entering it.\nKeep blocked hours and days off visible right alongside working hours.\nInactive staff are clearly separated so you don't accidentally schedule them.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-create-staff",
    featureName: "Create Staff",
    module: "Staff → Create Staff",
    moduleRoute: "/dashboard/team/add",
    shortDescription:
      "Add a new team member with their details, pay setup, login access, and a full permissions matrix — all in one form.",
    whatIsThis:
      "Create Staff is the form used to onboard a new team member. Beyond basic contact details, it covers pay setup (hourly rate, fixed salary, working hours), optional staff login access, and a granular Staff Permissions matrix controlling exactly what that staff member can view, create, edit, or delete across every module.",
    howItWorks:
      "Go to Staff and click Add (Create Staff).\nUnder Details, enter Name, Email, Date of Birth, Date of Joining, Contact (with country code), Address, Gender, Designation, Role, Hourly Rate, Fixed Salary, and Working Hours/Day.\nUnder Profile Image, upload a photo (PNG, GIF, or JPG, up to 2.0MB).\nToggle Staff Login on if this team member should be able to log in to SalonOX themselves.\nToggle Staff Permissions on to customize their access instead of using the role default.\nFor each module — Dashboard, Quick Sale, Calendar, Clients, Catalog, Online Booking, Marketing, Enquiries, and more — tick exactly which actions they can perform (e.g. View, Create, Edit, Delete).\nClick Save to create the staff member.",
    benefits:
      "Onboard new team members with all their pay and contact details in one place.\nGrant staff login access only when it's actually needed.\nControl access module-by-module and action-by-action, not just by a single role.\nReduce risk by limiting sensitive actions (like Delete) to only the staff who need them.\nKeep pay setup (hourly rate, salary, hours) attached to the staff profile from day one.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-client-history",
    featureName: "Client History",
    module: "Clients → Client History",
    moduleRoute: "/dashboard/clients/history",
    shortDescription:
      "A complete 360° profile for every client — visits, revenue, wallet, memberships, packages, and full history in one place.",
    whatIsThis:
      "Client History is a single-client profile view: pick any client from the list and see everything about them — visit and spend stats, e-wallet and reward balances, and tabs for their full History, Services, Memberships, Packages, Products, Payments, Notes, E-Wallet, and Referrals & Rewards.",
    howItWorks:
      "Go to Clients → Client history.\nSearch or use Filters to find a client in the customer list on the left.\nSelect a client to open their profile.\nCheck the header stats — Total Visits, Total Spend, Avg. Ticket Size, Last Visit, and Next Appointment.\nUse Book Appointment or Send WhatsApp right from the profile to act immediately.\nReview the stat cards — Total Visits, Total Revenue, Avg. Ticket Size, E-Wallet Balance, Reward Points Balance, Referral Balance, and the Service/Product/Package/Membership revenue breakdown.\nSwitch between the Overview, History, Services, Memberships, Packages, Products, Payments, Notes, E-Wallet, Referrals & Rewards, and Communication tabs to drill into any area.\nScroll down for the client's basic details — Client Name, Mobile Number, Email, Gender, and more.",
    benefits:
      "See a client's entire relationship with your salon on one screen.\nAct immediately — book an appointment or message on WhatsApp without leaving the profile.\nUnderstand a client's value at a glance (visits, spend, ticket size).\nDrill into any area — services, packages, payments, notes — without hunting through separate pages.\nSpot e-wallet, reward, and referral balances instantly for upsell or redemption conversations.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-referral-rewards",
    featureName: "Referral & Reward Points",
    module: "Clients → Referral & Rewards",
    moduleRoute: "/dashboard/clients/loyalty",
    shortDescription:
      "See every client's wallet balance, referral code, and reward activity in one live table.",
    whatIsThis:
      "Referral & Reward Points is a live view of your clients' referral codes, referral status, wallet/reward balances, and reward points — pulled straight from client and eWallet records, so you always see current numbers, not a stale report.",
    howItWorks:
      "Go to Clients → Referral & rewards.\nCheck the summary cards at the top — Total Clients, Wallet Balance (this page), Referral Code Holders, and Completed Referrals.\nUse the search bar to find a client by name, phone, or email.\nScan the table for each client's Contact, Wallet Balance, Referral Code, Referral Status, Reward Points, Status, and the date they Joined.\nShare a client's Referral Code with them so they can refer friends and family.\nWhen a referral completes, the referring client's wallet and reward points update automatically.",
    benefits:
      "See real-time wallet balances and referral activity without running a report.\nTrack which clients are actively referring others.\nSpot high-value clients by reward points and wallet balance at a glance.\nSearch and find any client's referral status in seconds.\nEncourage word-of-mouth growth by tracking referral codes centrally.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-add-client",
    featureName: "Add Client",
    module: "Clients → Add Client",
    moduleRoute: "/dashboard/clients/add",
    shortDescription:
      "Capture a complete client profile — contact details, WhatsApp opt-in, personal dates, business details, and a profile photo — in one form.",
    whatIsThis:
      "Add Client is the form used to create a new client record. Beyond the basics, it captures WhatsApp reachability, important personal dates for reminders, business/identification details for invoicing, and a profile photo, all in one place.",
    howItWorks:
      "Go to Clients → Clients list and click Add.\nUnder Details, enter First name and Last name, Email (optional), and Phone with country code — required fields are marked with *.\nToggle Available on WhatsApp on if this number can receive WhatsApp messages from your salon.\nSelect Gender and, if relevant, a Client source (e.g. Walk-in, Referral, Online).\nUnder Personal Dates, add the client's Birthday and Anniversary so you can send timely greetings or offers.\nUnder Business / Identification Details, add a GST Number and State if you need them for invoicing.\nUnder Profile Photo, upload a picture (PNG, GIF, or JPG, up to 2.0MB).\nClick Save to create the client, or Close to discard.",
    benefits:
      "Keep every client's contact and business details in one organized profile.\nKnow at a glance who can be reached on WhatsApp.\nAutomatically have birthdays and anniversaries on file for marketing and greetings.\nCapture GST/business details up front for accurate invoicing later.\nAdd a profile photo so staff can recognize clients at a glance.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-service-menu",
    featureName: "Service Menu",
    module: "Catalog → Service Menu",
    moduleRoute: "/dashboard/catalog/services",
    shortDescription:
      "Manage every service your salon offers — pricing, category, duration, assigned staff, and commission — in one searchable table.",
    whatIsThis:
      "Service Menu is where you build and maintain your salon's full price list. Each row is a service with its category, duration, which staff can perform it, commission rate, and price, and you can search, filter, and sort the list to find what you need fast.",
    howItWorks:
      "Go to Catalog → Service menu.\nUse the search bar to find a service by name.\nUse Filters to narrow the list, Sort to reorder it, or Category to jump to a specific group of services.\nClick Add to open the Add Service form.\nUnder Basic Details, enter the Service Name, Category (or + Add a category if it doesn't exist yet), an optional Description, Price, and Duration.\nOptionally set a Service Reminder (days) to prompt clients to rebook after a set number of days.\nToggle Availability — Available for online booking and Active (appears when booking appointments).\nUnder Staff, choose which team members can perform this service.\nUnder Commission, set the commission rate staff earn for this service.\nUnder Consumables, link the products used up each time the service is performed, for stock tracking.\nUnder Consultation Forms, attach any forms clients should fill out before this service.\nClick Save to add it to your Service menu, or click the ⋮ menu on any existing row to edit or remove it.\nSelect the checkboxes to act on multiple services at once.",
    benefits:
      "Keep your entire price list organized and easy to search.\nControl exactly which staff can perform each service.\nSet per-service commission rates for accurate payroll.\nTrack consumable usage automatically per service.\nAttach consultation forms so client intake happens before the appointment.\nQuickly filter, sort, or group services by category.\nEdit pricing and durations without digging through menus.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-calendar",
    featureName: "Calendar & Appointment Scheduling",
    module: "Calendar",
    moduleRoute: "/dashboard/calendar",
    shortDescription:
      "A staff-by-staff daily schedule where you can book, block time, and manage appointments at a glance.",
    whatIsThis:
      "The Calendar shows every staff member as a column with their appointments laid out by time, so you can see who's free and who's booked at any moment, and add or manage appointments straight from the grid.",
    howItWorks:
      "Open Calendar from the sidebar.\nSwitch between Day, Week, or Month view, and jump dates with the arrows or the Today button.\nUse All Staff to filter the columns down to specific team members.\nSearch for a client to find or start booking for them.\nChoose a 15m, 30m, or 60m time-slot interval to match how tightly you schedule.\nClick any empty time slot under a staff member's column to book a new appointment there, or click Add + to start a booking from scratch.\nUse Block Time to reserve a staff member's slot for breaks, training, or anything else that isn't a client appointment.\nA red line marks the current time so you always know where \"now\" is on the schedule.",
    benefits:
      "See every staff member's schedule side by side in one view.\nBook appointments in seconds by clicking directly on an open slot.\nAvoid double-booking by blocking out non-appointment time.\nSwitch time granularity to match a busy or relaxed schedule.\nQuickly filter to one staff member or view the whole team at once.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-quick-sale",
    featureName: "Quick Sale",
    module: "Quick Sale",
    moduleRoute: "/dashboard/sales/quick",
    shortDescription:
      "Bill a walk-in or existing client in seconds — services, products, packages, and memberships on one screen.",
    whatIsThis:
      "Quick Sale is a fast, single-screen checkout for billing a client without going through the full appointment flow. Add a client (or bill as Walk-in), add whatever they're paying for, apply charges or discounts, and check out.",
    howItWorks:
      "Open Quick Sale.\nSearch for the client by name or mobile number, click + Add Client to create a new one, or bill as Walk-in. Set the sale date if it's not today.\nUnder Services & Items, search and add what the client is paying for — use + Service, + Product, + Package, or + Membership.\nFor each line, assign Staff, Time, Price, Qty, and Disc % — the Total updates automatically.\nUnder Charges & Discounts, add any Extra Charges or a Bill Discount (Percentage or Flat), and choose what it Applies To (Service, Total, etc.).\nUnder Staff Alert & Notes, add a Staff Alert (e.g. an allergy warning) or Notes for the appointment.\nCheck the Sale Summary panel — Subtotal, Total Bill, Extra Charges, Grand Total, and Amount to Pay.\nIf the client has an active package covering the service, SalonOX shows Package Payment — Fully covered, no payment required.\nClick Checkout to complete the sale.",
    benefits:
      "Bill walk-ins and regulars in seconds, without booking an appointment first.\nMix services, products, packages, and memberships in a single sale.\nAuto-detects active client packages and applies covered payments automatically.\nFlexible discounts and charges, applied per service or to the whole bill.\nStaff alerts and notes travel with the sale for the team to see.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-home-dashboard",
    featureName: "Home Dashboard Overview",
    module: "Dashboard → Home",
    moduleRoute: "/dashboard",
    shortDescription:
      "Your salon's day at a glance — revenue, appointments, staff performance, and activity, all on one screen.",
    whatIsThis:
      "The Home dashboard is the first screen you see after logging in. It summarizes today's business performance and gives you quick actions and live status updates without navigating to separate reports.",
    howItWorks:
      "Log in — you land on Home automatically.\nCheck the top stat cards: Total Revenue, Appointments, Today's Revenue, and New Clients Today (toggle between All Time/This Month/Today where available).\nUse the Revenue Overview chart to see daily revenue trends — switch between Today, Weekly, Monthly, and Yearly views.\nCheck Today's Summary to see the appointment status breakdown (Completed, Upcoming, Partial, Cancelled, No Show).\nScroll to Today's Appointments for a live list with status counts.\nCheck Due Amount to see outstanding client balances, and click Collect Now to jump straight into collection.\nSee Today's Birthdays to greet clients on their special day.\nReview Staff Revenue (donut chart) and Top Staff to track performance this month.\nCheck Recent Activity for a live feed of new clients, bookings, and payments.\nUse the quick-action buttons (New Appointment, Add Client, Quick Sale, Campaign, Refresh) to jump straight into common tasks.",
    benefits:
      "See your salon's performance at a glance without digging into reports.\nSpot today's pending collections and follow up faster.\nTrack staff performance and top earners in real time.\nJump into common actions (new appointment, quick sale, campaign) in one click.\nStay on top of client birthdays and recent activity as they happen.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "spotlight-inclusive-exclusive-tax",
    featureName: "Inclusive & Exclusive Tax",
    module: "Catalog → Services",
    moduleRoute: "/dashboard/catalog/services",
    shortDescription:
      "SalonOX now allows you to configure whether the service price includes tax or whether tax should be added separately.",
    whatIsThis:
      "You can choose between Inclusive Tax and Exclusive Tax while creating or editing a service.",
    howItWorks:
      "Go to Catalog → Services.\nCreate a new service or edit an existing service.\nSelect the required Tax Type: Inclusive Tax or Exclusive Tax.\nEnter the service price.\nSalonOX automatically calculates the applicable tax during billing.\nThe correct tax amount is reflected in the bill and relevant reports.",
    benefits:
      "Easily manage different tax pricing models.\nReduce manual tax calculations.\nImprove billing accuracy.\nMaintain consistent tax information in reports.",
    releaseDate: new Date().toISOString().slice(0, 10),
    targetAudience: ["all"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
