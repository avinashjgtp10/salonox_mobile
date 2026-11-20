import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { COUNTRIES, countrySearchAliases, getCountryDef, timezoneForCountry } from "@/config/countries";
import { SUPPORTED_CURRENCIES, getCurrencyDef } from "@/config/currencies";
import { LANGUAGES, languageLabel, normalizeLanguage } from "@/config/languages";
import { REGION_TIMEZONES } from "@/config/regionTimezones";
import { useAppForeground } from "@/hooks/useAppForeground";
import { updateSalonThunk } from "@/middleware/salon/salon.thunk";
import { salonService } from "@/services/salon.service";
import { getApiErrorMessage } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { salonReceived, selectSalonById } from "@/store/salon/salon.slice";
import { hasCustomPermission } from "@/utils/permissions";
import { canSettleCommission } from "@/utils/userProfile";
import type { SalonListItem, UpdateSalonFormFields } from "@/types/salon";
import { SettingsButton, SettingsHeader, useSettingsStyles } from "./SettingsUI";

const FIELDS = ["country", "currency", "timezone", "language"] as const;
type Field = (typeof FIELDS)[number];
type Values = Record<Field, string>;
const LABELS: Record<Field, string> = {
  country: "Country", currency: "Currency", timezone: "Timezone", language: "Country Language",
};
const toValues = (salon?: SalonListItem): Values => {
  const country = salon?.country || salon?.countryCode || "IN";
  return {
    country: COUNTRIES.find(item => item.code === country.toUpperCase() || item.name.toLowerCase() === country.toLowerCase())?.code ?? country,
    currency: getCurrencyDef(salon?.currency).code,
    timezone: salon?.timezone || "Asia/Kolkata",
    language: normalizeLanguage(salon?.language),
  };
};

export default function RegionSettingsScreen() {
  const user = useAppSelector(selectCurrentUser);
  return <RegionSettings key={`${user?.id}:${user?.salonId}`} />;
}

function RegionSettings() {
  const ui = useSettingsStyles();
  const pearl = usePearlPalette();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const salon = useAppSelector(state => selectSalonById(state, user?.salonId));
  const canEdit = canSettleCommission(user?.role);
  const canView = canEdit || hasCustomPermission(user, "view_settings_currency");
  const [values, setValues] = useState(() => toValues(salon));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [picker, setPicker] = useState<Field | null>(null);
  const [query, setQuery] = useState("");
  const changed = useRef(new Set<Field>());
  const saveLock = useRef(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!canView || !user?.salonId) return;
    const request = ++generation.current;
    setLoading(true);
    try {
      const updated = await salonService.getSalonMe({ refresh: true });
      if (request !== generation.current) return;
      if (updated.id !== user.salonId) throw new Error("The selected salon has changed. Reopen Region settings.");
      dispatch(salonReceived(updated));
      setError("");
    } catch (err) {
      if (request === generation.current) setError(getApiErrorMessage(err));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [canView, dispatch, user?.salonId]);
  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]));
  useAppForeground(() => { void refresh(); });
  useEffect(() => {
    if (!editing) setValues(toValues(salon));
  }, [salon, editing]);

  const save = async () => {
    if (!salon || !canEdit || saveLock.current) return;
    if (!changed.current.size) { setEditing(false); return; }
    if (!getCountryDef(values.country) || !SUPPORTED_CURRENCIES.some(item => item.code === values.currency) || !LANGUAGES.some(item => item.code === values.language)) {
      setError("Select a valid country, currency and language.");
      return;
    }
    try { new Intl.DateTimeFormat("en", { timeZone: values.timezone }); }
    catch { setError("Select a valid timezone."); return; }
    saveLock.current = true;
    setSaving(true);
    setError("");
    setSuccess(false);
    const formFields: UpdateSalonFormFields = {};
    changed.current.forEach(field => { formFields[field] = values[field]; });
    try {
      await dispatch(updateSalonThunk({ salonId: salon.id, formFields })).unwrap();
      changed.current.clear();
      setEditing(false);
      setSuccess(true);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { saveLock.current = false; setSaving(false); }
  };
  const select = (code: string) => {
    if (!picker || !editing || saving || !canEdit) return;
    changed.current.add(picker);
    const next = { ...values, [picker]: code };
    if (picker === "country") {
      next.currency = getCountryDef(code)?.currency ?? values.currency;
      changed.current.add("currency");
      const timezone = timezoneForCountry(code);
      if (timezone) { next.timezone = timezone; changed.current.add("timezone"); }
    }
    setValues(next);
    setSuccess(false);
    setError("");
    setPicker(null);
  };
  const choices = picker === "country"
    ? COUNTRIES.map(item => ({ code: item.code, label: item.name, aliases: countrySearchAliases(item.code) }))
    : picker === "currency"
      ? SUPPORTED_CURRENCIES.map(item => ({ code: item.code, label: `${item.label} (${item.symbol.trim()}) — ${item.code}` }))
      : picker === "language"
        ? LANGUAGES.map(item => ({ code: item.code, label: languageLabel(item) }))
        : [...new Set([values.timezone, ...REGION_TIMEZONES])].map(code => ({ code, label: code }));
  const display: Values = {
    country: getCountryDef(values.country)?.name ?? values.country,
    currency: `${getCurrencyDef(values.currency).label} (${getCurrencyDef(values.currency).symbol.trim()}) — ${values.currency}`,
    timezone: values.timezone,
    language: (() => { const match = LANGUAGES.find(item => item.code === values.language); return match ? languageLabel(match) : values.language; })(),
  };
  return (
    <PearlBackground>
      <SafeAreaView edges={["top", "bottom"]} style={ui.root}>
        <AppStatusBar />
        <SettingsHeader title="Region" subtitle="Country, currency, timezone & language" />
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}>
          {!canView ? <Text translate style={ui.muted}>You do not have permission to view region settings.</Text> : <>
            <View style={ui.formCard}>
              <Text translate style={ui.title}>Region & Currency</Text>
              <Text translate style={ui.muted}>Selecting a country fills its currency automatically. You can change the currency independently afterward.</Text>
              {FIELDS.map(field => <View key={field} style={{ gap: 7 }}>
                <Text translate style={ui.body}>{LABELS[field]}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={LABELS[field]}
                  disabled={!editing || saving || !salon || !canEdit}
                  onPress={() => { setQuery(""); setPicker(field); }}
                  style={[ui.input, { flexDirection: "row", alignItems: "center", gap: 10, opacity: editing ? 1 : 0.7 }]}>
                  <Text style={[ui.title, { flex: 1, fontWeight: "500" }]}>{salon ? display[field] : "—"}</Text>
                  <Ionicons name="chevron-down" size={16} color={pearl.muted} />
                </TouchableOpacity>
              </View>)}
              <Text translate style={ui.muted}>Customer language is used for receipts, the booking page and messages.</Text>
              {!canEdit ? <Text translate style={ui.muted}>Only the salon owner or an administrator can update region settings.</Text> : null}
            </View>
            {success ? <Text translate accessibilityLiveRegion="polite" style={ui.body}>Region settings saved successfully.</Text> : null}
            {error ? <View style={{ gap: 10 }}><Text accessibilityRole="alert" style={ui.error}>{error}</Text><SettingsButton secondary label="Refresh" disabled={loading || saving} onPress={() => void refresh()} /></View> : null}
            {canEdit && salon ? editing ? <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><SettingsButton secondary label="Cancel" disabled={saving} onPress={() => { changed.current.clear(); setEditing(false); setPicker(null); setError(""); }} /></View>
              <View style={{ flex: 1 }}><SettingsButton label="Save changes" loading={saving} onPress={() => void save()} /></View>
            </View> : <SettingsButton label="Edit" disabled={loading} onPress={() => { changed.current.clear(); setEditing(true); setSuccess(false); setError(""); }} /> : null}
          </>}
        </ScrollView>
        <BottomSheet visible={picker !== null} title={picker ? LABELS[picker] : "Region"} onClose={() => setPicker(null)} pearlStyle avoidKeyboard scrollable={false}>
          <View style={{ gap: 12, flexShrink: 1 }}>
            <TextInput accessibilityLabel="Search region options" value={query} onChangeText={setQuery} placeholder="Search" style={ui.input} />
            <FlatList key={picker} style={{ maxHeight: 350, flexShrink: 1 }} keyboardShouldPersistTaps="handled"
              data={choices.filter(item => `${item.code} ${item.label} ${"aliases" in item ? item.aliases : ""}`.toLowerCase().includes(query.trim().toLowerCase()))}
              keyExtractor={item => item.code} ListEmptyComponent={<Text translate style={ui.muted}>No results found</Text>}
              renderItem={({ item }) => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: picker ? values[picker] === item.code : false }} onPress={() => select(item.code)} style={ui.row}>
                <Text style={[ui.title, { flex: 1 }]}>{item.label}</Text>
                {picker && values[picker] === item.code ? <Ionicons name="checkmark" size={20} color={pearl.accentDeep} /> : null}
              </TouchableOpacity>} />
          </View>
        </BottomSheet>
      </SafeAreaView>
    </PearlBackground>
  );
}
