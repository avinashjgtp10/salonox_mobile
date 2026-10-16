import type { PropsWithChildren } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareForm } from "@/components/ui/KeyboardAwareForm";
import { useThemeColors } from "@/theme/ThemeProvider";

export const auditStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  title: { fontSize: 23, fontWeight: "800", flex: 1 },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
});
export function AuditPage({
  title,
  children,
  onBack,
  scrollable = true,
}: PropsWithChildren<{
  title: string;
  onBack?: () => void;
  scrollable?: boolean;
}>) {
  const c = useThemeColors();
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <AppStatusBar />
      <View style={auditStyles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={[auditStyles.title, { color: c.heading }]}>{title}</Text>
      </View>
      {scrollable ? (
        <KeyboardAwareForm autoReveal>
          <View style={auditStyles.body}>{children}</View>
        </KeyboardAwareForm>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
export function AuditButton({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const c = useThemeColors();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: danger ? c.error : c.primary,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text
        style={{ color: c.onPrimary, fontWeight: "700", textAlign: "center" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
export function AuditField({
  label,
  value,
  onChange,
  numeric,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  numeric?: boolean;
  editable?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.text2 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        style={{
          color: c.text,
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
        }}
      />
    </View>
  );
}
export function AuditCard({ children }: PropsWithChildren) {
  const c = useThemeColors();
  return (
    <View
      style={[
        auditStyles.card,
        { backgroundColor: c.card, borderColor: c.border },
      ]}
    >
      {children}
    </View>
  );
}
export const auditStatusLabel = (status: string) =>
  ({
    in_progress: "In Progress",
    pending_review: "Pending Review",
    complete: "Complete",
    rejected: "Rejected",
  })[status] ?? status;
