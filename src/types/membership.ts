// Verified against salon_mgm_backend/src/modules/memberships. Keep these
// aligned with memberships.types.ts, memberships.routes.ts, and the export
// controller methods.

export type MembershipSortOrder = "asc" | "desc";

export type MembershipExportFormat = "csv" | "excel" | "pdf";

export type MembershipExportContentType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "text/csv";

export type IncludedService = {
  serviceId: string;
  serviceName: string;
  durationMinutes?: number;
};

export type CreateMembershipRequest = {
  name: string;
  description?: string;
  includedServices: IncludedService[];
  privileges?: unknown;
  metadata?: unknown;
  bonusCredit?: number;
  sessionType: string;
  numberOfSessions?: number;
  validFor: string;
  price: number;
  taxRate?: number;
  colour: string;
  enableOnlineSales: boolean;
  enableOnlineRedemption: boolean;
  termsAndConditions?: string;
};

export type UpdateMembershipRequest = Partial<CreateMembershipRequest>;

export type Membership = CreateMembershipRequest & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type MembershipRow = {
  id: string;
  name: string;
  description: string | null;
  privileges?: unknown;
  metadata?: unknown;
  bonus_credit?: string | number | null;
  bonusCredit?: string | number | null;
  session_type: string;
  number_of_sessions: number | null;
  valid_for: string;
  price: string;
  tax_rate: string | null;
  colour: string;
  enable_online_sales: boolean;
  enable_online_redemption: boolean;
  terms_and_conditions: string | null;
  created_at: string;
  updated_at: string;
  services: IncludedService[] | null;
};

export type MembershipListQuery = {
  search?: string;
  sessionType?: string;
  colour?: string;
  validFor?: string;
  page?: number;
  limit?: number;
};

export type MembershipListResponse = {
  items: Membership[];
  total: number;
};

export type MembershipDetailResponse = Membership;

export type CreateMembershipResponse = Membership;

export type UpdateMembershipResponse = Membership;

export type DeleteMembershipResponse = Record<string, never>;

export type MembershipExportQuery = Omit<MembershipListQuery, "page" | "limit">;

export type MembershipExportRequest = MembershipExportQuery & {
  format: MembershipExportFormat;
};

export type MembershipExportResponse =
  | {
      contentType: "text/csv";
      data: string;
      filename?: string;
      format: "csv";
    }
  | {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      data: ArrayBuffer;
      filename?: string;
      format: "excel";
    }
  | {
      contentType: "application/pdf";
      data: ArrayBuffer;
      filename?: string;
      format: "pdf";
    };
