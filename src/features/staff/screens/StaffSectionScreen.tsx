import { router, useLocalSearchParams, type Href } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout } from "@/constants/layout";
import {
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { EmergencyContactsSection } from "@/features/staff/components/EmergencyContactsSection";
import { StaffAddressSection } from "@/features/staff/components/StaffAddressSection";
import { StaffBlockedTimeSection } from "@/features/staff/components/StaffBlockedTimeSection";
import { StaffCommissionSection } from "@/features/staff/components/StaffCommissionSection";
import { StaffInvitationSection } from "@/features/staff/components/StaffInvitationSection";
import { StaffLeaveSection } from "@/features/staff/components/StaffLeaveSection";
import { StaffPayRunSection } from "@/features/staff/components/StaffPayRunSection";
import { StaffScheduleSection } from "@/features/staff/components/StaffScheduleSection";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { StaffWageSection } from "@/features/staff/components/StaffWageSection";
import { STAFF_MODULE_SECTIONS } from "@/features/staff/constants/staffModule.constants";
import type { StaffModuleSectionKey } from "@/features/staff/types/staffFeature.types";
import { useStaffDetails } from "@/features/staff/hooks/useStaffDetails";
import { useThemeColors } from "@/theme/ThemeProvider";

type StaffSectionScreenProps = {
  sectionKey: StaffModuleSectionKey;
};

export function StaffSectionScreen({ sectionKey }: StaffSectionScreenProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const section = STAFF_MODULE_SECTIONS.find((item) => item.key === sectionKey);

  useStaffDetails(id);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(id ? (`/team/${id}` as Href) : ("/team" as Href));
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppBackButton onPress={handleBack} />
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{section?.label ?? "Staff Section"}</Text>
            <Text style={styles.subtitle}>{section?.description ?? "Manage staff records."}</Text>
          </View>
        </View>

        {sectionKey === "address" ? <StaffAddressSection staffId={id} /> : null}
        {sectionKey === "emergencyContacts" ? <EmergencyContactsSection staffId={id} /> : null}
        {sectionKey === "wages" ? <StaffWageSection staffId={id} /> : null}
        {sectionKey === "payRuns" ? <StaffPayRunSection staffId={id} /> : null}
        {sectionKey === "commissions" ? <StaffCommissionSection staffId={id} /> : null}
        {sectionKey === "schedule" ? <StaffScheduleSection staffId={id} /> : null}
        {sectionKey === "leaves" ? <StaffLeaveSection staffId={id} /> : null}
        {sectionKey === "blockedTimes" ? <StaffBlockedTimeSection staffId={id} /> : null}
        {sectionKey === "invitations" ? <StaffInvitationSection staffId={id} /> : null}
        {section?.status === "future-ready" ? (
          <StaffStateView
            description="This Staff module section is prepared with navigation, typing and screen ownership. API wiring can plug into this section without changing the profile flow."
            title={`${section.label} is future-ready`}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: AppLayout.headerMarginBottom,
  },
  headerCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  subtitle: {
    color: Colors.text2,
    fontSize: AppLayout.headerSubtitleFontSize,
    lineHeight: 20,
    marginTop: AppLayout.headerSubtitleMarginTop,
  },
});
