import { useRegionalPreferences } from "@/localization/preferences";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, BackHandler, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { Portal } from "@/components/ui/Portal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import type { ReportRow } from "../report-data";
import { reportCellValue, type ReportColumn } from "../report-table-data";

const PAGE_SIZE = 10;
const clamp = (width: number) => Math.max(90, Math.min(420, Math.round(width)));

export function ResizeGrip({ width, label, onChange }: { width: number; label: string; onChange: (width: number) => void }) {
  const current = useRef({ width, onChange });
  current.current = { width, onChange };
  const start = useRef(width);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = current.current.width; },
    onPanResponderMove: (_, gesture) => current.current.onChange(clamp(start.current + gesture.dx)),
  }), []);
  return <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`Resize ${label}`}
    accessibilityValue={{ min: 90, max: 420, now: width }} accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
    onAccessibilityAction={(event) => onChange(clamp(width + (event.nativeEvent.actionName === "increment" ? 20 : -20)))} style={s.grip}><View style={s.gripLine} /></View>;
}

export function ReportTable({ title, rows: incomingRows, columns, total, hasMore: moreAvailable, loadingMore, onLoadMore, onRowPress, onExport, exporting = false, queryKey, onRequestAllRows, onSortError }: {
  queryKey?: string; onRequestAllRows?: () => Promise<ReportRow[]>; onSortError?: () => void;
  title: string; rows: ReportRow[]; columns: ReportColumn[]; total: number; hasMore?: boolean; loadingMore?: boolean;
  onLoadMore?: () => void; onRowPress: (row: ReportRow) => void;
  onExport?: (columns: ReportColumn[]) => void; exporting?: boolean;
}) {
  "use no memo";
  useRegionalPreferences();
  const [allRows, setAllRows] = useState<ReportRow[] | null>(null);
  const [sortingBusy, setSortingBusy] = useState(false);
  const sortGeneration = useRef(0);
  const rows = allRows ?? incomingRows;
  const hasMore = allRows ? false : moreAvailable;
  const [hidden, setHidden] = useState<string[]>([]);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [choosingColumns, setChoosingColumns] = useState(false);
  const [sort, setSort] = useState<{ key: string; direction: number } | null>(null);
  const [page, setPage] = useState(0);
  const [waitingPage, setWaitingPage] = useState<number | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const x = useRef(new Animated.Value(0)).current;
  const vertical = useRef<ScrollView>(null);
  const horizontal = useRef<ScrollView>(null);
  useEffect(() => { x.setValue(0); horizontal.current?.scrollTo({ x: 0, animated: false }); }, [expanded, hidden, x]);
  useEffect(() => {
    if (!expanded) return;
    const back = BackHandler.addEventListener("hardwareBackPress", () => { if (choosingColumns) return false; setExpanded(false); return true; });
    return () => back.remove();
  }, [expanded, choosingColumns]);
  const ordered = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const left = a[sort.key], right = b[sort.key];
      const numeric = left !== "" && right !== "" && left != null && right != null && Number.isFinite(Number(left)) && Number.isFinite(Number(right));
      return sort.direction * (numeric ? Number(left) - Number(right) : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true }));
    });
  }, [rows, sort]);
  const firstRow = incomingRows[0];
  useEffect(() => { sortGeneration.current += 1; setPage(0); setWaitingPage(null); setAllRows(null); setSort(null); setSortingBusy(false); }, [firstRow, queryKey]);
  useEffect(() => {
    if (waitingPage !== null && waitingPage * PAGE_SIZE < ordered.length) { setPage(waitingPage); setWaitingPage(null); }
    else if (waitingPage !== null && !loadingMore) setWaitingPage(null);
  }, [loadingMore, ordered.length, waitingPage]);
  const visible = columns.filter((column, index) => index === 0 || !hidden.includes(column.key));
  const first = visible[0];
  const rest = visible.slice(1);
  const width = (column: ReportColumn) => Math.min(widths[column.key] ?? (/invoice|date/i.test(column.key) ? 130 : /name|description|item/i.test(column.key) ? 170 : 140), column.key === visible[0]?.key ? Math.max(90, Math.min(240, (screenWidth - 32) * 0.5)) : 420);
  const pageRows = ordered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const rowHeight = compact ? 40 : 56;
  const setColumnWidth = (key: string, value: number) => setWidths((current) => ({ ...current, [key]: value }));
  const sortBy = async (column: ReportColumn) => {
    if (sortingBusy) return;
    const next = { key: column.key, direction: sort?.key === column.key ? -sort.direction : 1 };
    if (hasMore && onRequestAllRows) {
      const generation = sortGeneration.current;
      setSortingBusy(true);
      try {
        const complete = await onRequestAllRows();
        if (generation !== sortGeneration.current) return;
        setAllRows(complete); setSort(next); setPage(0);
      } catch { if (generation === sortGeneration.current) onSortError?.(); }
      finally { if (generation === sortGeneration.current) setSortingBusy(false); }
    } else { setSort(next); setPage(0); }
    vertical.current?.scrollTo({ y: 0 });
  };
  const header = (column: ReportColumn) => <View key={column.key} style={[s.headerCell, { width: width(column) }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Sort by ${column.label}`} disabled={sortingBusy} onPress={() => void sortBy(column)} style={s.headerButton}>
      <Text translate numberOfLines={1} style={s.headerText}>{column.label} {sort?.key === column.key ? sort.direction === 1 ? "↑" : "↓" : "↕"}</Text>
    </Pressable><ResizeGrip width={width(column)} label={column.label} onChange={(value) => setColumnWidth(column.key, value)} />
  </View>;
  const statusColor = (value: unknown) => {
    const status = String(value ?? "").toLowerCase();
    return ["paid", "completed", "active", "present", "sent", "delivered", "read"].includes(status) ? "#218160"
      : ["partial", "pending", "booked", "scheduled", "unpaid"].includes(status) ? "#9C6B18"
      : ["cancelled", "failed", "expired", "blocked", "absent", "refunded"].includes(status) ? "#A8384A" : pearl.ink;
  };
  const cell = (column: ReportColumn, row: ReportRow, index: number, frozen = false) => <Pressable key={column.key} accessibilityRole="button" accessibilityLabel={`${column.label}: ${reportCellValue(column.key, row[column.key])}. Open row details.`} onPress={() => onRowPress(row)} style={[s.cell, { width: width(column), height: rowHeight }, frozen && s.frozenCell, index % 2 === 1 && s.alternate]}>
    <Text selectable={false} numberOfLines={1} style={[s.cellText, frozen && s.firstText, /status/i.test(column.key) && [s.status, { color: statusColor(row[column.key]) }]]}>{reportCellValue(column.key, row[column.key])}</Text>
  </Pressable>;
  const controls = <View style={s.toolbar}>
    <Pressable accessibilityRole="button" onPress={() => setChoosingColumns(true)} style={s.control}><Ionicons name="options-outline" size={16} color={pearl.accentDeep} /><Text translate style={s.controlText}>Columns</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{ selected: compact }} onPress={() => setCompact((value) => !value)} style={s.control}><Text translate style={s.controlText}>{compact ? "Comfortable rows" : "Compact rows"}</Text></Pressable>
    {onExport ? <Pressable accessibilityRole="button" disabled={exporting} onPress={() => onExport(visible)} style={s.control}><Ionicons name="download-outline" size={15} color={pearl.accentDeep} /><Text translate style={s.controlText}>{exporting ? "Exporting…" : "CSV"}</Text></Pressable> : null}
    <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)} style={s.control}><Ionicons name={expanded ? "contract-outline" : "expand-outline"} size={16} color={pearl.accentDeep} /><Text translate style={s.controlText}>{expanded ? "Close" : "Expand"}</Text></Pressable>
  </View>;
  const grid = first ? <View style={s.grid}>
    <View style={s.headerRow}><View style={s.frozenHeader}>{header(first)}</View><View style={s.clip}><Animated.View style={[s.headerRow, { width: rest.reduce((sum, column) => sum + width(column), 0), transform: [{ translateX: Animated.multiply(x, -1) }] }]}>{rest.map(header)}</Animated.View></View></View>
    <ScrollView ref={vertical} scrollEnabled={false} style={{ height: pageRows.length * rowHeight }}>
      <View style={s.bodyRow}>
        <View>{pageRows.map((row, index) => <View key={index}>{cell(first, row, index, true)}</View>)}</View>
        <Animated.ScrollView ref={horizontal} horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true })} style={s.clip}>
          <View>{pageRows.map((row, index) => <View key={index} style={s.bodyRow}>{rest.map((column) => cell(column, row, index))}</View>)}</View>
        </Animated.ScrollView>
      </View>
    </ScrollView>
  </View> : null;
  const footer = <View style={s.pager}><Text style={s.hint}>{ordered.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, ordered.length)} of ${allRows ? allRows.length : total || ordered.length}` : "0 records"}</Text><View style={s.toolbar}>
    <Pressable accessibilityRole="button" accessibilityLabel="Previous page" disabled={page === 0} onPress={() => { setPage((value) => value - 1); vertical.current?.scrollTo({ y: 0 }); }} style={[s.control, page === 0 && s.disabled]}><Ionicons name="arrow-back" size={18} color={pearl.accentDeep} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Next page" disabled={sortingBusy || loadingMore || ((page + 1) * PAGE_SIZE >= ordered.length && !hasMore)} onPress={() => { const next = page + 1; if ((next + 1) * PAGE_SIZE > ordered.length && hasMore) { setWaitingPage(next); onLoadMore?.(); } else setPage(next); vertical.current?.scrollTo({ y: 0 }); }} style={[s.control, loadingMore && s.disabled]}><Ionicons name="arrow-forward" size={18} color={pearl.accentDeep} /></Pressable>
  </View></View>;
  const content = <View style={[s.content, expanded && { paddingHorizontal: 16 }]}>{controls}{sortingBusy ? <Text translate accessibilityLiveRegion="polite" style={s.hint}>Loading the full report for sorting…</Text> : null}<Text translate style={s.hint}>Swipe sideways for more columns. Drag header edges to resize.{"\n"}Tap a heading to sort, or a row to see details.</Text>{grid}{footer}</View>;
  return <>
    {!expanded ? content : null}
    {expanded ? <Portal><View style={StyleSheet.absoluteFill}><PearlBackground><SafeAreaView style={{ flex: 1 }}><View style={s.expandedHeader}><AppBackButton onPress={() => setExpanded(false)} /><Text translate style={s.title}>{title}</Text></View><ScrollView contentContainerStyle={{ paddingBottom: 24 }}>{content}</ScrollView></SafeAreaView></PearlBackground></View></Portal> : null}
    <BottomSheet pearlStyle centered={false} title="Columns" visible={choosingColumns} onClose={() => setChoosingColumns(false)}>
      {columns.map((column, index) => <Pressable key={column.key} accessibilityRole="checkbox" accessibilityState={{ checked: index === 0 || !hidden.includes(column.key), disabled: index === 0 }} disabled={index === 0} onPress={() => setHidden((current) => current.includes(column.key) ? current.filter((key) => key !== column.key) : [...current, column.key])} style={s.columnChoice}><Ionicons name={index === 0 || !hidden.includes(column.key) ? "checkbox" : "square-outline"} size={22} color={pearl.accent} /><Text translate style={s.cellText}>{column.label}{index === 0 ? " · fixed" : ""}</Text></Pressable>)}
    </BottomSheet>
  </>;
}

const s = StyleSheet.create({
  content: { gap: 12 }, toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  control: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 38, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: "#DDD9EB", backgroundColor: "#FFFFFF" },
  controlText: { color: "#514A71", fontSize: 12, fontWeight: "600" }, hint: { fontSize: 11, color: "#867E99", lineHeight: 17 },
  grid: { borderWidth: 1, borderColor: "#E2DDEC", borderRadius: 15, overflow: "hidden", backgroundColor: "#FFFFFF" },
  headerRow: { flexDirection: "row", height: 44, backgroundColor: "#F0EDF7" },
  headerCell: { height: 44, justifyContent: "center", backgroundColor: "#F0EDF7", paddingHorizontal: 12, paddingRight: 20 },
  headerButton: { flex: 1, justifyContent: "center" }, headerText: { color: "#6C6284", fontSize: 11, fontWeight: "700" },
  grip: { position: "absolute", right: 0, top: 0, bottom: 0, width: 18, alignItems: "flex-end", justifyContent: "center" }, gripLine: { width: 2, height: 24, backgroundColor: "#C8BDDB" },
  clip: { flex: 1, overflow: "hidden" }, frozenHeader: { zIndex: 2, borderRightWidth: 1, borderRightColor: "#E6DFEF" },
  bodyRow: { flexDirection: "row" }, cell: { justifyContent: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#EEEBF4", backgroundColor: "#FFFFFF" },
  cellText: { color: pearl.ink, fontSize: 12 }, frozenCell: { backgroundColor: "#FAF8FF", borderRightWidth: 1, borderRightColor: "#E6DFEF" }, alternate: { backgroundColor: "#FCFAFF" },
  firstText: { color: pearl.accentDeep, fontWeight: "700" }, status: { color: "#218160", fontWeight: "600" },
  pager: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, disabled: { opacity: 0.35 },
  columnChoice: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  expandedHeader: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }, title: { flex: 1, fontSize: 18, color: pearl.ink, fontWeight: "700" },
});
