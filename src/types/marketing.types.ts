import type { EntityId } from "./common.types";

// ── Template ──────────────────────────────────────────────────────────────────
export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED";
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type HeaderType = "none" | "text" | "image" | "video" | "document";
export type ButtonType = "quick_reply" | "url" | "phone";

export interface TemplateButton {
  type: ButtonType;
  text: string;
  value: string;
}

export interface Template {
  id: EntityId;
  name: string;
  status: TemplateStatus;
  category: TemplateCategory;
  language: string;
  bodyText?: string;
  components?: any[];
  rejectionReason?: string;
  createdAt?: string;
}

// ── Campaign ──────────────────────────────────────────────────────────────────
export type CampaignStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "PENDING";

export interface Campaign {
  id: EntityId;
  name: string;
  status: CampaignStatus;
  templateId: EntityId;
  batchSize: number;
  totalContacts: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  createdAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  templateId: EntityId;
  batchSize: number;
  contacts: { phone: string; name?: string; variables?: Record<string, any> }[];
}

// ── Webhook Event ─────────────────────────────────────────────────────────────
export type WebhookStatus = "SENT" | "DELIVERED" | "READ" | "FAILED" | "BLOCKED";

export interface WebhookEvent {
  id: EntityId;
  phone: string;
  status: WebhookStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  updatedAt: string;
}

// ── WhatsApp Config ───────────────────────────────────────────────────────────
export type QualityRating = "GREEN" | "YELLOW" | "RED";

export interface WaConfig {
  phoneNumberId: string;
  wabaId: string;
  appId: string;
  webhookVerifyToken: string;
  displayPhone?: string;
  isVerified?: boolean;
  dailyLimit?: number;
  qualityRating?: QualityRating;
}

export interface SaveWaConfigPayload {
  phoneNumberId: string;
  wabaId: string;
  appId: string;
  accessToken: string;
  webhookVerifyToken: string;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export interface DailyVolume {
  date: string;
  count: number;
}

export interface DashboardStats {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalBlocked: number;
  totalContacts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  dailyVolume: DailyVolume[];
}

// ── API Responses ─────────────────────────────────────────────────────────────
export interface TemplateResponse { data: Template; }
export interface TemplatesListResponse { data: Template[]; }
export interface CampaignResponse { data: Campaign; }
export interface CampaignsListResponse { data: Campaign[]; }
export interface WebhookEventsResponse { data: WebhookEvent[]; }
export interface WaConfigResponse { data: WaConfig; }
export interface DashboardStatsResponse { data: DashboardStats; }
