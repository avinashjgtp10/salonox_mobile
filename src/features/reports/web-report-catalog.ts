// Report catalogue and column labels matched to the web Reports page.
export const WEB_REPORT_CATALOG = [
  {
    "slug": "sales-summary",
    "title": "Sales Summary Report",
    "subtitle": "View every bill raised for a period — totals, payments, balances and status.",
    "group": "Sales",
    "endpoint": "/api/report/sales-summary",
    "columns": [
      {
        "key": "invoiceNumber",
        "label": "Invoice No"
      },
      {
        "key": "createdAt",
        "label": "Date"
      },
      {
        "key": "name",
        "label": "Name"
      },
      {
        "key": "clientPhone",
        "label": "Contact"
      },
      {
        "key": "itemTypes",
        "label": "Item Type"
      },
      {
        "key": "staffName",
        "label": "Staff Name"
      },
      {
        "key": "discountAmount",
        "label": "Discount"
      },
      {
        "key": "price",
        "label": "Grand Total"
      },
      {
        "key": "paid",
        "label": "Paid"
      },
      {
        "key": "membershipWalletUsed",
        "label": "Membership"
      },
      {
        "key": "packageUsed",
        "label": "Package"
      },
      {
        "key": "ewalletUsed",
        "label": "E-Wallet"
      },
      {
        "key": "rewardPointsValue",
        "label": "Rewards"
      },
      {
        "key": "referralCreditUsed",
        "label": "Referral"
      },
      {
        "key": "dueAmount",
        "label": "Due Amount"
      },
      {
        "key": "paymentMethod",
        "label": "Modes"
      },
      {
        "key": "description",
        "label": "Description"
      }
    ]
  },
  {
    "slug": "daily-sheet",
    "title": "Daily Sheet Report",
    "subtitle": "A single day's transactions — tickets, services, staff and collections.",
    "group": "Sales",
    "endpoint": "/api/report/daily-sheet",
    "columns": [
      {
        "key": "ticketNo",
        "label": "Invoice No"
      },
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "billTime",
        "label": "Bill Time"
      },
      {
        "key": "service",
        "label": "Items"
      },
      {
        "key": "staff",
        "label": "Staff"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      }
    ]
  },
  {
    "slug": "product-retail",
    "title": "Product Retail Report",
    "subtitle": "Products sold directly to clients — quantity, price and the staff/client attached to the sale.",
    "group": "Inventory",
    "endpoint": "/api/report/product-retail",
    "columns": [
      {
        "key": "invoiceNo",
        "label": "Invoice No"
      },
      {
        "key": "date",
        "label": "Date"
      },
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "productName",
        "label": "Product Name"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "brandName",
        "label": "Brand"
      },
      {
        "key": "quantity",
        "label": "Quantity"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      }
    ]
  },
  {
    "slug": "service-sale",
    "title": "Service Sale Report",
    "subtitle": "Every service sold, with count, revenue and average ticket per service.",
    "group": "Sales",
    "endpoint": "/api/report/service-sale",
    "columns": [
      {
        "key": "invoiceNo",
        "label": "Invoice No"
      },
      {
        "key": "date",
        "label": "Date"
      },
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "serviceName",
        "label": "Service Name"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      }
    ]
  },
  {
    "slug": "gst-report",
    "title": "GST Report",
    "subtitle": "Tax collected per invoice, broken down by whatever taxes are configured in Tax Mapping.",
    "group": "Sales",
    "endpoint": "/api/report/gst",
    "columns": [
      {
        "key": "invoiceNo",
        "label": "invoiceNo"
      }
    ]
  },
  {
    "slug": "non-gst-report",
    "title": "Non-GST Report",
    "subtitle": "Invoices that have no GST on them, with the amount collected on each.",
    "group": "Sales",
    "endpoint": "/api/report/gst",
    "columns": [
      {
        "key": "invoiceNo",
        "label": "invoiceNo"
      }
    ]
  },
  {
    "slug": "product-margin",
    "title": "Product Margin Report",
    "subtitle": "Profit margin per product — sale price against cost price.",
    "group": "Inventory",
    "endpoint": "/api/report/product-margin",
    "columns": [
      {
        "key": "productName",
        "label": "Product Name"
      },
      {
        "key": "quantity",
        "label": "Quantity Sold"
      },
      {
        "key": "marginPct",
        "label": "Margin (%)"
      }
    ]
  },
  {
    "slug": "reward",
    "title": "Reward Report",
    "subtitle": "Reward points available and redeemed to date, per client.",
    "group": "Sales",
    "endpoint": "/api/report/reward-points",
    "columns": [
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "mobile",
        "label": "Mobile"
      },
      {
        "key": "pointsAvailable",
        "label": "Points Available"
      },
      {
        "key": "pointsEarned",
        "label": "Points Earned"
      },
      {
        "key": "pointsRedeemed",
        "label": "Points Redeemed"
      },
      {
        "key": "lastActivityAt",
        "label": "Last Activity"
      }
    ]
  },
  {
    "slug": "ewallet",
    "title": "Ewallet Report",
    "subtitle": "Client e-wallet top-ups, deductions and running balance.",
    "group": "Sales",
    "endpoint": "/api/report/ewallet",
    "columns": [
      {
        "key": "name",
        "label": "Client"
      },
      {
        "key": "phone",
        "label": "Phone"
      },
      {
        "key": "email",
        "label": "Email"
      }
    ]
  },
  {
    "slug": "payment-collection",
    "title": "Payment Collection Report",
    "subtitle": "Outstanding balances per bill — amount billed, collected and still due, with pending totals and the oldest unpaid date.",
    "group": "Payments",
    "endpoint": "/api/report/payment-collection",
    "columns": [
      {
        "key": "invoiceNumber",
        "label": "Invoice No."
      },
      {
        "key": "paymentDate",
        "label": "Date"
      },
      {
        "key": "customerName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      },
      {
        "key": "staffName",
        "label": "Staff"
      }
    ]
  },
  {
    "slug": "pending-payment",
    "title": "Pending Payment Report",
    "subtitle": "Every bill still carrying a due balance — amount due, days pending and the client, staff and method behind it.",
    "group": "Payments",
    "endpoint": "/api/report/pending-payment",
    "columns": [
      {
        "key": "invoiceNumber",
        "label": "Invoice No."
      },
      {
        "key": "billDate",
        "label": "Bill Date"
      },
      {
        "key": "customerName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      },
      {
        "key": "daysPending",
        "label": "Days Pending"
      },
      {
        "key": "staffName",
        "label": "Staff"
      }
    ]
  },
  {
    "slug": "cash-management",
    "title": "Cash Management Report",
    "subtitle": "Cash counter sessions — opening/closing balances, cash revenue, expenses and reconciliation.",
    "group": "Payments",
    "endpoint": "/api/report/cash-management",
    "columns": [
      {
        "key": "openedAt",
        "label": "Date"
      },
      {
        "key": "openedBy",
        "label": "Opened By"
      },
      {
        "key": "closedBy",
        "label": "Closed By"
      },
      {
        "key": "openingBalance",
        "label": "Opening Balance"
      },
      {
        "key": "cashRevenue",
        "label": "Cash Revenue"
      },
      {
        "key": "cashExpense",
        "label": "Cash Expense"
      },
      {
        "key": "inStoreCash",
        "label": "In-Store Cash"
      },
      {
        "key": "closingBalance",
        "label": "Closing Balance"
      },
      {
        "key": "reconciliationAmount",
        "label": "Reconciliation"
      },
      {
        "key": "status",
        "label": "Status"
      },
      {
        "key": "remarks",
        "label": "Remarks"
      }
    ]
  },
  {
    "slug": "all-clients",
    "title": "All Clients Report",
    "subtitle": "Every client's profile details — contact, gender, birthday, address, source and status — with advanced filters. No revenue figures.",
    "group": "Customers",
    "endpoint": "/api/report/all-clients",
    "columns": [
      {
        "key": "clientCode",
        "label": "Client Code"
      },
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "email",
        "label": "Email"
      },
      {
        "key": "gender",
        "label": "Gender"
      },
      {
        "key": "birthday",
        "label": "Birthday"
      },
      {
        "key": "address",
        "label": "Address"
      },
      {
        "key": "clientSource",
        "label": "Source"
      },
      {
        "key": "status",
        "label": "Status"
      },
      {
        "key": "joinedDate",
        "label": "Joined Date"
      }
    ]
  },
  {
    "slug": "client-revenue",
    "title": "Client Revenue Report",
    "subtitle": "Total spend, visit count, average ticket per client, and marketing feedback rating.",
    "group": "Customers",
    "endpoint": "/api/report/client-revenue",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "visits",
        "label": "Total Visits"
      },
      {
        "key": "lastVisit",
        "label": "Last Visit"
      },
      {
        "key": "avgRating",
        "label": "Marketing Feedback"
      }
    ]
  },
  {
    "slug": "customer-frequency",
    "title": "Client Frequency Report",
    "subtitle": "New vs returning clients, with Most/Least Frequent, New, Old and Lost client filters.",
    "group": "Customers",
    "endpoint": "/api/report/customer-frequency",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "visits",
        "label": "Total Visits"
      },
      {
        "key": "firstVisit",
        "label": "First Visit"
      },
      {
        "key": "lastVisit",
        "label": "Last Visit"
      },
      {
        "key": "visitorType",
        "label": "Visitor Type"
      },
      {
        "key": "customerType",
        "label": "Client Type"
      }
    ]
  },
  {
    "slug": "lost-customers",
    "title": "Lost Clients Report",
    "subtitle": "Clients who stopped visiting — set your own inactivity window and filter by last-visit date range.",
    "group": "Customers",
    "endpoint": "/api/report/lost-customers",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "visits",
        "label": "Total Visits"
      },
      {
        "key": "firstVisit",
        "label": "First Visit"
      },
      {
        "key": "lastVisit",
        "label": "Last Visit"
      },
      {
        "key": "daysSinceLastVisit",
        "label": "Days Since Last Visit"
      }
    ]
  },
  {
    "slug": "vip-customers",
    "title": "VIP Clients Report",
    "subtitle": "Your top spending clients — plus regular and low spenders — against your own thresholds, with each segment's share of revenue.",
    "group": "Customers",
    "endpoint": "/api/report/customer-spend",
    "columns": [
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "spendSegment",
        "label": "Segment"
      },
      {
        "key": "visits",
        "label": "Total Visits"
      },
      {
        "key": "firstVisit",
        "label": "First Visit"
      },
      {
        "key": "lastVisit",
        "label": "Last Visit"
      },
      {
        "key": "daysSinceLastVisit",
        "label": "Days Since Last"
      }
    ]
  },
  {
    "slug": "service-frequency",
    "title": "Service Frequency Report",
    "subtitle": "How often each client returns for a given service — visits, first/last visit and the average gap between them.",
    "group": "Customers",
    "endpoint": "/api/report/service-frequency",
    "columns": [
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "serviceName",
        "label": "Service"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "visits",
        "label": "Visits"
      },
      {
        "key": "firstVisit",
        "label": "First Visit"
      },
      {
        "key": "lastVisit",
        "label": "Last Visit"
      },
      {
        "key": "daysSinceLastVisit",
        "label": "Days Since Last"
      }
    ]
  },
  {
    "slug": "referral-report",
    "title": "Referral Report",
    "subtitle": "Who referred whom — referral date, the referred client's visits and revenue, and the referrer's reward status.",
    "group": "Customers",
    "endpoint": "/api/report/referral",
    "columns": [
      {
        "key": "referrerName",
        "label": "Referrer"
      },
      {
        "key": "referredName",
        "label": "Referred Client"
      },
      {
        "key": "referralDate",
        "label": "Referral Date"
      },
      {
        "key": "firstVisit",
        "label": "First Visit"
      },
      {
        "key": "totalVisits",
        "label": "Total Visits"
      },
      {
        "key": "rewardStatus",
        "label": "Reward Status"
      },
      {
        "key": "staffName",
        "label": "Staff"
      }
    ]
  },
  {
    "slug": "client-source",
    "title": "Client Source Report",
    "subtitle": "Where your clients came from — clients per source (Walk-in, Instagram, Google, Online Booking…) with the visits and revenue each brought.",
    "group": "Customers",
    "endpoint": "/api/report/client-source",
    "columns": [
      {
        "key": "source",
        "label": "Source"
      },
      {
        "key": "clients",
        "label": "Clients"
      },
      {
        "key": "share",
        "label": "% of Clients"
      },
      {
        "key": "totalVisits",
        "label": "Visits"
      }
    ]
  },
  {
    "slug": "client-rating",
    "title": "Client Rating Report",
    "subtitle": "Post-visit WhatsApp ratings, reviews per client, and total client spend.",
    "group": "Customers",
    "endpoint": "/api/report/client-rating",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "rating",
        "label": "Overall Rating"
      },
      {
        "key": "serviceRatings",
        "label": "Services Rated"
      },
      {
        "key": "improvementTags",
        "label": "What Can We Improve"
      },
      {
        "key": "reviewText",
        "label": "Additional Comments"
      },
      {
        "key": "reviewDate",
        "label": "Date"
      }
    ]
  },
  {
    "slug": "enquiry-report",
    "title": "Enquiry Report",
    "subtitle": "Every enquiry with its follow-up status, source, assigned staff and service — filter, update status, and convert straight from the table.",
    "group": "Customers",
    "endpoint": "/api/report/enquiries",
    "columns": [
      {
        "key": "name",
        "label": "Enquiry Name"
      },
      {
        "key": "phone",
        "label": "Phone"
      },
      {
        "key": "serviceName",
        "label": "Service"
      },
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "status",
        "label": "Status"
      },
      {
        "key": "source",
        "label": "Source"
      },
      {
        "key": "followUpAt",
        "label": "Follow-up Date & Time"
      },
      {
        "key": "notes",
        "label": "Notes"
      },
      {
        "key": "createdAt",
        "label": "Created Date"
      }
    ]
  },
  {
    "slug": "staff-sales",
    "title": "Staff Sales",
    "subtitle": "Revenue generated by each staff member, split by service and product.",
    "group": "Staff",
    "endpoint": "/api/report/staff-sales",
    "columns": [
      {
        "key": "staffName",
        "label": "Staff Name"
      },
      {
        "key": "clientPhone",
        "label": "Contact"
      },
      {
        "key": "itemTypes",
        "label": "Item Type"
      },
      {
        "key": "itemDescription",
        "label": "Description"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Mode"
      },
      {
        "key": "createdAt",
        "label": "Date"
      }
    ]
  },
  {
    "slug": "staff-performance",
    "title": "Staff Performance",
    "subtitle": "One row per staff member — invoices, items sold, revenue, commission, collected and due.",
    "group": "Staff",
    "endpoint": "/api/report/staff-performance",
    "columns": [
      {
        "key": "staffName",
        "label": "Staff Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "invoiceCount",
        "label": "Invoice Count"
      },
      {
        "key": "serviceCount",
        "label": "Services Sold"
      },
      {
        "key": "productCount",
        "label": "Products Sold"
      },
      {
        "key": "packageCount",
        "label": "Packages Sold"
      },
      {
        "key": "membershipCount",
        "label": "Memberships Sold"
      }
    ]
  },
  {
    "slug": "staff-item-sales",
    "title": "Service, Product, Membership & Package Sold by Staff",
    "subtitle": "What each staff member sold, broken down by item type.",
    "group": "Staff",
    "endpoint": "/api/report/staff-item-sales",
    "columns": [
      {
        "key": "date",
        "label": "Date"
      },
      {
        "key": "staffName",
        "label": "Staff Name"
      },
      {
        "key": "quantity",
        "label": "Quantity"
      }
    ]
  },
  {
    "slug": "commission-report",
    "title": "Commission Report",
    "subtitle": "Commission earned by each staff member for a month — revenue, pending and paid payouts.",
    "group": "Staff",
    "source": "commissions",
    "columns": [
      {
        "key": "staffName",
        "label": "Staff Member"
      },
      {
        "key": "items",
        "label": "Item"
      },
      {
        "key": "revenue",
        "label": "Revenue"
      },
      {
        "key": "transactions",
        "label": "Transactions"
      },
      {
        "key": "earned",
        "label": "Earned"
      },
      {
        "key": "pending",
        "label": "Unpaid"
      },
      {
        "key": "paid",
        "label": "Paid"
      }
    ]
  },
  {
    "slug": "tip-report",
    "title": "Tip Report",
    "subtitle": "Tips earned by each staff member — transactions, pending and paid payouts.",
    "group": "Staff",
    "source": "tips",
    "columns": [
      {
        "key": "staffName",
        "label": "Staff Member"
      },
      {
        "key": "transactions",
        "label": "Transactions"
      },
      {
        "key": "earned",
        "label": "Earned"
      },
      {
        "key": "pending",
        "label": "Unpaid"
      },
      {
        "key": "paid",
        "label": "Paid"
      }
    ]
  },
  {
    "slug": "attendance-report",
    "title": "Attendance Report",
    "subtitle": "Daily attendance for every staff member — status, check-in/out and hours worked.",
    "group": "Staff",
    "source": "attendance",
    "columns": [
      {
        "key": "date",
        "label": "Date"
      },
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "status",
        "label": "Status"
      },
      {
        "key": "checkIn",
        "label": "Check In"
      },
      {
        "key": "checkOut",
        "label": "Check Out"
      },
      {
        "key": "totalBreakSeconds",
        "label": "Break Time"
      },
      {
        "key": "hoursWorked",
        "label": "Actual Working Hours"
      }
    ]
  },
  {
    "slug": "payroll-history",
    "title": "Payroll History Report",
    "subtitle": "Every payroll run per staff member — pay, deductions, net pay and payment status.",
    "group": "Staff",
    "endpoint": "/api/report/payroll-history",
    "columns": [
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "staffDesignation",
        "label": "Designation"
      },
      {
        "key": "periodStart",
        "label": "Period Start"
      },
      {
        "key": "periodEnd",
        "label": "Period End"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      },
      {
        "key": "paymentDate",
        "label": "Payment Date"
      },
      {
        "key": "paymentStatus",
        "label": "Status"
      }
    ]
  },
  {
    "slug": "rebooking-rate",
    "title": "Rebooking Rate Report",
    "subtitle": "How effectively each staff member retains clients — share of served visits where the client came back within your chosen window.",
    "group": "Staff",
    "endpoint": "/api/report/rebooking-rate",
    "columns": [
      {
        "key": "staffName",
        "label": "Staff Name"
      },
      {
        "key": "totalVisits",
        "label": "Total Visits"
      },
      {
        "key": "rebookedVisits",
        "label": "Rebooked Visits"
      },
      {
        "key": "rebookingRate",
        "label": "Rebooking Rate (%)"
      }
    ]
  },
  {
    "slug": "appointment-detail",
    "title": "Detailed Appointment Reports",
    "subtitle": "Every appointment for a period, with status, staff, service and payment detail.",
    "group": "Appointments",
    "endpoint": "/api/report/appointment-detail",
    "columns": [
      {
        "key": "bookedDate",
        "label": "Booked Date"
      },
      {
        "key": "time",
        "label": "Time"
      },
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "itemName",
        "label": "Item Name"
      },
      {
        "key": "staffName",
        "label": "Staff Name"
      },
      {
        "key": "amount",
        "label": "Amount"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      },
      {
        "key": "paymentStatus",
        "label": "Appointment Status"
      }
    ]
  },
  {
    "slug": "online-appointment",
    "title": "Online Appointment Report",
    "subtitle": "Appointments booked online for a period, with status, staff, service and payment detail.",
    "group": "Appointments",
    "endpoint": "/api/report/online-appointment",
    "columns": [
      {
        "key": "bookingNumber",
        "label": "Booking ID"
      },
      {
        "key": "bookedDate",
        "label": "Booked Date"
      },
      {
        "key": "time",
        "label": "Time"
      },
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "itemName",
        "label": "Item Name"
      },
      {
        "key": "staffName",
        "label": "Staff Name"
      },
      {
        "key": "amount",
        "label": "Amount"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      },
      {
        "key": "paymentStatus",
        "label": "Appointment Status"
      }
    ]
  },
  {
    "slug": "upcoming-appointments",
    "title": "Upcoming Appointments Report",
    "subtitle": "Future appointments still booked — date, time, client, service and staff.",
    "group": "Appointments",
    "endpoint": "/api/report/upcoming-appointments",
    "columns": [
      {
        "key": "appointmentDate",
        "label": "Appointment Date"
      },
      {
        "key": "time",
        "label": "Appointment Time"
      },
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "mobileNumber",
        "label": "Mobile Number"
      },
      {
        "key": "serviceName",
        "label": "Service Name"
      },
      {
        "key": "packageName",
        "label": "Package Name"
      },
      {
        "key": "staffName",
        "label": "Staff Name"
      },
      {
        "key": "appointmentStatus",
        "label": "Appointment Status"
      },
      {
        "key": "description",
        "label": "Description"
      }
    ]
  },
  {
    "slug": "no-show-recovery",
    "title": "No-Show Recovery Report",
    "subtitle": "Clients who booked but didn't show up — select rows and send a WhatsApp recovery template directly.",
    "group": "Appointments",
    "endpoint": "/api/report/no-show-recovery",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "serviceName",
        "label": "Service"
      },
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "scheduledDate",
        "label": "Scheduled Date"
      },
      {
        "key": "daysSince",
        "label": "Days Since"
      }
    ]
  },
  {
    "slug": "product-inventory",
    "title": "Product Inventory Report",
    "subtitle": "Current on-hand stock, reorder levels and stock value by product.",
    "group": "Inventory",
    "endpoint": "/api/report/product-inventory",
    "columns": [
      {
        "key": "productName",
        "label": "Product"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "brandName",
        "label": "Brand"
      },
      {
        "key": "sku",
        "label": "Barcode"
      },
      {
        "key": "expiryDate",
        "label": "Product Expiry"
      },
      {
        "key": "currentStock",
        "label": "Current Stock"
      },
      {
        "key": "reorderLevel",
        "label": "Low Stock Alert"
      },
      {
        "key": "salesQty",
        "label": "Sales"
      },
      {
        "key": "status",
        "label": "Status"
      }
    ]
  },
  {
    "slug": "slow-moving-products",
    "title": "Slow Moving Products Report",
    "subtitle": "Products that stay in stock the longest with the fewest or no sales, to help optimize inventory.",
    "group": "Inventory",
    "endpoint": "/api/report/slow-moving-products",
    "columns": [
      {
        "key": "productName",
        "label": "Product"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "brandName",
        "label": "Brand"
      },
      {
        "key": "sku",
        "label": "Barcode"
      },
      {
        "key": "currentStock",
        "label": "Current Stock"
      },
      {
        "key": "salesQty",
        "label": "Units Sold"
      },
      {
        "key": "lastSaleDate",
        "label": "Last Sale"
      },
      {
        "key": "daysSinceLastSale",
        "label": "Days Since Last Sale"
      }
    ]
  },
  {
    "slug": "fast-moving-products",
    "title": "Fast Moving Products Report",
    "subtitle": "Products with the highest sales volume in a selected period, to guide stock levels and purchase planning.",
    "group": "Inventory",
    "endpoint": "/api/report/fast-moving-products",
    "columns": [
      {
        "key": "productName",
        "label": "Product"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "brandName",
        "label": "Brand"
      },
      {
        "key": "sku",
        "label": "Barcode"
      },
      {
        "key": "currentStock",
        "label": "Current Stock"
      },
      {
        "key": "salesQty",
        "label": "Units Sold"
      },
      {
        "key": "lastSaleDate",
        "label": "Last Sale"
      },
      {
        "key": "daysSinceLastSale",
        "label": "Days Since Last Sale"
      }
    ]
  },
  {
    "slug": "brand-performance",
    "title": "Brand Performance Report",
    "subtitle": "Units sold, sales revenue and stock value grouped by product brand.",
    "group": "Inventory",
    "endpoint": "/api/report/brand-performance",
    "columns": [
      {
        "key": "brandName",
        "label": "Brand"
      },
      {
        "key": "productCount",
        "label": "Products"
      },
      {
        "key": "currentStock",
        "label": "Current Stock"
      },
      {
        "key": "unitsSold",
        "label": "Units Sold"
      }
    ]
  },
  {
    "slug": "purchase-vs-sales",
    "title": "Purchase vs Sales Inventory Report",
    "subtitle": "Purchase value, sales value and stock consumption per product, with net movement and turnover.",
    "group": "Inventory",
    "endpoint": "/api/report/purchase-vs-sales",
    "columns": [
      {
        "key": "productName",
        "label": "Product"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "brandName",
        "label": "Brand"
      },
      {
        "key": "currentStock",
        "label": "Current Stock"
      },
      {
        "key": "purchaseQty",
        "label": "Purchased"
      },
      {
        "key": "salesQty",
        "label": "Sold"
      },
      {
        "key": "consumptionQty",
        "label": "Consumed"
      },
      {
        "key": "netMovement",
        "label": "Net Movement"
      },
      {
        "key": "turnoverRatio",
        "label": "Turnover"
      }
    ]
  },
  {
    "slug": "consumable-usage",
    "title": "Consumable Usage Report",
    "subtitle": "Products used up by staff during services (back-bar stock), separate from client sales.",
    "group": "Inventory",
    "source": "consumables",
    "columns": [
      {
        "key": "itemName",
        "label": "Product"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "unit",
        "label": "Unit"
      },
      {
        "key": "actualConsumable",
        "label": "Consumed"
      },
      {
        "key": "adjustConsumable",
        "label": "Adjusted"
      },
      {
        "key": "consumableDifference",
        "label": "Difference"
      },
      {
        "key": "remark",
        "label": "Remark"
      }
    ]
  },
  {
    "slug": "consumable-analytics",
    "title": "Consumable Analytics Report",
    "subtitle": "Consumable product usage per client, by service and date, with total quantity used per client.",
    "group": "Inventory",
    "endpoint": "/api/report/consumable-analytics",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "productName",
        "label": "Consumable Product"
      },
      {
        "key": "qty",
        "label": "Quantity Used"
      },
      {
        "key": "serviceName",
        "label": "Service Name"
      },
      {
        "key": "usageDate",
        "label": "Usage Date"
      }
    ]
  },
  {
    "slug": "supplier-report",
    "title": "Supplier Report",
    "subtitle": "All suppliers on record, with contact details and location.",
    "group": "Inventory",
    "source": "suppliers",
    "columns": [
      {
        "key": "name",
        "label": "Supplier"
      },
      {
        "key": "contactPerson",
        "label": "Contact Person"
      },
      {
        "key": "phone",
        "label": "Phone"
      },
      {
        "key": "email",
        "label": "Email"
      },
      {
        "key": "city",
        "label": "City"
      },
      {
        "key": "country",
        "label": "Country"
      }
    ]
  },
  {
    "slug": "purchase-history",
    "title": "Supplier Purchase History",
    "subtitle": "Every purchase recorded from Product Inventory, with its Supplier Number and line items.",
    "group": "Inventory",
    "source": "purchases",
    "columns": [
      {
        "key": "purchaseNumber",
        "label": "Supplier Number"
      },
      {
        "key": "supplierName",
        "label": "Supplier"
      },
      {
        "key": "purchaseDate",
        "label": "Purchase Date"
      },
      {
        "key": "receivedByName",
        "label": "Received By"
      },
      {
        "key": "itemCount",
        "label": "Products"
      },
      {
        "key": "totalAmount",
        "label": "Total Amount"
      }
    ]
  },
  {
    "slug": "stock-movement",
    "title": "Stock Movement Report",
    "subtitle": "Every stock movement — purchases, usage, sales, adjustments and transfers — with running balance.",
    "group": "Inventory",
    "endpoint": "/api/report/stock-movement",
    "columns": [
      {
        "key": "movementDate",
        "label": "Date"
      },
      {
        "key": "productName",
        "label": "Product"
      },
      {
        "key": "categoryName",
        "label": "Category"
      },
      {
        "key": "openingStock",
        "label": "Opening Stock"
      },
      {
        "key": "stockIn",
        "label": "Added (In)"
      },
      {
        "key": "stockOut",
        "label": "Removed (Out)"
      },
      {
        "key": "closingStock",
        "label": "Closing Stock"
      }
    ]
  },
  {
    "slug": "package-sale",
    "title": "Package Sale Report",
    "subtitle": "Packages purchased by clients, with amount paid and balance due.",
    "group": "Package & Membership",
    "endpoint": "/api/report/package-sale",
    "columns": [
      {
        "key": "invoiceNo",
        "label": "Invoice No"
      },
      {
        "key": "date",
        "label": "Date"
      },
      {
        "key": "client",
        "label": "Client"
      },
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "packageName",
        "label": "Package Name"
      },
      {
        "key": "expiryDate",
        "label": "Expiry Date"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      },
      {
        "key": "status",
        "label": "Status"
      }
    ]
  },
  {
    "slug": "package-history",
    "title": "Package History Report",
    "subtitle": "Session-by-session usage history for every client package.",
    "group": "Package & Membership",
    "endpoint": "/api/report/package-history",
    "columns": [
      {
        "key": "date",
        "label": "Date"
      },
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "packageName",
        "label": "Package"
      },
      {
        "key": "serviceName",
        "label": "Service"
      },
      {
        "key": "sessionNo",
        "label": "Session No."
      },
      {
        "key": "remainingSessions",
        "label": "Remaining Sessions"
      },
      {
        "key": "staff",
        "label": "Staff"
      },
      {
        "key": "expiryDate",
        "label": "Expiry Date"
      },
      {
        "key": "status",
        "label": "Status"
      }
    ]
  },
  {
    "slug": "member-sale",
    "title": "Membership Sale Report",
    "subtitle": "Memberships purchased by clients and their current status.",
    "group": "Package & Membership",
    "endpoint": "/api/report/member-sale",
    "columns": [
      {
        "key": "invoiceNumber",
        "label": "Invoice No"
      },
      {
        "key": "purchasedAt",
        "label": "Date"
      },
      {
        "key": "expiryDate",
        "label": "Expiry Date"
      },
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "staffName",
        "label": "Staff"
      },
      {
        "key": "membershipName",
        "label": "Membership"
      },
      {
        "key": "valueAmount",
        "label": "Value"
      },
      {
        "key": "extraBenefits",
        "label": "Description"
      },
      {
        "key": "paymentMethod",
        "label": "Payment Method"
      },
      {
        "key": "status",
        "label": "Status"
      }
    ]
  },
  {
    "slug": "membership-history",
    "title": "Membership History Report",
    "subtitle": "Redemption-by-redemption usage for every client membership — service, amount used and balance left.",
    "group": "Package & Membership",
    "endpoint": "/api/report/membership-history",
    "columns": [
      {
        "key": "date",
        "label": "Date"
      },
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "membershipName",
        "label": "Membership"
      },
      {
        "key": "membershipType",
        "label": "Type"
      },
      {
        "key": "serviceName",
        "label": "Service"
      },
      {
        "key": "benefitType",
        "label": "Benefit"
      },
      {
        "key": "staff",
        "label": "Staff"
      },
      {
        "key": "startDate",
        "label": "Start Date"
      },
      {
        "key": "expiryDate",
        "label": "Expiry Date"
      },
      {
        "key": "status",
        "label": "Status"
      }
    ]
  },
  {
    "slug": "wa-marketing-campaign",
    "title": "WA Marketing Campaign Report",
    "subtitle": "WhatsApp campaign delivery, read rates and engagement.",
    "group": "Marketing",
    "endpoint": "/api/report/wa-campaign",
    "columns": [
      {
        "key": "createdAt",
        "label": "Date"
      },
      {
        "key": "name",
        "label": "Campaign"
      },
      {
        "key": "templateName",
        "label": "Template"
      },
      {
        "key": "status",
        "label": "Status"
      },
      {
        "key": "totalContacts",
        "label": "Contacts"
      },
      {
        "key": "sent",
        "label": "Sent"
      },
      {
        "key": "delivered",
        "label": "Delivered"
      },
      {
        "key": "read",
        "label": "Read"
      },
      {
        "key": "failed",
        "label": "Failed"
      },
      {
        "key": "blocked",
        "label": "Blocked"
      }
    ]
  },
  {
    "slug": "open-rate",
    "title": "Open Rate Report",
    "subtitle": "How many delivered campaign messages were actually opened — engagement per campaign, with recipient-level detail.",
    "group": "Marketing",
    "endpoint": "/api/report/open-rate",
    "columns": [
      {
        "key": "name",
        "label": "Campaign Name"
      },
      {
        "key": "createdAt",
        "label": "Date"
      },
      {
        "key": "channel",
        "label": "Channel"
      },
      {
        "key": "status",
        "label": "Status"
      },
      {
        "key": "sent",
        "label": "Sent"
      },
      {
        "key": "delivered",
        "label": "Delivered"
      },
      {
        "key": "opened",
        "label": "Opened"
      },
      {
        "key": "failed",
        "label": "Failed"
      },
      {
        "key": "openRate",
        "label": "Open Rate"
      }
    ]
  },
  {
    "slug": "reply-rate",
    "title": "Reply Rate Report",
    "subtitle": "How many recipients wrote back within 24 hours of a campaign reaching them, per campaign and per customer.",
    "group": "Marketing",
    "endpoint": "/api/report/reply-rate",
    "columns": [
      {
        "key": "name",
        "label": "Campaign Name"
      },
      {
        "key": "createdAt",
        "label": "Date"
      },
      {
        "key": "channel",
        "label": "Channel"
      },
      {
        "key": "status",
        "label": "Status"
      },
      {
        "key": "sent",
        "label": "Sent"
      },
      {
        "key": "failed",
        "label": "Failed"
      },
      {
        "key": "reached",
        "label": "Reached"
      },
      {
        "key": "replied",
        "label": "Replied"
      },
      {
        "key": "replyRate",
        "label": "Reply Rate"
      }
    ]
  },
  {
    "slug": "birthday-campaign",
    "title": "Birthday Campaign Performance Report",
    "subtitle": "Delivery, read and failure rates for automated birthday WhatsApp wishes, one row per client send.",
    "group": "Marketing",
    "endpoint": "/api/report/birthday-campaign",
    "columns": [
      {
        "key": "clientName",
        "label": "Client"
      },
      {
        "key": "phoneNumber",
        "label": "Phone"
      },
      {
        "key": "templateName",
        "label": "Template"
      },
      {
        "key": "status",
        "label": "Status"
      },
      {
        "key": "sentAt",
        "label": "Sent"
      },
      {
        "key": "deliveredAt",
        "label": "Delivered"
      },
      {
        "key": "readAt",
        "label": "Read"
      }
    ]
  },
  {
    "slug": "new-client-follow-up",
    "title": "New Client Follow-Up Report",
    "subtitle": "New clients from a chosen window who haven't had a completed visit yet — select rows and send a WhatsApp follow-up template directly.",
    "group": "Marketing",
    "endpoint": "/api/report/new-client-follow-up",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "joinedDate",
        "label": "Joined Date"
      },
      {
        "key": "daysSinceJoined",
        "label": "Days Since Joined"
      }
    ]
  },
  {
    "slug": "cancellation-recovery",
    "title": "Cancellation Recovery Report",
    "subtitle": "Clients whose most recent appointment was cancelled and never rebooked — select rows and send a WhatsApp recovery template directly.",
    "group": "Marketing",
    "endpoint": "/api/report/cancellation-recovery",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "serviceName",
        "label": "Service"
      },
      {
        "key": "invoiceNumber",
        "label": "Invoice Number"
      },
      {
        "key": "cancelledDate",
        "label": "Cancelled Date"
      },
      {
        "key": "daysSinceCancelled",
        "label": "Days Since Cancelled"
      }
    ]
  },
  {
    "slug": "membership-opportunity",
    "title": "Membership Opportunity Report",
    "subtitle": "Frequent visitors with no active membership yet — select rows and promote membership directly via WhatsApp.",
    "group": "Marketing",
    "endpoint": "/api/report/membership-opportunity",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "visitCount",
        "label": "Visits"
      },
      {
        "key": "hasMembership",
        "label": "Membership"
      },
      {
        "key": "lastVisitDate",
        "label": "Last Visit"
      }
    ]
  },
  {
    "slug": "birthday-report",
    "title": "Birthday Report",
    "subtitle": "Clients with a birthday on file, next occurrence and days until — select rows and send birthday wishes directly via WhatsApp.",
    "group": "Marketing",
    "endpoint": "/api/report/birthday",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "email",
        "label": "Email"
      },
      {
        "key": "gender",
        "label": "Gender"
      },
      {
        "key": "birthday",
        "label": "Birthday"
      },
      {
        "key": "turningAge",
        "label": "Turning Age"
      },
      {
        "key": "nextOccurrence",
        "label": "Next Occurrence"
      },
      {
        "key": "clientSource",
        "label": "Source"
      },
      {
        "key": "status",
        "label": "Status"
      }
    ]
  },
  {
    "slug": "anniversary-report",
    "title": "Anniversary Report",
    "subtitle": "Clients with an anniversary on file, next occurrence and days until — select rows and send anniversary wishes directly via WhatsApp.",
    "group": "Marketing",
    "endpoint": "/api/report/anniversary",
    "columns": [
      {
        "key": "clientName",
        "label": "Client Name"
      },
      {
        "key": "contact",
        "label": "Contact"
      },
      {
        "key": "email",
        "label": "Email"
      },
      {
        "key": "anniversary",
        "label": "Anniversary"
      },
      {
        "key": "yearsCount",
        "label": "Years"
      },
      {
        "key": "nextOccurrence",
        "label": "Next Occurrence"
      },
      {
        "key": "clientSource",
        "label": "Source"
      },
      {
        "key": "status",
        "label": "Status"
      }
    ]
  }
] as const;

export type WebReportSlug = typeof WEB_REPORT_CATALOG[number]["slug"];
