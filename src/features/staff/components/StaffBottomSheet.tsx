import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";

type StaffBottomSheetProps = {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
  visible: boolean;
};

export function StaffBottomSheet({
  children,
  footer,
  onClose,
  subtitle,
  title,
  visible,
}: StaffBottomSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoiding}
        >
          <Pressable style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <TouchableOpacity activeOpacity={0.84} onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={Colors.primaryDark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(17, 24, 20, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardAvoiding: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "90%",
    paddingBottom: Spacing.lg,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    height: 4,
    marginBottom: Spacing.md,
    width: 42,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.control,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  content: {
    paddingTop: Spacing.lg,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: Spacing.md,
  },
});
