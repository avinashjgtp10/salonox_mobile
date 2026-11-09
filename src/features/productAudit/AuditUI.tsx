import type { PropsWithChildren, ReactNode, Ref } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareForm } from "@/components/ui/KeyboardAwareForm";
import { usePearlColors as useThemeColors } from "@/components/auth/pearl/usePearlColors";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { PearlActionFooter } from "@/components/ui/PearlActionFooter";
import { KeyboardInsetView } from "@/components/ui/KeyboardInsetView";
import { LinearGradient } from "expo-linear-gradient";
import { pearlGradients } from "@/components/auth/pearl/tokens";

export const auditStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  title: { fontSize: 23, fontWeight: "800", flex: 1 },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 22, borderWidth: 1, gap: 10 },
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
  footer,
}: PropsWithChildren<{
  title: string;
  onBack?: () => void;
  scrollable?: boolean;
  footer?: ReactNode;
}>) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <PearlBackground>
      <SafeAreaView
        edges={footer ? ["top"] : ["top", "bottom"]}
        style={{ flex: 1, backgroundColor: "transparent" }}
      >
        <AppStatusBar />
        <View style={auditStyles.header}>
          <AppBackButton onPress={onBack} />
          <Text translate style={[auditStyles.title, { color: c.heading }]}>{title}</Text>
        </View>
        <KeyboardInsetView bottomOffset={insets.bottom}>
          {scrollable ? (
            <KeyboardAwareForm
              autoReveal
              padForKeyboard={false}
              avoidKeyboard={false}
            >
              <View style={auditStyles.body}>{children}</View>
            </KeyboardAwareForm>
          ) : (
            <View style={{ flex: 1 }}>{children}</View>
          )}
          {footer && (
            <PearlActionFooter bottomInset={insets.bottom}>
              {footer}
            </PearlActionFooter>
          )}
        </KeyboardInsetView>
      </SafeAreaView>
    </PearlBackground>
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
        borderRadius: 16,
        overflow: "hidden",
        paddingVertical: 12,
        paddingHorizontal: 16,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {!danger && (
        <LinearGradient
          pointerEvents="none"
          colors={pearlGradients.primary}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text translate
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
  inputRef,
  onSubmitEditing,
  returnKeyType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  numeric?: boolean;
  editable?: boolean;
  inputRef?: Ref<TextInput>;
  onSubmitEditing?: () => void;
  returnKeyType?: "next" | "done";
  multiline?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text translate style={{ color: c.text2 }}>{label}</Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        editable={editable}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        blurOnSubmit={returnKeyType !== "next"}
        multiline={multiline}
        style={{
          color: c.text,
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 16,
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
