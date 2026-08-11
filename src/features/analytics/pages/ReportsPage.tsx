import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Search, StarFill, Star, ChevronRight, ChevronDown, ClockHistory,
  GraphUpArrow, People, PersonBadge, CalendarCheck, BoxSeam, Tag, Megaphone,
  PieChartFill, Bag, Scissors, BarChartLine, Receipt, Award, Wallet2,
  PersonCircle, PersonCheck, PeopleFill, Droplet, Whatsapp, FileEarmarkBarGraph,
  CashCoin, PersonCheckFill, Truck, ChatDots, PersonDash,
} from "react-bootstrap-icons";
import "../styles/ReportsPage.scss";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSettingsThunk } from "../../../middleware/setting/setting.thunk";
import { getTaxModuleConfig } from "../../settings/utils/taxModuleSettings";

import SalesSummaryReport from "../reports/SalesSummaryReport";
import ProductSaleReport from "../reports/ProductSaleReport";
import ProductInventoryReport from "../reports/ProductInventoryReport";
import ConsumableUsageReport from "../reports/ConsumableUsageReport";
import DailySheetReport from "../reports/DailySheetReport";
import TaxesReport from "../reports/TaxesReport";
import PackageSaleReport from "../reports/PackageSaleReport";
import MemberSaleReport from "../reports/MemberSaleReport";
import ServiceSaleReport from "../reports/ServiceSaleReport";
import RewardReport from "../reports/RewardReport";
import EwalletReport from "../reports/EwalletReport";
import ClientRevenueReport from "../reports/ClientRevenueReport";
import CustomerFrequencyReport from "../reports/CustomerFrequencyReport";
import LostCustomersReport from "../reports/LostCustomersReport";
import ServiceFrequencyReport from "../reports/ServiceFrequencyReport";
import CustomerSpendReport from "../reports/CustomerSpendReport";
import ReferralReport from "../reports/ReferralReport";
import PaymentCollectionReport from "../reports/PaymentCollectionReport";
import ClientRatingReport from "../reports/ClientRatingReport";
import StaffSalesReport from "../reports/StaffSalesReport";
import StaffPerformanceReport from "../reports/StaffPerformanceReport";
import StaffItemSalesReport from "../reports/StaffItemSalesReport";
import CommissionReport from "../reports/CommissionReport";
import AttendanceReport from "../reports/AttendanceReport";
import PackageHistoryReport from "../reports/PackageHistoryReport";
import MembershipHistoryReport from "../reports/MembershipHistoryReport";
import AppointmentDetailReport from "../reports/AppointmentDetailReport";
import UpcomingAppointmentsReport from "../reports/UpcomingAppointmentsReport";
import WaCampaignReport from "../reports/WaCampaignReport";
import OpenRateReport from "../reports/OpenRateReport";
import ReplyRateReport from "../reports/ReplyRateReport";
import ProductMarginReport from "../reports/ProductMarginReport";
import SupplierReport from "../reports/SupplierReport";

type CategoryKey = "sales" | "payments" | "customers" | "staff" | "appointments" | "inventory" | "packages" | "marketing";

// react-bootstrap-icons types `size` as string | number, so the narrower
// `{ size?: number }` this used to declare rejected every icon in the tables
// below — 33 identical errors, one per report/category row. Widened to match
// the icon library rather than casting at each of the 33 call sites.
type ReportIcon = React.ComponentType<{ size?: string | number }>;

interface ReportDef {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CategoryKey;
  icon: ReportIcon;
  Component: React.ComponentType<{ onBack: () => void; category: string; categoryKey: string }>;
}

const CATEGORIES: { key: CategoryKey; label: string; description: string; icon: ReportIcon }[] = [
  { key: "sales",        label: "Sales",        description: "Track revenue, invoices, payments and overall sales performance", icon: GraphUpArrow },
  { key: "payments",     label: "Payments",     description: "Collections, outstanding balances and payment method breakdowns",  icon: CashCoin },
  { key: "customers",    label: "Customers",    description: "Customer analysis, visits, feedback and behavior insights",       icon: People },
  { key: "staff",        label: "Staff",        description: "Staff performance, commissions, attendance and productivity",     icon: PersonBadge },
  { key: "appointments", label: "Appointments", description: "Booking trends, cancellations, no-shows and appointment analytics", icon: CalendarCheck },
  { key: "inventory",    label: "Inventory",    description: "Stock, usage, low stock alerts and inventory valuation",          icon: BoxSeam },
  { key: "packages",     label: "Package and Membership", description: "Package sales, usage and membership analytics",           icon: Tag },
  { key: "marketing",    label: "Marketing",    description: "Campaign performance, leads and marketing insights",             icon: Megaphone },
];

const REPORTS: ReportDef[] = [
  { id: "sales_summary",          slug: "sales-summary",          name: "Sales Summary",                               description: "View every bill raised for a period — totals, payments, balances and status.",                     category: "sales",        icon: PieChartFill,   Component: SalesSummaryReport },
  { id: "daily_sheet",            slug: "daily-sheet",            name: "Daily Sheet",                                 description: "A single day's transactions — tickets, services, staff and collections.",                           category: "sales",        icon: BarChartLine,   Component: DailySheetReport },
  { id: "product_sale",           slug: "product-retail",         name: "Product Retail",                              description: "Products sold directly to clients — quantity, price and the staff/client attached to the sale.", category: "sales",        icon: Bag,            Component: ProductSaleReport },
  { id: "service_sale",           slug: "service-sale",           name: "Service Sale",                                description: "Every service sold, with count, revenue and average ticket per service.",                          category: "sales",        icon: Scissors,       Component: ServiceSaleReport },
  { id: "taxes",                  slug: "gst-report",             name: "GST Report",                                  description: "Tax collected per invoice, broken down by whatever taxes are configured in Tax Mapping.",       category: "sales",        icon: Receipt,        Component: TaxesReport },
  { id: "product_margin",         slug: "product-margin",         name: "Product Margin",                              description: "Profit margin per product — sale price against cost price.",                                       category: "sales",        icon: GraphUpArrow,   Component: ProductMarginReport },
  { id: "reward",                 slug: "reward",                 name: "Reward",                                      description: "Reward points available and redeemed to date, per client.",                                        category: "sales",        icon: Award,          Component: RewardReport },
  { id: "ewallet",                slug: "ewallet",                name: "Ewallet",                                     description: "Client e-wallet top-ups, deductions and running balance.",                                         category: "sales",        icon: Wallet2,        Component: EwalletReport },
  { id: "payment_collection",     slug: "payment-collection",     name: "Payment Collection Report",                   description: "Outstanding balances per bill — amount billed, collected and still due, with pending totals and the oldest unpaid date.", category: "payments",     icon: CashCoin,       Component: PaymentCollectionReport },
  { id: "client_revenue",         slug: "client-revenue",         name: "Client Revenue",                              description: "Total spend, visit count, average ticket per client, and marketing feedback rating.",              category: "customers",    icon: PersonCircle,   Component: ClientRevenueReport },
  { id: "customer_frequency",     slug: "customer-frequency",     name: "Customer Frequency",                          description: "New vs returning clients, with Most/Least Frequent, New, Old and Lost customer filters.",         category: "customers",    icon: PeopleFill,     Component: CustomerFrequencyReport },
  { id: "lost_customers",         slug: "lost-customers",         name: "Lost Customers",                              description: "Clients who stopped visiting — set your own inactivity window and filter by last-visit date range.", category: "customers",    icon: PersonDash,     Component: LostCustomersReport },
  { id: "customer_spend",         slug: "vip-customers",          name: "VIP Customers",                               description: "Your top spending clients — plus regular and low spenders — against your own ₹ thresholds, with each segment's share of revenue.", category: "customers",    icon: Award,          Component: CustomerSpendReport },
  { id: "service_frequency",      slug: "service-frequency",      name: "Service Frequency",                           description: "How often each client returns for a given service — visits, first/last visit and the average gap between them.", category: "customers",    icon: Scissors,       Component: ServiceFrequencyReport },
  { id: "referral_report",        slug: "referral-report",        name: "Referral Report",                             description: "Who referred whom — referral date, the referred client's visits and revenue, and the referrer's reward status.", category: "customers",    icon: PeopleFill,     Component: ReferralReport },
  { id: "client_rating",          slug: "client-rating",          name: "Client Rating Report",                        description: "Post-visit WhatsApp ratings, reviews per client, and total client spend.",                        category: "customers",    icon: StarFill,       Component: ClientRatingReport },
  { id: "staff_sales",            slug: "staff-sales",            name: "Staff Sales",                                 description: "Revenue generated by each staff member, split by service and product.",                            category: "staff",        icon: PersonCheck,    Component: StaffSalesReport },
  { id: "staff_performance",      slug: "staff-performance",      name: "Staff Performance",                           description: "One row per staff member — invoices, items sold, revenue, commission, collected and due.",         category: "staff",        icon: GraphUpArrow,   Component: StaffPerformanceReport },
  { id: "staff_item_sales",       slug: "staff-item-sales",       name: "Service, Product, Membership & Package Sold by Staff", description: "What each staff member sold, broken down by item type.",                                 category: "staff",        icon: PeopleFill,     Component: StaffItemSalesReport },
  { id: "commission_report",      slug: "commission-report",      name: "Commission Report",                           description: "Commission earned by each staff member for a month — revenue, pending and paid payouts.",          category: "staff",        icon: CashCoin,       Component: CommissionReport },
  { id: "attendance_report",      slug: "attendance-report",      name: "Attendance Report",                           description: "Daily attendance for every staff member — status, check-in/out and hours worked.",                   category: "staff",        icon: PersonCheckFill, Component: AttendanceReport },
  { id: "appointment_detail",     slug: "appointment-detail",     name: "Detailed Appointment Reports",                description: "Every appointment for a period, with status, staff, service and payment detail.",                 category: "appointments", icon: CalendarCheck,  Component: AppointmentDetailReport },
  { id: "upcoming_appointments",  slug: "upcoming-appointments",  name: "Upcoming Appointments Report",                description: "Future appointments still booked — date, time, client, service and staff.",                       category: "appointments", icon: ClockHistory,   Component: UpcomingAppointmentsReport },
  { id: "product_inventory",      slug: "product-inventory",      name: "Product Inventory",                           description: "Current on-hand stock, reorder levels and stock value by product.",                                category: "inventory",    icon: BoxSeam,        Component: ProductInventoryReport },
  { id: "consumable_usage",       slug: "consumable-usage",       name: "Consumable Usage",                            description: "Products used up by staff during services (back-bar stock), separate from client sales.",       category: "inventory",    icon: Droplet,        Component: ConsumableUsageReport },
  { id: "supplier_report",        slug: "supplier-report",        name: "Supplier Report",                             description: "All suppliers on record, with contact details and location.",                                     category: "inventory",    icon: Truck,          Component: SupplierReport },
  { id: "package_sale",           slug: "package-sale",           name: "Package Sale",                                description: "Packages purchased by clients, with amount paid and balance due.",                                  category: "packages",     icon: Tag,            Component: PackageSaleReport },
  { id: "package_history",        slug: "package-history",        name: "Package History",                             description: "Session-by-session usage history for every client package.",                                      category: "packages",     icon: ClockHistory,   Component: PackageHistoryReport },
  { id: "member_sale",            slug: "member-sale",            name: "Membership Sale",                             description: "Memberships purchased by clients and their current status.",                                       category: "packages",     icon: PersonBadge,    Component: MemberSaleReport },
  { id: "membership_history",     slug: "membership-history",     name: "Membership History",                          description: "Redemption-by-redemption usage for every client membership — service, amount used and balance left.", category: "packages",     icon: ClockHistory,   Component: MembershipHistoryReport },
  { id: "wa_campaign",            slug: "wa-marketing-campaign",  name: "WA Marketing Campaign",                       description: "WhatsApp campaign delivery, read rates and engagement.",                                           category: "marketing",    icon: Whatsapp,       Component: WaCampaignReport },
  { id: "mkt_feedback",           slug: "client-rating",          name: "Marketing Feedback & Ratings",                description: "Post-visit WhatsApp feedback ratings, reviews, and client spend insights.",                       category: "marketing",    icon: StarFill,       Component: ClientRatingReport },
  { id: "open_rate",              slug: "open-rate",              name: "Open Rate Report",                            description: "How many delivered campaign messages were actually opened — engagement per campaign, with recipient-level detail.", category: "marketing", icon: FileEarmarkBarGraph, Component: OpenRateReport },
  { id: "reply_rate",             slug: "reply-rate",             name: "Reply Rate Report",                           description: "How many recipients wrote back within 24 hours of a campaign reaching them, per campaign and per customer.", category: "marketing", icon: ChatDots,       Component: ReplyRateReport },
];

const DEFAULT_FAVORITES = ["sales_summary", "staff_sales", "appointment_detail", "client_revenue", "daily_sheet"];
const FAVORITES_KEY = "rp_favorite_reports";
const RECENTS_KEY   = "rp_recent_reports";
const MAX_RECENTS   = 10;

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_FAVORITES;
}

function loadRecents(): { id: string; ts: number }[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function timeAgo(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

export default function ReportsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { category: categoryParam, reportSlug } = useParams();
  const { items: settingItems } = useAppSelector((s) => s.setting);
  const [search, setSearch]         = useState("");
  const [favorites, setFavorites]   = useState<string[]>(loadFavorites);
  const [recents, setRecents]       = useState<{ id: string; ts: number }[]>(loadRecents);
  const [expanded, setExpanded]     = useState<Set<CategoryKey>>(() => {
    const expandParam = new URLSearchParams(window.location.search).get("expand");
    const isValidCategory = (v: string | null): v is CategoryKey => CATEGORIES.some(c => c.key === v);
    return isValidCategory(expandParam) ? new Set([expandParam]) : new Set();
  });
  const [showAllRecents, setShowAllRecents] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hide the GST/Taxes report entirely when GST is off or GST reports are
  // disabled in Tax Settings — no tax data to report either way.
  const taxModuleConfig = useMemo(() => getTaxModuleConfig(settingItems), [settingItems]);
  const visibleReports = useMemo(
    () => REPORTS.filter((r) => r.id !== "taxes" || (taxModuleConfig.enabled && taxModuleConfig.enable_gst_reports)),
    [taxModuleConfig],
  );

  const byId = useMemo(() => new Map(visibleReports.map(r => [r.id, r])), [visibleReports]);
  const bySlug = useMemo(() => new Map(visibleReports.map(r => [`${r.category}/${r.slug}`, r])), [visibleReports]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleCategory = (key: CategoryKey) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const markRecent = (id: string) => {
    setRecents(prev => {
      const next = [{ id, ts: Date.now() }, ...prev.filter(r => r.id !== id)].slice(0, MAX_RECENTS);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openReport = (id: string) => {
    const report = byId.get(id);
    if (!report) return;
    navigate(`/reports/${report.category}/${report.slug}`);
  };

  // Legacy deep-link support: /dashboard/analytics?report=<id> redirects to the
  // report's real URL (used by the dashboard's "Collect Now" → Sales Summary
  // shortcut, and any old bookmarks/links pointing at the old query-param form).
  useEffect(() => {
    const id = searchParams.get("report");
    if (id && byId.has(id)) openReport(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const favoriteReports = favorites.map(id => byId.get(id)).filter((r): r is ReportDef => !!r);
  const recentReports = recents.map(r => ({ ...r, report: byId.get(r.id) })).filter(r => r.report);

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return visibleReports.filter(r => r.name.toLowerCase().includes(query) || r.description.toLowerCase().includes(query));
  }, [query, isSearching, visibleReports]);

  const active = (categoryParam && reportSlug) ? bySlug.get(`${categoryParam}/${reportSlug}`) ?? null : null;
  const activeCategoryLabel = active ? CATEGORIES.find(c => c.key === active.category)?.label ?? active.category : "";

  // Record "recently opened" whenever the URL lands on a valid report — covers
  // direct navigation, browser back/forward and refresh, not just openReport().
  useEffect(() => {
    if (active) markRecent(active.id);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rp-page">
      {active ? (
        <active.Component onBack={() => navigate("/reports")} category={activeCategoryLabel} categoryKey={active.category} />
      ) : (
        <>
          <div className="rp-header">
            <div className="rp-header-left">
              <div className="rp-header-icon">
                <FileEarmarkBarGraph size={20} />
              </div>
              <div>
                <h1 className="rp-page-title">Reports</h1>
                <p className="rp-page-sub">View and analyze your salon performance</p>
              </div>
            </div>
            <div className="rp-search-wrap">
              <Search size={14} className="rp-search-ic" />
              <input
                ref={searchRef}
                type="text"
                className="rp-search-input"
                placeholder="Search reports..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="rp-search-kbd">Ctrl + /</span>
            </div>
          </div>

          <div className="rp-body-grid">
            <div className="rp-body-main">
              {isSearching ? (
                <div className="rp-section">
                  <h2 className="rp-section-title">Search Results</h2>
                  {searchResults.length === 0 ? (
                    <div className="rp-report-empty">No reports found for “{search}”.</div>
                  ) : (
                    <div className="rp-search-results">
                      {searchResults.map(r => (
                        <div key={r.id} className="rp-cat-report-row" onClick={() => openReport(r.id)}>
                          <div className="rp-cat-report-icon"><r.icon size={15} /></div>
                          <div className="rp-cat-report-info">
                            <div className="rp-cat-report-name">{r.name}</div>
                            <div className="rp-cat-report-desc">{r.description}</div>
                          </div>
                          <button
                            className={`rp-star-btn ${favorites.includes(r.id) ? "active" : ""}`}
                            onClick={e => toggleFavorite(r.id, e)}
                            aria-label="Toggle favorite"
                          >
                            {favorites.includes(r.id) ? <StarFill size={15} /> : <Star size={15} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="rp-section">
                    <div className="rp-section-head">
                      <h2 className="rp-section-title"><StarFill size={15} className="rp-section-title-ic rp-favorite-ic" /> Favorites</h2>
                      <button className="rp-manage-link" onClick={() => setExpanded(new Set(CATEGORIES.map(c => c.key)))}>
                        Manage Favorites
                      </button>
                    </div>
                    {favoriteReports.length === 0 ? (
                      <div className="rp-report-empty">Star a report below to pin it here.</div>
                    ) : (
                      <div className="rp-fav-row">
                        {favoriteReports.map(r => {
                          const cat = CATEGORIES.find(c => c.key === r.category)!;
                          return (
                            <div key={r.id} className="rp-fav-card" onClick={() => openReport(r.id)}>
                              <div className="rp-fav-card-top">
                                <div className={`rp-fav-card-icon rp-cat-icon--${r.category}`}><r.icon size={15} /></div>
                                <button
                                  className="rp-star-btn active"
                                  onClick={e => toggleFavorite(r.id, e)}
                                  aria-label="Unfavorite"
                                >
                                  <StarFill size={12} />
                                </button>
                              </div>
                              <div className="rp-fav-card-name">{r.name}</div>
                              <div className="rp-fav-card-cat">{cat.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rp-section">
                    <div className="rp-section-head">
                      <h2 className="rp-section-title"><ClockHistory size={15} className="rp-section-title-ic" /> Recently Opened</h2>
                      {recentReports.length > 5 && (
                        <button className="rp-manage-link" onClick={() => setShowAllRecents(v => !v)}>
                          {showAllRecents ? "Show Less" : "View All"}
                        </button>
                      )}
                    </div>
                    {recentReports.length === 0 ? (
                      <div className="rp-report-empty">Reports you open will show up here.</div>
                    ) : (
                      <div className="rp-recent-row">
                        {(showAllRecents ? recentReports : recentReports.slice(0, 5)).map(r => (
                          <div key={r.id} className="rp-recent-item" onClick={() => openReport(r.id)}>
                            <div className="rp-recent-name">{r.report!.name}</div>
                            <div className="rp-recent-time">{timeAgo(r.ts)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rp-section">
                    <h2 className="rp-section-title">All Report Categories</h2>
                    <div className="rp-cat-list">
                      {CATEGORIES.map(cat => {
                        const reports = visibleReports.filter(r => r.category === cat.key);
                        const isOpen = expanded.has(cat.key);
                        return (
                          <div key={cat.key} className={`rp-cat-block ${isOpen ? "open" : ""}`}>
                            <div className="rp-cat-row" onClick={() => toggleCategory(cat.key)}>
                              <div className={`rp-cat-icon rp-cat-icon--${cat.key}`}><cat.icon size={18} /></div>
                              <div className="rp-cat-info">
                                <div className="rp-cat-name">{cat.label}</div>
                                <div className="rp-cat-desc">{cat.description}</div>
                              </div>
                              <span className="rp-cat-count">{reports.length} Report{reports.length !== 1 ? "s" : ""}</span>
                              <span className="rp-cat-chevron">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                            </div>
                            {isOpen && (
                              <div className="rp-cat-report-list">
                                {reports.map(r => (
                                  <div key={r.id} className="rp-cat-report-row" onClick={() => openReport(r.id)}>
                                    <div className="rp-cat-report-icon"><r.icon size={15} /></div>
                                    <div className="rp-cat-report-info">
                                      <div className="rp-cat-report-name">{r.name}</div>
                                      <div className="rp-cat-report-desc">{r.description}</div>
                                    </div>
                                    <button
                                      className={`rp-star-btn ${favorites.includes(r.id) ? "active" : ""}`}
                                      onClick={e => toggleFavorite(r.id, e)}
                                      aria-label="Toggle favorite"
                                    >
                                      {favorites.includes(r.id) ? <StarFill size={15} /> : <Star size={15} />}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
