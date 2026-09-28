import type { ScreenTour } from "./DashboardTour";
import { VISIBLE_REPORT_GROUPS } from "@/features/reports/report-config";

export const screenTours = {
  "clients": {
    "title": "Clients",
    "steps": [
      {
        "target": "search",
        "title": "Find a client",
        "description": "Search by name or mobile number, then open a client profile from the results."
      },
      {
        "target": "filters",
        "title": "Narrow your client list",
        "description": "Filter clients by status or membership and choose how to sort them."
      },
      {
        "target": "add",
        "title": "Add a client",
        "description": "Start a new client profile here."
      }
    ]
  },
  "services": {
    "title": "Services",
    "steps": [
      {
        "target": "search",
        "title": "Find a service",
        "description": "Search your service menu by name. Open a result to review its details."
      },
      {
        "target": "sort",
        "title": "Sort your services",
        "description": "Choose the order that makes services easiest to find."
      },
      {
        "target": "add",
        "title": "Add a service",
        "description": "Create a service with the details your team needs for bookings."
      }
    ]
  },
  "memberships": {
    "title": "Memberships",
    "steps": [
      {
        "target": "search",
        "title": "Find a membership",
        "description": "Search plans by name. Open a membership to review its benefits and details."
      },
      {
        "target": "summary",
        "title": "Membership overview",
        "description": "Review the membership totals shown here."
      },
      {
        "target": "add",
        "title": "Create a membership",
        "description": "Start a new membership plan with benefits and validity."
      }
    ]
  },
  "sales": {
    "title": "Sales",
    "steps": [
      {
        "target": "summary",
        "title": "Sales at a glance",
        "description": "Review the sales count and revenue shown for this list."
      },
      {
        "target": "search",
        "title": "Find a receipt",
        "description": "Search by receipt or client name. Tap a sale in the results to view its details."
      },
      {
        "target": "filters",
        "title": "Filter your sales",
        "description": "Use these status filters to narrow the list."
      },
      {
        "target": "sort",
        "title": "Change the order",
        "description": "Choose how the sales list is sorted."
      }
    ]
  },
  "team": {
    "title": "Staff",
    "steps": [
      {
        "target": "search",
        "title": "Find a team member",
        "description": "Search your staff list, then open a staff card to review their details."
      },
      {
        "target": "sort",
        "title": "Organize your staff list",
        "description": "Choose the staff filters and sorting options you need."
      },
      {
        "target": "add",
        "title": "Add staff",
        "description": "Create a profile for a new team member."
      }
    ]
  },
  "attendance": {
    "title": "Attendance",
    "steps": [
      {
        "target": "date",
        "title": "Choose a day",
        "description": "Use the arrows or date picker to review attendance for a day."
      },
      {
        "target": "search",
        "title": "Find staff attendance",
        "description": "Search by staff name or role. The results below show each person's attendance and available actions."
      }
    ]
  },
  "calendar": {
    "title": "Calendar",
    "steps": [
      {
        "target": "view",
        "title": "Choose your calendar view",
        "description": "Switch between Day, Week and List to plan your schedule."
      },
      {
        "target": "date",
        "title": "Move through your schedule",
        "description": "Select a date or use the arrows to move between days or weeks."
      },
      {
        "target": "search",
        "title": "Find an appointment",
        "description": "Open search to find an appointment in the calendar."
      },
      {
        "target": "filters",
        "title": "Focus your calendar",
        "description": "Filter appointments by staff and status. Tap a booking in the calendar to open it."
      }
    ]
  },
  "reports": {
    "title": "Reports",
    "steps": VISIBLE_REPORT_GROUPS.map((group) => ({
      target: group,
      title: `${group} reports`,
      description: "Expand this category and select a report to review its details. Reports marked unavailable cannot be opened.",
    }))
  },
  "settings": {
    "title": "Settings",
    "steps": [
      {
        "target": "Clients",
        "title": "Clients",
        "description": "Find client profiles and visit information."
      },
      {
        "target": "Services",
        "title": "Services",
        "description": "Manage your salon service menu."
      },
      {
        "target": "Memberships",
        "title": "Memberships",
        "description": "Review and create membership plans."
      },
      {
        "target": "Sales Summary",
        "title": "Sales Summary",
        "description": "Find completed and draft sales."
      },
      {
        "target": "Attendance",
        "title": "Attendance",
        "description": "Review staff attendance and the actions available to your role."
      }
    ]
  },
  "staffHome": {
    "title": "My home",
    "steps": [
      {
        "target": "attendance",
        "title": "Your attendance",
        "description": "Review your attendance status and use the available check-in or check-out action when ready."
      },
      {
        "target": "progress",
        "title": "Your daily progress",
        "description": "See completed and remaining appointments and your average rating."
      }
    ]
  },
  "staffCalendar": {
    "title": "My calendar",
    "steps": [
      {
        "target": "search",
        "title": "Find your bookings",
        "description": "Search your assigned appointments and open a result to review it."
      },
      {
        "target": "date",
        "title": "Choose a date",
        "description": "Select the day you want to review."
      },
      {
        "target": "filters",
        "title": "Filter appointment status",
        "description": "Show or hide the status filters to narrow your bookings."
      }
    ]
  },
  "bookings": {
    "title": "Appointments",
    "steps": [
      {
        "target": "search",
        "title": "Find an appointment",
        "description": "Search for bookings and select a result to open its details."
      },
      {
        "target": "date",
        "title": "Choose your booking date",
        "description": "Select the day you want to review."
      },
      {
        "target": "filters",
        "title": "Filter booking statuses",
        "description": "Show or hide status filters to focus on the bookings you need."
      },
      {
        "target": "summary",
        "title": "Your appointment overview",
        "description": "Review the booking totals and statuses for your selected day."
      }
    ]
  },
  "staffAppointments": {
    "title": "My appointments",
    "steps": [
      {
        "target": "summary",
        "title": "Your assigned appointments",
        "description": "Review today, upcoming, completed and cancelled totals. Tap an appointment below to open its details and available actions."
      }
    ]
  }
} as const satisfies Record<string, ScreenTour>;
