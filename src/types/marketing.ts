export type MarketingCampaign = {
  id: string; name: string; status: string; created_at: string;
  sent_count: number; delivered_count: number; read_count: number;
  failed_count: number; blocked_count: number;
  delivery_rate: number; read_rate: number;
};
export type MarketingTemplate = {
  template_id: string; template_name: string; times_used: number;
  total_sent: number; total_delivered: number; avg_read_rate: number;
};
export type MarketingContact = {
  phone: string; name: string; campaigns_read: number; read_rate: number;
};
export type MarketingStats = {
  totalSent: number; totalDelivered: number; totalRead: number;
  totalFailed: number; totalBlocked: number; totalCampaigns: number;
  completedCampaigns: number; sentToday: number;
  topCampaigns: MarketingCampaign[];
};
export type MarketingConfig = {
  displayPhone: string; dailyLimit: number; qualityRating: string; isVerified: boolean;
};
export type MarketingPage<T> = { rows: T[]; total: number };
export type MarketingDashboard = {
  stats: MarketingStats; campaigns: MarketingCampaign[]; config: MarketingConfig | null;
};
export type MarketingInsights = {
  days: number;
  currency: string;
  totals: { cost: number; billableVolume: number; freeVolume: number; volume: number };
  byCategory: { category: string; volume: number; cost: number; freeVolume: number }[];
  daily: { date: string; cost: number; volume: number }[];
  templates: { template_id: string; name: string; sent: number; delivered: number; read: number; clicked: number; clicks: Record<string, number> }[];
  errors: string[];
};
