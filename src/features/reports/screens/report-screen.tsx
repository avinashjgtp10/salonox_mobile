import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { pearl } from "@/components/auth/pearl/tokens";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { appAlert as Alert } from "@/services/appAlert";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { rememberReportFilters, selectReportEntry } from "@/store/report/report.slice";
import { fetchReportThunk } from "@/middleware/report/report.thunk";
import { dateRangeLabel as describeDateRange } from "@/utils/dateRangePresets";
import { ReportFilterSheet } from "../components/report-filter-sheet";
import { ReportSkeleton, ReportState, ReportSummaryCards } from "../components/report-widgets";
import { ReportTable } from "../components/ReportTable";
import { reportService } from "@/services/report.service";
import { salonCommissionsService } from "@/services/salonCommissions.service";
import type { SalonEarnedEntry } from "@/types/salonCommissions";
import { REPORT } from "@/services/api/endpoints";
import { reportColumns, reportCellValue, type ReportColumn } from "../report-table-data";
import { exportReportCsv, loadCompleteReport } from "../report-export";
import { SalesSummaryDetailSheet } from "../components/sales-summary-detail-sheet";
import { REPORT_FILTER_FIELDS, countReportFilters } from "../report-filters";
import { createDefaultReportFilters, type ReportConfig, type ReportFilters } from "../report-config";
import { getReportPagination, getReportRows, getReportSummary, humanizeReportKey, type ReportRow } from "../report-data";

const getInvoiceDetailSaleId = (row: ReportRow, slug: ReportConfig["slug"]) => {
  const saleId = row.saleId ?? row.id;
  const invoiceNumber = row.invoiceNumber ?? row.invoiceNo ?? row.ticketNo;
  const isUnbilled = row.isUnbilled === true || row.is_unbilled === true;

  if (slug === "staff-sales" && !isUnbilled) {
    if (typeof saleId === "string" || typeof saleId === "number") return String(saleId);
  }

  const hasBill = invoiceNumber !== null &&
    invoiceNumber !== undefined &&
    String(invoiceNumber).trim() !== "" &&
    String(invoiceNumber).toLowerCase() !== "not billed yet";

  if (!hasBill) return null;
  if (typeof saleId === "string" || typeof saleId === "number") return String(saleId);
  return null;
};

export default function ReportScreen({ config }: { config: ReportConfig }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const entry = useAppSelector((state) => selectReportEntry(state, config.slug));
  const filters = entry?.filters ?? createDefaultReportFilters(config.slug);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [rangeSheetVisible, setRangeSheetVisible] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [moreTotals, setMoreTotals] = useState(false);
  const [search, setSearch] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const searchInitialized = useRef(false);

  const rows = useMemo(() => getReportRows(config.slug, entry?.data ?? null), [config.slug, entry?.data]);
  const summary = useMemo(() => getReportSummary(config.slug, entry?.data ?? null), [config.slug, entry?.data]);
  const pagination = useMemo(() => getReportPagination(entry?.data ?? null), [entry?.data]);
  const dateRangeLabel = useMemo(() => {
    const rangeStart = filters.date ?? filters.from ?? filters.date_from ?? filters.start_date ?? filters.last_visit_from;
    const rangeEnd = filters.to ?? filters.date_to ?? filters.end_date ?? filters.last_visit_to;

    if (!rangeStart) {
      return "All time";
    }

    return describeDateRange(rangeStart, rangeEnd);
  }, [filters.date, filters.from, filters.date_from, filters.start_date, filters.to, filters.date_to, filters.end_date, filters.last_visit_from, filters.last_visit_to]);
  const hasMore = Boolean(config.paginated && pagination && pagination.page < pagination.totalPages);
  const supportsSearch = config.filters.includes("search");
  const isUnavailable = config.status !== "available";
  const dateKeys = useMemo(() => {
    if (config.filters.includes("last_visit_from")) return { end: "last_visit_to", mode: "range", start: "last_visit_from" } as const;
    if (config.filters.includes("date_from")) return { end: "date_to", mode: "range", start: "date_from" } as const;
    if (config.filters.includes("start_date")) {
      return { end: "end_date", mode: "range", start: "start_date" } as const;
    }

    if (config.filters.includes("from")) {
      return { end: "to", mode: "range", start: "from" } as const;
    }

    if (config.filters.includes("date")) {
      return { end: null, mode: "single", start: "date" } as const;
    }

    return null;
  }, [config.filters]);

  const load = useCallback((nextFilters: ReportFilters, options?: { append?: boolean; refresh?: boolean }) => {
    void dispatch(fetchReportThunk({
      append: options?.append,
      filters: nextFilters,
      refresh: options?.refresh,
      slug: config.slug,
    }));
  }, [config.slug, dispatch]);

  useEffect(() => {
    if (isUnavailable) return;
    if (!entry?.data && !entry?.loading && !entry?.error) load(filters);
  }, [entry?.data, entry?.error, entry?.loading, filters, isUnavailable, load]);

  useEffect(() => {
    if (isUnavailable) return;
    if (!supportsSearch) return;
    if (!searchInitialized.current) {
      searchInitialized.current = true;
      return;
    }
    if ((filters.search ?? "") === debouncedSearch) return;
    const nextFilters = { ...filters, search: debouncedSearch, page: 1 };
    dispatch(rememberReportFilters({ filters: nextFilters, slug: config.slug }));
    load(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.slug, debouncedSearch, dispatch, isUnavailable, load, supportsSearch]);

  const refresh = useCallback(() => load({ ...filters, page: 1 }, { refresh: true }), [filters, load]);
  const loadMore = useCallback(() => {
    if (!hasMore || entry?.loadingMore || entry?.loading || entry?.refreshing || !pagination) return;
    load({ ...filters, page: pagination.page + 1 }, { append: true });
  }, [entry?.loading, entry?.loadingMore, entry?.refreshing, filters, hasMore, load, pagination]);
  const applyFilters = useCallback((nextFilters: ReportFilters) => {
    const applied = { ...nextFilters, search, page: 1 };
    dispatch(rememberReportFilters({ filters: applied, slug: config.slug }));
    setFilterSheetVisible(false);
    load(applied);
  }, [config.slug, dispatch, load, search]);
  const applyRange = useCallback((nextStart: string | null, nextEnd: string | null) => {
    if (!dateKeys) return;
    const applied: ReportFilters = { ...filters, [dateKeys.start]: nextStart ?? "", page: 1 };
    if (dateKeys.end) applied[dateKeys.end] = nextEnd ?? "";
    dispatch(rememberReportFilters({ filters: applied, slug: config.slug }));
    setRangeSheetVisible(false);
    load(applied);
  }, [config.slug, dateKeys, dispatch, filters, load]);

  const handleRowPress = useCallback((row: ReportRow) => {
    const saleId = getInvoiceDetailSaleId(row, config.slug);
    if (saleId) {
      setSelectedSaleId(String(saleId));
    } else setSelectedRow(row);
  }, [config.slug]);

  const primarySummary = !summary ? null : config.slug === "sales-summary"
    ? { totalSale: summary.totalSale ?? "", outstandingAmount: summary.outstandingAmount ?? summary.dueAmount ?? summary.pendingAmount ?? "" }
    : config.slug === "staff-performance" ? { totalRevenue: summary.totalRevenue ?? "", totalCommission: summary.totalCommission ?? "" }
    : summary;
  const columns = useMemo(() => reportColumns(rows, config.columns ?? [], config.primaryFields), [rows, config.columns, config.primaryFields]);
  const activeFilterCount = countReportFilters(config.slug, filters);
  // Opened from Revenue for a single staff member: this report becomes that
  // person's detail screen - their totals only, no chips, search or table.
  const staffIds = filters.staff_ids;
  const staffDetail =
    config.slug === "staff-performance" &&
    typeof staffIds === "string" &&
    staffIds.trim().length > 0 &&
    !staffIds.includes(",");
  const staffId = staffDetail ? String(staffIds).trim() : "";
  // The name only arrives on a row, so a period where this member billed
  // nothing would otherwise blank the header back to the report title.
  // Remember it against the id and keep showing it across range changes.
  const [knownStaff, setKnownStaff] = useState<{ id: string; name: string } | null>(null);
  // Report entries are cached per slug, so opening a second staff member
  // shows the first one's rows until the new request lands. Every row names
  // its own staff, so anything that is not this person is treated as stale.
  const { staffName: staffNameParam } = useLocalSearchParams<{ staffName?: string }>();
  const rowStaffId = String(rows[0]?.staffId ?? rows[0]?.staff_id ?? "").trim();
  const staleStaffData = staffDetail && rows.length > 0 && rowStaffId !== staffId;
  const rowStaffName =
    staffDetail && !staleStaffData
      ? String(rows[0]?.staffName ?? "").trim()
      : "";
  useEffect(() => {
    if (!staffId || !rowStaffName) return;
    setKnownStaff((current) =>
      current && current.id === staffId && current.name === rowStaffName
        ? current
        : { id: staffId, name: rowStaffName },
    );
  }, [staffId, rowStaffName]);
  const staffName =
    rowStaffName ||
    (knownStaff && knownStaff.id === staffId ? knownStaff.name : "") ||
    (typeof staffNameParam === "string" ? staffNameParam.trim() : "");
  // Neither figure is in the staff-performance report: new clients comes from
  // Customer Frequency (which accepts staff_ids) and the unsettled commission
  // from the payouts endpoint, so it drops to zero once it has been settled.
  const [extras, setExtras] = useState<{ newClients: number | null; pending: number | null }>({
    newClients: null,
    pending: null,
  });
  const rangeStartKey = dateKeys ? filters[dateKeys.start] : undefined;
  const rangeEndKey = dateKeys?.end ? filters[dateKeys.end] : undefined;
  useEffect(() => {
    if (!staffDetail) return;
    const start = typeof rangeStartKey === "string" ? rangeStartKey : "";
    const end = typeof rangeEndKey === "string" ? rangeEndKey : "";
    if (!start || !end || !staffId) return;
    let active = true;
    setExtras({ newClients: null, pending: null });

    void reportService
      .getReport(REPORT.CUSTOMER_FREQUENCY, {
        start_date: start,
        end_date: end,
        staff_ids: [staffId],
        page: 1,
        limit: 1,
      })
      .then((response) => {
        const stats = (response.stats ?? {}) as Record<string, unknown>;
        const value = Number(stats.newClients);
        if (active && Number.isFinite(value)) {
          setExtras((current) => ({ ...current, newClients: value }));
        }
      })
      .catch(() => {});

    void salonCommissionsService
      .getEarned({ start_date: start, end_date: end })
      .then((entries: SalonEarnedEntry[]) => {
        const match = entries.find((entry: SalonEarnedEntry) => entry.staffId === staffId || entry.id === staffId);
        if (active) setExtras((current) => ({ ...current, pending: match?.pendingAmount ?? 0 }));
      })
      .catch(() => {});

    return () => { active = false; };
  }, [staffDetail, staffId, rangeStartKey, rangeEndKey]);

  const staffCards = [
    { key: "totalBill", label: "Total bill" },
    { key: "totalRevenue", label: "Total revenue" },
    { key: "productRevenue", label: "Product revenue" },
    { key: "packageRevenue", label: "Package revenue" },
    { key: "membershipRevenue", label: "Membership revenue" },
    { key: "totalCommission", label: "Total commission" },
    { key: "newClients", label: "New clients" },
    { key: "pendingCommission", label: "Commission pending" },
  ];
  const exportCsv = async (visibleColumns: ReportColumn[]) => {
    if (exporting) return;
    setExporting(true);
    try { await exportReportCsv(config, filters, visibleColumns, rows); }
    catch { Alert.alert("Export failed", "Could not export this report. Please try again."); }
    finally { setExporting(false); }
  };

  return <PearlBackground><SafeAreaView edges={["top"]} style={styles.safe}><AppStatusBar />
    <RefreshViewport><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl colors={[Colors.primary]} refreshing={Boolean(entry?.refreshing)} onRefresh={refresh} />}>
      <View style={styles.header}><AppBackButton onPress={() => router.back()} /><View style={styles.headerCopy}>{staffDetail ? <><Text translate style={styles.eyebrow}>Staff performance</Text><Text style={styles.staffName} numberOfLines={1}>{staffName || config.title}</Text></> : <><Text translate style={styles.title}>{config.title}</Text><Text style={styles.subtitle}>{config.group}</Text></>}</View></View>
      <View style={styles.filterRow}>
        {dateKeys ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Report date range" onPress={() => setRangeSheetVisible(true)} style={[styles.control, { flex: 1 }]}><Ionicons name="calendar-outline" size={17} color={pearl.accentDeep} /><Text style={[styles.controlText, { flex: 1 }]}>{dateRangeLabel}</Text><Ionicons name="chevron-down" size={15} color={pearl.accentDeep} /></TouchableOpacity> : null}
        {((REPORT_FILTER_FIELDS[config.slug]?.length ?? 0) > 0) ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={'Filters, ' + activeFilterCount + ' active'} onPress={() => setFilterSheetVisible(true)} style={styles.control}><Ionicons name="funnel-outline" size={16} color={pearl.accentDeep} /><Text style={styles.controlText}>Filters{activeFilterCount ? ' · ' + activeFilterCount : ''}</Text></TouchableOpacity> : null}
      </View>
      {staffDetail ? null : <ReportSummaryCards summary={moreTotals ? summary : primarySummary} maxCards={moreTotals ? Number.MAX_SAFE_INTEGER : 2} labels={moreTotals ? undefined : { totalSale: "Total sales", outstandingAmount: "Outstanding", totalCommission: "Commission earned" }} />}
      {!staffDetail && summary && Object.keys(summary).length > 2 ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: moreTotals }} onPress={() => setMoreTotals((value) => !value)} style={styles.control}><Ionicons name="stats-chart-outline" size={17} color={pearl.accentDeep} /><Text translate style={[styles.controlText, { flex: 1 }]}>{moreTotals ? "Fewer totals" : "More totals"}</Text><Ionicons name={moreTotals ? "chevron-up" : "chevron-down"} size={16} color={pearl.muted} /></TouchableOpacity> : null}
      {supportsSearch && !staffDetail ? <View style={styles.search}><Ionicons name="search-outline" size={18} color={pearl.muted} /><TextInput accessibilityLabel={'Search ' + config.title} placeholder={config.searchPlaceholder ?? 'Search ' + config.title.toLowerCase()} placeholderTextColor={pearl.muted} value={search} onChangeText={setSearch} underlineColorAndroid="transparent" style={styles.input} />{search ? <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={pearl.muted} /></TouchableOpacity> : null}</View> : null}
      {(entry?.loading && !entry.data) || staleStaffData ? <ReportSkeleton /> : entry?.error ? <ReportState error title="Report unavailable" description="We couldn’t load this report. Check your connection and try again." onRetry={refresh} /> : staffDetail ? (summary ? <View style={styles.statGrid}>{staffCards.map((card) => <View key={card.key} style={styles.statCard}><Text translate style={styles.statLabel}>{card.label}</Text><Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{staffCardValue(card.key, summary as Record<string, unknown>, extras)}</Text></View>)}</View> : <ReportState title={config.emptyMessage} description="Adjust the filters or refresh to check again." onRetry={refresh} />) : rows.length ?
        <ReportTable queryKey={JSON.stringify({ ...filters, page: undefined })} onRequestAllRows={() => loadCompleteReport(config, filters, rows)} onSortError={() => Alert.alert("Sort unavailable", "Could not load the full report for sorting. Please try again.")} title={config.title} rows={rows} columns={columns} total={pagination?.total ?? rows.length} hasMore={hasMore} loadingMore={Boolean(entry?.loadingMore)} onLoadMore={loadMore} onRowPress={handleRowPress} onExport={(visibleColumns) => void exportCsv(visibleColumns)} exporting={exporting} /> :
        <ReportState title={config.emptyMessage} description="Adjust the filters or refresh to check again." onRetry={refresh} />}
    </ScrollView></RefreshViewport>
    <ReportFilterSheet slug={config.slug} data={entry?.data} filters={filters} onApply={applyFilters} onClose={() => setFilterSheetVisible(false)} visible={filterSheetVisible} />
    {dateKeys ? <DateRangePickerSheet pearlStyle centered={false} allowAllTime={dateKeys.mode === "range"} mode={dateKeys.mode} startDate={filters[dateKeys.start] ?? null} endDate={dateKeys.end ? filters[dateKeys.end] ?? null : null} onApply={applyRange} onClose={() => setRangeSheetVisible(false)} visible={rangeSheetVisible} /> : null}
    <SalesSummaryDetailSheet saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />
    <BottomSheet pearlStyle centered={false} title="Report details" visible={Boolean(selectedRow)} onClose={() => setSelectedRow(null)}>{selectedRow ? columns.map((column) => <View key={column.key} style={styles.detailRow}><Text style={styles.subtitle}>{column.label || humanizeReportKey(column.key)}</Text><Text selectable style={styles.value}>{reportCellValue(column.key, selectedRow[column.key])}</Text></View>) : null}</BottomSheet>
  </SafeAreaView></PearlBackground>;
}
/** Most cards read the report's own totals; two come from separate calls. */
const staffCardValue = (
  key: string,
  summary: Record<string, unknown>,
  extras: { newClients: number | null; pending: number | null },
) => {
  if (key === "newClients") return extras.newClients === null ? "\u2014" : String(extras.newClients);
  if (key === "pendingCommission") return extras.pending === null ? "\u2014" : reportCellValue("totalCommission", extras.pending);
  return reportCellValue(key, summary[key]);
};

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1 }, content: { padding: 16, paddingBottom: 100, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 }, headerCopy: { flex: 1, gap: 3 },
  title: { fontSize: 22, fontWeight: "700", color: pearl.ink }, subtitle: { color: pearl.muted, fontSize: 12 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: pearl.accentDeep },
  staffName: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, color: pearl.ink },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flexBasis: "47%", flexGrow: 1, minWidth: 150, borderRadius: 22, padding: 18, paddingBottom: 20, gap: 12, backgroundColor: "rgba(255,255,255,0.62)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  statLabel: { fontSize: 12.5, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase", color: pearl.ink2 },
  statValue: { fontSize: 20, lineHeight: 26, fontWeight: "800", letterSpacing: -0.3, color: pearl.ink },
  filterRow: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  control: { flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "#DDD9EB", backgroundColor: pearl.glass },
  controlText: { color: pearl.accentDeep, fontSize: 12, fontWeight: "600" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "#DDD9EB", backgroundColor: pearl.glass },
  input: { flex: 1, fontSize: 13, color: pearl.ink, backgroundColor: "transparent", paddingVertical: 12 },
  detailRow: { paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", gap: 20, borderBottomWidth: 1, borderBottomColor: pearl.divider }, value: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "600", color: pearl.ink },
});
