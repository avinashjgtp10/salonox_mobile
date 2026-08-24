import type { EntityId } from "./common.types";

// ── Template ──────────────────────────────────────────────────────────────────
export type TemplateStatus   = "APPROVED" | "PENDING" | "REJECTED";
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type HeaderType       = "none" | "text" | "image" | "video" | "document";
export type ButtonType       = "quick_reply" | "url" | "phone";

export interface TemplateButton {
  type:   ButtonType;
  text:   string;
  value:  string;
}

// Matches backend WATemplate (snake_case from DB)
export interface Template {
  id:               EntityId;
  salon_id?:        string;
  name:             string;
  status:           TemplateStatus;
  category:         TemplateCategory;
  language:         string;
  header_type?:     HeaderType;
  header_text?:     string | null;
  body_text?:       string;
  footer_text?:     string | null;
  buttons?:         TemplateButton[];
  meta_template_id?: string | null;
  rejection_reason?: string | null;
  approved_at?:     string | null;
  created_at?:      string;
  updated_at?:      string;

  // Convenience aliases used in UI (kept for backward compat)
  bodyText?:        string;
  rejectionReason?: string;
  createdAt?:       string;
}

// ── Trigger (Automated) Templates ──────────────────────────────────────────────
// Fires automatically off a real event (a sale, a booking, a lifecycle date) —
// as opposed to Campaign Templates, which a salon manually blasts to a list.
export type PurchaseEventType =
  | "service_purchased"
  | "product_purchased"
  | "membership_purchased"
  | "package_purchased"
  | "appointment_reminder_1h"
  | "thank_you"
  | "review_request"
  | "package_expiring_soon"
  | "sessions_remaining"
  | "appointment_confirmation"
  | "appointment_reminder_24h"
  | "appointment_rescheduled"
  // Reminders for an appointment booked out of a package sale. Separate from
  // the generic appointment_reminder_* events so the copy can name the
  // package and say the visit is already paid for; package-linked
  // appointments are excluded from the generic sweeps server-side so a
  // client never gets both for one visit.
  | "package_appointment_reminder_2d"
  | "package_appointment_reminder_1d";
export type TemplateSubmissionStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

// Matches backend AutomationTemplate rows scoped to a salon (wa_automation_templates)
export interface PurchaseTemplate {
  id:               EntityId;
  salon_id:         string;
  event_type:       PurchaseEventType;
  template_name:    string;
  language:         string;
  is_active:        boolean;
  status:           TemplateSubmissionStatus;
  category:         "UTILITY" | "MARKETING";
  body_text:        string | null;
  meta_template_id: string | null;
  rejection_reason: string | null;
  approved_at:      string | null;
  created_at:       string;
  updated_at:       string;
  has_button?:        boolean;
  button_text?:        string | null;
  button_url_base?:    string | null;
}

export interface PurchaseTemplatesListResponse { data: PurchaseTemplate[]; }
export interface PurchaseTemplateResponse       { data: PurchaseTemplate;  }

// ── Campaign ──────────────────────────────────────────────────────────────────
// FIX: Added DRAFT and SENDING which backend actually uses
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "PENDING";

// Matches backend WACampaign (snake_case from DB)
export interface Campaign {
  id:              EntityId;
  salon_id?:       string;
  name:            string;
  status:          CampaignStatus;
  template_id:     EntityId;
  template_name?:  string;
  template_body?:  string;
  batch_size:      number;
  total_contacts:  number;
  sent_count:      number;
  delivered_count: number;
  read_count:      number;
  failed_count:    number;
  blocked_count:   number;
  scheduled_at?:   string | null;
  started_at?:     string | null;
  completed_at?:   string | null;
  created_at:      string;
  updated_at?:     string;

  // Convenience aliases used in UI (kept for backward compat)
  templateId?:    EntityId;
  batchSize?:     number;
  totalContacts?: number;
  sent?:          number;
  delivered?:     number;
  read?:          number;
  failed?:        number;
}

export interface CreateCampaignPayload {
  name:        string;
  template_id: EntityId;      // FIX: was templateId
  batch_size:    number;        // FIX: was batchSize
  scheduled_at?: string | null;  // ISO string — if set, campaign is scheduled
  contacts:    { phone: string; name?: string; variables?: Record<string, any> }[];
}

// ── WhatsApp Config ───────────────────────────────────────────────────────────
export type QualityRating = "GREEN" | "YELLOW" | "RED";

// Matches backend WhatsAppConfig (snake_case from DB)
export interface WaConfig {
  phone_number_id:       string;
  waba_id:               string;
  app_id?:               string | null;  // Facebook App ID for media uploads
  app_secret?:           string | null;  // For auto webhook registration (masked on return)
  webhook_verify_token:  string;
  display_phone?:        string | null;
  is_verified?:          boolean;
  daily_limit?:          number;
  quality_rating?:       QualityRating;
  ai_receptionist_enabled?: boolean;

  // Convenience aliases used in UI
  phoneNumberId?:        string;
  wabaId?:               string;
  webhookVerifyToken?:   string;
  displayPhone?:         string | null;
  isVerified?:           boolean;
  dailyLimit?:           number;
  qualityRating?:        QualityRating;
  aiReceptionistEnabled?: boolean;
}

export interface SaveWaConfigPayload {
  // camelCase — used by WaConfigPage form
  phoneNumberId?:       string;
  wabaId?:              string;
  appId?:               string;
  appSecret?:           string;   // App Secret for webhook auto-registration
  accessToken?:         string;
  webhookVerifyToken?:  string;
  // snake_case — accepted too for flexibility
  phone_number_id?:     string;
  waba_id?:             string;
  access_token?:        string;
  webhook_verify_token?: string;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export interface DailyVolume {
  date:  string;
  count: number;
}

export interface DashboardStats {
  totalSent:       number;
  totalDelivered:  number;
  totalRead:       number;
  totalFailed:     number;
  totalBlocked:    number;
  totalContacts:   number;
  totalCampaigns:  number;
  activeCampaigns: number;
  sentToday?:      number;
  dailyVolume:     DailyVolume[];
}

// ── API Responses ─────────────────────────────────────────────────────────────
export interface TemplateResponse        { data: Template;        }
export interface TemplatesListResponse   { data: Template[];      }
export interface CampaignResponse        { data: Campaign;        }
export interface CampaignsListResponse   { data: Campaign[];      }
export interface WaConfigResponse        { data: WaConfig;        }
export interface DashboardStatsResponse  { data: DashboardStats;  }