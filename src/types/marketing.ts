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
