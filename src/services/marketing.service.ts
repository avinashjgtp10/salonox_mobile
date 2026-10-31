import { api } from "@/services/api";
import { MARKETING } from "@/services/api/endpoints/marketing.endpoints";
import { asRecord, toSafeNumber as num, toSafeString as str } from "@/utils/apiNormalize";
import type { MarketingCampaign, MarketingConfig, MarketingContact, MarketingDashboard, MarketingInsights, MarketingPage, MarketingTemplate } from "@/types/marketing";

// Stats/pagers return raw JSON; campaigns/config use the success/data envelope.
const unwrap = (value: unknown): unknown => {
  const record = asRecord(value);
  return Object.prototype.hasOwnProperty.call(record, "data") ? record.data : value;
};
const rows = (value: unknown) => Array.isArray(value) ? value.map(asRecord) : [];
export const normalizeMarketingCampaign = (value: unknown): MarketingCampaign => {
  const c = asRecord(value);
  const sent = num(c.sent_count);
  return {
    id: str(c.id), name: str(c.name), status: str(c.status).toUpperCase(), created_at: str(c.created_at),
    sent_count: sent, delivered_count: num(c.delivered_count), read_count: num(c.read_count),
    failed_count: num(c.failed_count), blocked_count: num(c.blocked_count),
    delivery_rate: c.delivery_rate == null ? (sent ? num(c.delivered_count) / sent * 100 : 0) : num(c.delivery_rate),
    read_rate: c.read_rate == null ? (sent ? num(c.read_count) / sent * 100 : 0) : num(c.read_rate),
  };
};
export const marketingService = {
  /** Same rule as the web's MarketingRoutes: WhatsApp is set up once the salon has a phone_number_id. */
  async isWhatsAppConnected(signal?: AbortSignal): Promise<boolean> {
    const response = await api.get(MARKETING.WA_CONFIG, { signal });
    const c = asRecord(unwrap(response.data));
    return Boolean(str(c.phone_number_id ?? c.phoneNumberId));
  },
  async getInsights(days: 7 | 30 | 90, signal?: AbortSignal): Promise<MarketingInsights> {
    const response = await api.get(MARKETING.INSIGHTS, { params: { days }, signal, timeout: 120000 });
    const payload = unwrap(response.data);
    const d = asRecord(payload);
    if (!payload || !d.totals) throw new Error("Meta insights returned an invalid response. Please try again.");
    const t = asRecord(d.totals);
    return {
      days: num(d.days) || days, currency: str(d.currency) || "INR",
      totals: { cost: num(t.cost), billableVolume: num(t.billableVolume), freeVolume: num(t.freeVolume), volume: num(t.volume) },
      byCategory: rows(d.byCategory).map(c => ({ category: str(c.category), cost: num(c.cost), volume: num(c.volume), freeVolume: num(c.freeVolume) })),
      daily: rows(d.daily).map(v => ({ date: str(v.date), cost: num(v.cost), volume: num(v.volume) })).sort((a, b) => a.date.localeCompare(b.date)),
      templates: rows(d.templates).map(t => ({ template_id: str(t.template_id), name: str(t.name), sent: num(t.sent), delivered: num(t.delivered), read: num(t.read), clicked: num(t.clicked), clicks: Object.fromEntries(Object.entries(asRecord(t.clicks)).map(([k, v]) => [k, num(v)])) })),
      errors: Array.isArray(d.errors) ? d.errors.map(e => str(e)).filter(Boolean) : [],
    };
  },
  async getDashboard(signal?: AbortSignal): Promise<MarketingDashboard> {
    const [statsResponse, campaignsResponse, configResponse] = await Promise.all([
      api.get(MARKETING.STATS, { signal }), api.get(MARKETING.CAMPAIGNS, { signal }), api.get(MARKETING.WA_CONFIG, { signal }),
    ]);
    const s = asRecord(unwrap(statsResponse.data));
    const configPayload = unwrap(configResponse.data);
    const c = asRecord(configPayload);
    const config: MarketingConfig | null = configPayload ? {
      displayPhone: str(c.display_phone ?? c.displayPhone), dailyLimit: num(c.daily_limit ?? c.dailyLimit),
      qualityRating: str(c.quality_rating ?? c.qualityRating), isVerified: (c.is_verified ?? c.isVerified) === true,
    } : null;
    return {
      config, campaigns: rows(unwrap(campaignsResponse.data)).map(normalizeMarketingCampaign),
      stats: {
        totalSent: num(s.totalMessagesSent ?? s.totalSent), totalDelivered: num(s.totalDelivered),
        totalRead: num(s.totalRead), totalFailed: num(s.totalFailed), totalBlocked: num(s.totalBlocked),
        totalCampaigns: num(s.totalCampaigns), completedCampaigns: num(s.completedCampaigns), sentToday: num(s.sentToday),
        topCampaigns: rows(s.topCampaigns).map(normalizeMarketingCampaign),
      },
    };
  },
  async getTopTemplates(page: number, signal?: AbortSignal): Promise<MarketingPage<MarketingTemplate>> {
    const response = await api.get(MARKETING.TOP_TEMPLATES, { params: { page, limit: 10 }, signal });
    const data = asRecord(unwrap(response.data));
    return { total: num(data.total), rows: rows(data.rows).map(t => ({
      template_id: str(t.template_id), template_name: str(t.template_name), times_used: num(t.times_used),
      total_sent: num(t.total_sent), total_delivered: num(t.total_delivered), avg_read_rate: num(t.avg_read_rate),
    })) };
  },
  async getEngagedContacts(page: number, signal?: AbortSignal): Promise<MarketingPage<MarketingContact>> {
    const response = await api.get(MARKETING.ENGAGED_CONTACTS, { params: { page, limit: 10 }, signal });
    const data = asRecord(unwrap(response.data));
    return { total: num(data.total), rows: rows(data.rows).map(c => ({
      phone: str(c.phone), name: str(c.name), campaigns_read: num(c.campaigns_read), read_rate: num(c.read_rate),
    })) };
  },
};
