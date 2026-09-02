import type { StaffModuleSection } from "@/features/staff/types/staffFeature.types";
import type { StaffListQuery } from "@/types/staff";

export const STAFF_LIST_PAGE_SIZE = 10;

export const DEFAULT_STAFF_LIST_QUERY: StaffListQuery = {
  limit: STAFF_LIST_PAGE_SIZE,
  page: 1,
  sort_by: "created_at",
  sort_order: "DESC",
};

export const STAFF_MODULE_SECTIONS: StaffModuleSection[] = [
  {
    description: "Core profile, contact details and performance snapshot.",
    key: "profile",
    label: "Profile",
    route: "/team/[id]",
    status: "connected",
  },
  {
    description: "Staff address list backed by the existing staff address APIs.",
    key: "address",
    label: "Address",
    route: "/team/[id]/address",
    status: "connected",
  },
  {
    description: "Emergency contacts backed by create and update APIs.",
    key: "emergencyContacts",
    label: "Emergency Contacts",
    route: "/team/[id]/emergency-contacts",
    status: "connected",
  },
  {
    description: "Compensation records and wage adjustments.",
    key: "wages",
    label: "Wages",
    route: "/team/[id]/wages",
    status: "connected",
  },
  {
    description: "Recorded pay run history and payroll cycles.",
    key: "payRuns",
    label: "Pay Runs",
    route: "/team/[id]/pay-runs",
    status: "connected",
  },
  {
    description: "Earned commission history for this staff member.",
    key: "commissions",
    label: "Commission History",
    route: "/team/[id]/commissions",
    status: "connected",
  },
  {
    description: "Working schedule, breaks, shifts and availability.",
    key: "schedule",
    label: "Schedule",
    route: "/team/[id]/schedule",
    status: "connected",
  },
  {
    description: "Leave requests, approvals and leave history.",
    key: "leaves",
    label: "Leaves",
    route: "/team/[id]/leaves",
    status: "connected",
  },
  {
    description: "Blocked-off time for breaks, training or personal appointments.",
    key: "blockedTimes",
    label: "Blocked Times",
    route: "/team/[id]/blocked-times",
    status: "connected",
  },
  {
    description: "Invite status, resend and cancel invitations.",
    key: "invitations",
    label: "Invitations",
    route: "/team/[id]/invitations",
    status: "connected",
  },
  {
    description: "Identity, contract and certification document storage.",
    key: "documents",
    label: "Documents",
    route: "/team/[id]/documents",
    status: "future-ready",
  },
  {
    description: "Internal staff notes and salon-only timeline entries.",
    key: "notes",
    label: "Notes",
    route: "/team/[id]/notes",
    status: "future-ready",
  },
  {
    description: "Bulk staff onboarding from external files.",
    key: "importStaff",
    label: "Import Staff",
    route: "/team/import",
    status: "future-ready",
  },
];
