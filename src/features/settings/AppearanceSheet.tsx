import { useEffect, useRef, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { LANGUAGES, normalizeLanguage } from "@/config/languages";
import { getCurrencyDef, SUPPORTED_CURRENCIES } from "@/config/currencies";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectSalonById } from "@/store/salon/salon.slice";
import { updateSalonThunk } from "@/middleware/salon/salon.thunk";
import { getRegionalPreferences } from "@/localization/preferences";
import { getApiErrorMessage } from "@/services/api";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { useAppTheme, type ThemeMode } from "@/theme/ThemeProvider";
import { SettingsButton, useSettingsStyles } from "./SettingsUI";

const OPTIONS: {
  label: string;
  mode: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "Light", mode: "light", icon: "sunny-outline" },
  { label: "Dim", mode: "dark", icon: "moon-outline" },
  { label: "System", mode: "system", icon: "settings-outline" },
];
export function AppearanceSheet({
  onClose,
  renderInline = false,
}: {
  onClose: () => void;
  renderInline?: boolean;
}) {
  const ui = useSettingsStyles();
  const pearl = usePearlPalette();
  const { mode, setMode } = useAppTheme();
  const user = useAppSelector(selectCurrentUser);
  const salon = useAppSelector(state => selectSalonById(state, user?.salonId));
  const dispatch = useAppDispatch();
  const [language, setLanguage] = useState(normalizeLanguage(salon?.language ?? getRegionalPreferences().language));
  const [currency, setCurrency] = useState(getCurrencyDef(salon?.currency ?? getRegionalPreferences().currency).code);
  const [picker, setPicker] = useState<"language" | "currency" | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false), lock = useRef(false);
  const canEdit = user?.role === "salon_owner" || user?.role === "superadmin" || user?.role === "admin";
  useEffect(() => {
    if (dirty.current || !salon) return;
    setLanguage(normalizeLanguage(salon.language));
    setCurrency(getCurrencyDef(salon.currency).code);
  }, [salon]);
  const close = () => { if (!lock.current) onClose(); };
  const done = async () => {
    if (lock.current) return;
    if (!dirty.current) { onClose(); return; }
    if (!salon?.id || !canEdit) { setError("Unable to update salon preferences."); return; }
    lock.current = true; setSaving(true); setError(null);
    try {
      await dispatch(updateSalonThunk({ salonId: salon.id, formFields: {
        ...(language !== normalizeLanguage(salon.language) ? { language } : {}),
        ...(currency !== getCurrencyDef(salon.currency).code ? { currency } : {}),
      } })).unwrap();
      onClose();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { lock.current = false; setSaving(false); }
  };
  const choices = picker === "language"
    ? LANGUAGES.map(item => ({ code: item.code, label: item.nativeName }))
    : SUPPORTED_CURRENCIES.map(item => ({ code: item.code, label: `${item.code} ${item.symbol.trim()} · ${item.label}` }));
  return (
    <>
    <BottomSheet
      renderInline={renderInline}
      visible
      pearlStyle
      centered={false}
      title="Appearance"
      onClose={close}
      footer={
        <View style={{ flex: 1 }}>
          <SettingsButton label="Done" loading={saving} onPress={() => void done()} />
        </View>
      }
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.mode}
            accessibilityRole="radio"
            accessibilityState={{ checked: mode === option.mode }}
            onPress={() => setMode(option.mode)}
            style={[
              ui.formCard,
              {
                flex: 1,
                alignItems: "center",
                paddingHorizontal: 8,
                gap: 10,
                borderRadius: 16,
                borderColor:
                  mode === option.mode ? pearl.accent : pearl.glassBorder,
                backgroundColor:
                  mode === option.mode ? pearl.fieldFocus : pearl.glassStrong,
                outlineWidth: mode === option.mode ? 4 : 0,
                outlineColor: pearl.accentWash,
              },
            ]}
          >
            <Ionicons
              name={option.icon}
              size={24}
              color={mode === option.mode ? pearl.accentDeep : pearl.muted}
            />
            <Text translate style={ui.title}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ gap: 10, marginTop: 16 }}>
        {(["language", "currency"] as const).map(kind => <View key={kind} style={{ gap: 7 }}>
          <Text translate style={ui.body}>{kind === "language" ? "Language" : "Currency"}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={kind === "language" ? "Language" : "Currency"} disabled={!canEdit || saving || !salon?.id}
            onPress={() => { setQuery(""); setPicker(kind); }} style={[ui.input, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: canEdit ? 1 : 0.6 }]}>
            <Text style={[ui.title, { fontWeight: "600" }]}>{kind === "language" ? LANGUAGES.find(item => item.code === language)?.nativeName : `${currency} ${getCurrencyDef(currency).symbol.trim()}`}</Text>
            <Ionicons name="chevron-down" size={16} color={pearl.muted} />
          </TouchableOpacity>
        </View>)}
        {!canEdit && <Text translate style={ui.muted}>Only the salon owner can change language and currency.</Text>}
        {!!error && <Text translate accessibilityRole="alert" style={ui.error}>{error}</Text>}
      </View>
    </BottomSheet>
    <BottomSheet visible={picker !== null} renderInline={renderInline} stacked pearlStyle avoidKeyboard centered={false} scrollable={false}
      title={picker === "language" ? "Language" : "Currency"} onClose={() => setPicker(null)}>
      <View style={{ gap: 12, flexShrink: 1 }}>
        <TextInput value={query} onChangeText={setQuery} placeholder={picker === "language" ? "Search languages" : "Search currencies"} style={ui.input} />
        <FlatList key={picker} style={{ maxHeight: 350, flexShrink: 1 }} data={choices.filter(item => `${item.code} ${item.label}`.toLowerCase().includes(query.toLowerCase()))}
          keyboardShouldPersistTaps="handled" keyExtractor={item => item.code}
          ListEmptyComponent={<Text translate style={ui.muted}>No results found</Text>}
          renderItem={({ item }) => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: item.code === (picker === "language" ? language : currency) }}
            onPress={() => { dirty.current = true; if (picker === "language") setLanguage(item.code); else setCurrency(item.code); setPicker(null); }}
            style={[ui.row, { paddingHorizontal: 4 }]}>
            <Text translate style={[ui.title, { flex: 1 }]}>{item.label}</Text>
            {item.code === (picker === "language" ? language : currency) && <Ionicons name="checkmark" size={20} color={pearl.accentDeep} />}
          </TouchableOpacity>} />
      </View>
    </BottomSheet>
    </>
  );
}
