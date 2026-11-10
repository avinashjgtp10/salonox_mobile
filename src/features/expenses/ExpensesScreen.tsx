import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { Page, PageHeader } from "@/components/pearl/Page";
import { Icon } from "@/components/pearl/Icon";
import { EmptyState, SmallButton, Skeleton, StatusPill } from "@/components/pearl/ui";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { appAlert } from "@/services/appAlert";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { expensesService, type Expense } from "@/services/expenses.service";
import { canAccessBusinessModule } from "@/utils/staffExperience";
import { formatCurrency } from "@/utils/currency";
import { formatAppDate } from "@/utils/dateTime";
import { dateRangeLabel, getDateRangePreset } from "@/utils/dateRangePresets";
import { EXPENSE_TYPES, expenseAmount, expenseDateKey, filterExpenses } from "./expenseFilters";

export function ExpensesScreen({ openNew = false }: { openNew?: boolean }) {
  const { user } = useAuth();
  const p = usePearlPalette();
  const styles = useMemo(() => createStyles(p), [p]);
  const canView = canAccessBusinessModule(user, "view_cash_management");
  const canAdd = canAccessBusinessModule(user, "add_expense");
  const canEdit = canAccessBusinessModule(user, "edit_expense");
  const canDelete = canAccessBusinessModule(user, "delete_expense");
  const [rows, setRows] = useState<Expense[]>([]);
  const [counterId, setCounterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [locked, setLocked] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const initialRange = useMemo(() => getDateRangePreset("this_month"), []);
  const [start, setStart] = useState<string | null>(initialRange.startDate);
  const [end, setEnd] = useState<string | null>(initialRange.endDate);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [formOpen, setFormOpen] = useState(openNew && canAdd);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [type, setType] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(expenseDateKey(new Date().toISOString()));
  const [dateOpen, setDateOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const mutationInFlight = useRef(false);
  const requestId = useRef(0);
  const alive = useRef(true);

  const load = useCallback(async (refresh = false) => {
    if (!canView) { setLoading(false); return; }
    const id = ++requestId.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [expenses, activeCounter] = await Promise.all([
        expensesService.list(), canAdd ? expensesService.openCounterId() : Promise.resolve(null),
      ]);
      if (!alive.current || id !== requestId.current) return;
      setRows(expenses); setCounterId(activeCounter); setLocked(false); setLoadError("");
    } catch (error) {
      if (!alive.current || id !== requestId.current) return;
      const response = error instanceof ApiError ? error.responseData as { error?: { code?: string } } | undefined : undefined;
      const moduleLocked = response?.error?.code === "MODULE_LOCKED";
      setLocked(moduleLocked); setLoadError(getApiErrorMessage(error));
      if (moduleLocked) { setRows([]); setFormOpen(false); }
    } finally {
      if (alive.current && id === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [canAdd, canView]);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => { alive.current = false; requestId.current += 1; };
  }, [load]);

  useEffect(() => { setVisibleCount(20); }, [search, typeFilter, start, end]);
  const filtered = useMemo(() => filterExpenses(rows, search, typeFilter, start, end), [rows, search, typeFilter, start, end]);
  const total = filtered.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;
  const categories = useMemo(() => Array.from(new Set(rows.map(row => row.type))).sort(), [rows]);
  const categoryOptions = useMemo(() => Array.from(new Set([...EXPENSE_TYPES, ...categories])), [categories]);

  const edit = (expense: Expense | null) => {
    setEditing(expense); setType(expense?.type ?? ""); setAmount(expense ? String(expense.amount) : "");
    setDescription(expense?.description ?? ""); setDate(expense ? expenseDateKey(expense.date) : expenseDateKey(new Date().toISOString()));
    setFormError(""); setFormOpen(true);
  };
  const closeForm = () => { if (!mutationInFlight.current) { setFormOpen(false); setDateOpen(false); } };
  const save = async () => {
    if (!alive.current || mutationInFlight.current) return;
    const parsedAmount = expenseAmount(amount);
    if (!type.trim()) { setFormError("Enter an expense category."); return; }
    if (parsedAmount === null) { setFormError("Enter an amount greater than zero, with up to two decimal places."); return; }
    if (!date) { setFormError("Choose an expense date."); return; }
    if (!editing && !counterId) { setFormError("Open a cash counter from Cash Management on the web before adding an expense."); return; }
    mutationInFlight.current = true; setBusy(true); setFormError("");
    try {
      const input = { expense_type: type.trim(), description: description.trim(), amount: parsedAmount, expense_date: date };
      if (editing) await expensesService.update(editing.id, input);
      else await expensesService.create(counterId!, input);
      if (alive.current) { setFormOpen(false); await load(true); }
    } catch (error) {
      if (alive.current) setFormError(getApiErrorMessage(error));
    } finally { mutationInFlight.current = false; if (alive.current) setBusy(false); }
  };
  const remove = (expense: Expense) => {
    appAlert.alert("Delete expense?", `Delete ${expense.type} (${formatCurrency(expense.amount)})? This updates the cash counter balance.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { void (async () => {
        if (!alive.current || mutationInFlight.current) return;
        mutationInFlight.current = true; setBusy(true);
        try { await expensesService.remove(expense.id); if (alive.current) await load(true); }
        catch (error) { if (alive.current) appAlert.alert("Unable to delete expense", getApiErrorMessage(error)); }
        finally { mutationInFlight.current = false; if (alive.current) setBusy(false); }
      })(); } },
    ]);
  };

  return <>
    <Page refreshing={refreshing} onRefresh={() => void load(true)} header={
      <PageHeader title="Expenses" subtitle="Track your salon's spending" onBack={() => router.back()}
        right={canAdd && canView && !locked ? <SmallButton title="Add expense" icon="plus" primary disabled={busy || loading || !!loadError} onPress={() => edit(null)} /> : undefined} />
    }>
      {!canView ? <EmptyState icon="lock" title="Access restricted" body="You don't have permission to view expenses. Ask your salon owner for Cash Management access." />
      : locked ? <EmptyState icon="lock" title="Upgrade required" body="Your current plan doesn't include Expenses. Explore our plans to unlock this feature."
        action={<SmallButton title="Explore plans" icon="external" primary onPress={() => { void Linking.openURL("https://www.salonox.com/#pricing").catch(() => appAlert.alert("Unable to open pricing", "Visit www.salonox.com/#pricing in your browser.")); }} />} />
      : <>
        <View style={styles.summary}>
          <View style={styles.row}><View style={styles.tile}><Icon name="expense" size={24} color={p.accentDeep} /></View><Text translate style={styles.muted}>Total expenses</Text></View>
          <Text style={styles.total}>{formatCurrency(total)}</Text>
          <Text style={styles.muted}>{filtered.length} {filtered.length === 1 ? "expense" : "expenses"} · {dateRangeLabel(start, end)}</Text>
        </View>
        <View style={styles.search}>
          <Icon name="search" size={19} color={p.muted} />
          <TextInput accessibilityLabel="Search expenses" placeholder="Search expenses" value={search} onChangeText={setSearch} style={styles.searchInput} placeholderTextColor={p.placeholder} />
          {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch("")}><Icon name="x" size={18} color={p.muted} /></Pressable>}
        </View>
        <Pressable accessibilityRole="button" onPress={() => setRangeOpen(true)} style={styles.dateButton}>
          <Icon name="calendar" size={18} color={p.accentDeep} /><Text style={styles.link}>{dateRangeLabel(start, end)}</Text><Icon name="chevronDown" size={16} color={p.accentDeep} />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[null, ...categories].map(category => <Pressable key={category ?? "all"} accessibilityRole="button" accessibilityState={{ selected: typeFilter === category }}
            onPress={() => setTypeFilter(category)} style={[styles.chip, typeFilter === category && styles.chipActive]}>
            <Text style={[styles.chipText, typeFilter === category && { color: "#FFFFFF" }]}>{category ?? "All categories"}</Text>
          </Pressable>)}
        </ScrollView>
        {!!loadError ? <EmptyState icon="alert" title="Unable to load expenses" body={loadError} action={<SmallButton title="Try again" icon="repeat" onPress={() => void load()} />} />
        : loading ? <><Skeleton h={90} /><Skeleton h={90} /><Skeleton h={90} /></>
        : <>
          {canAdd && !counterId && <View style={styles.notice}><Icon name="info" size={20} color={p.accentDeep} /><Text style={[styles.muted, { flex: 1 }]}>To add an expense, open a cash counter from Cash Management on the web.</Text></View>}
          {!filtered.length ? <EmptyState icon="expense" title={rows.length ? "No matching expenses" : "No expenses yet"} body={rows.length ? "Try another search, category or date range." : "Record your salon's expenses to keep track of spending."} />
          : filtered.slice(0, visibleCount).map(expense => <View key={expense.id} style={styles.card}>
            <View style={styles.row}><View style={{ flex: 1, gap: 4 }}><Text style={styles.title}>{expense.type}</Text><Text style={styles.muted}>{formatAppDate(expense.date)}</Text></View><Text style={styles.amount}>{formatCurrency(expense.amount)}</Text></View>
            {!!expense.description && <Text style={styles.body}>{expense.description}</Text>}
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <StatusPill tone={expense.counterStatus === "open" ? "success" : "neutral"} label={expense.counterStatus === "open" ? "Open counter" : "Closed counter"} />
              {expense.counterStatus === "open" && <View style={styles.row}>
                {canEdit && <SmallButton title="Edit" icon="edit" disabled={busy} onPress={() => edit(expense)} />}
                {canDelete && <SmallButton title="Delete" icon="x" disabled={busy} onPress={() => remove(expense)} />}
              </View>}
            </View>
          </View>)}
          {filtered.length > visibleCount && <SmallButton title="Show more" onPress={() => setVisibleCount(count => count + 20)} />}
        </>}
      </>}
    </Page>
    <DateRangePickerSheet visible={rangeOpen} startDate={start} endDate={end} onClose={() => setRangeOpen(false)} pearlStyle allowAllTime
      onApply={(from, to) => { setStart(from); setEnd(to); setRangeOpen(false); }} />
    <BottomSheet visible={formOpen && canView && !locked} title={editing ? "Edit expense" : "Add expense"} onClose={closeForm} pearlStyle scrollable avoidKeyboard
      footer={<View style={[styles.row, { justifyContent: "flex-end" }]}><SmallButton title="Cancel" onPress={closeForm} disabled={busy} /><SmallButton title={busy ? "Saving…" : "Save expense"} primary onPress={() => void save()} disabled={busy || loading || (!editing && !counterId)} /></View>}>
      {!!loadError ? <Text accessibilityRole="alert" style={{ color: p.dangerText }}>{loadError}</Text>
        : !editing && !loading && !counterId && <Text style={styles.muted}>Open a cash counter from Cash Management on the web before adding an expense.</Text>}
      <Text translate style={styles.label}>Category *</Text>
      <TextInput accessibilityLabel="Expense category" placeholder="Choose or enter a category" value={type} onChangeText={setType} editable={!busy} style={styles.input} placeholderTextColor={p.placeholder} maxLength={100} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categoryOptions.map(category => <Pressable key={category} disabled={busy} accessibilityRole="button" onPress={() => setType(category)} style={[styles.chip, type === category && styles.chipActive]}><Text style={[styles.chipText, type === category && { color: "#FFFFFF" }]}>{category}</Text></Pressable>)}
      </ScrollView>
      <Text translate style={styles.label}>Amount *</Text>
      <TextInput accessibilityLabel="Expense amount" placeholder="0.00" value={amount} onChangeText={setAmount} editable={!busy} keyboardType="decimal-pad" style={styles.input} placeholderTextColor={p.placeholder} />
      <Text translate style={styles.label}>Date *</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Expense date" disabled={busy} onPress={() => setDateOpen(true)} style={styles.dateButton}><Icon name="calendar" size={18} color={p.accentDeep} /><Text style={styles.body}>{formatAppDate(date)}</Text></Pressable>
      <Text translate style={styles.label}>Description</Text>
      <TextInput accessibilityLabel="Expense description" placeholder="What was this expense for?" value={description} onChangeText={setDescription} editable={!busy} multiline maxLength={1000} style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]} placeholderTextColor={p.placeholder} />
      {!!formError && <Text accessibilityRole="alert" style={{ color: p.dangerText }}>{formError}</Text>}
    </BottomSheet>
    <DateRangePickerSheet visible={dateOpen} title="Expense date" mode="single" startDate={date} endDate={date} onClose={() => setDateOpen(false)} pearlStyle
      onApply={from => { if (from) setDate(from); setDateOpen(false); }} />
  </>;
}

const createStyles = (p: ReturnType<typeof usePearlPalette>) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  summary: { padding: 22, borderRadius: 26, backgroundColor: p.glass, borderWidth: 1, borderColor: p.glassBorder, gap: 12 },
  tile: { padding: 12, backgroundColor: p.accentWash, borderRadius: 16 },
  total: { fontSize: 32, fontWeight: "800", color: p.ink },
  title: { fontSize: 16, fontWeight: "800", color: p.ink },
  amount: { fontSize: 16, fontWeight: "800", color: p.accentDeep },
  muted: { fontSize: 13, lineHeight: 20, color: p.muted },
  body: { fontSize: 14, lineHeight: 21, color: p.ink },
  card: { borderRadius: 22, padding: 16, gap: 14, backgroundColor: p.glass, borderWidth: 1, borderColor: p.glassBorder },
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: p.field, borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: p.fieldBorder },
  searchInput: { flex: 1, minHeight: 50, color: p.ink, fontSize: 14 },
  dateButton: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: p.field, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.fieldBorder },
  link: { color: p.accentDeep, fontSize: 14, fontWeight: "700", flex: 1 },
  chips: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: p.glass, borderWidth: 1, borderColor: p.fieldBorder },
  chipActive: { backgroundColor: "#5D5890", borderColor: "#5D5890" },
  chipText: { color: p.accentDeep, fontSize: 12, fontWeight: "700" },
  notice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: p.accentWash },
  label: { fontSize: 13, fontWeight: "700", color: p.ink, marginTop: 10, marginBottom: 8 },
  input: { color: p.ink, fontSize: 15, minHeight: 50, padding: 14, borderWidth: 1, borderColor: p.fieldBorder, borderRadius: 16, backgroundColor: p.field },
});
