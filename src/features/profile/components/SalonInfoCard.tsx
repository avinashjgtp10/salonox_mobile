import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import {
  FieldBox,
  FieldGrid,
  ProfileCard,
  ProfileSubsection,
} from "@/features/profile/components/ProfileSections";
import { formatEmpty, formatValue } from "@/features/profile/utils/profileFormat";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { UserProfile } from "@/types/profile";
import type { SalonListItem } from "@/types/salon";

type SalonInfoCardProps = {
  isLoading: boolean;
  onEdit: () => void;
  profile: UserProfile;
  salon: SalonListItem | null;
};

/** Read-only salon details, falling back to the owner's profile where the salon has no value. */
export function SalonInfoCard({ isLoading, onEdit, profile, salon }: SalonInfoCardProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const salonName = salon?.businessName || salon?.name || profile.businessName;
  const salonEmail = salon?.email || profile.email;
  const salonPhone = salon?.phone || profile.phone;
  const salonAddress = salon?.address || profile.address;
  const website = formatEmpty(salon?.websiteUrl, "No website set");
  const gstin = formatEmpty(salon?.gstin, "No gst number set");
  // Not loaded from the salon API: these are fixed values.
  const businessRegNo = formatEmpty(null, "No business reg. no. (pan) set");
  const businessType = formatEmpty("Hair salon", "No business type set");
  const businessCategory = formatEmpty(null, "No business category set");
  const description = formatEmpty(null, "No description set");
  const city = formatEmpty(salon?.city, "No city set");
  const state = formatEmpty(salon?.state, "No state set");
  const pincode = formatEmpty(salon?.postalCode, "No pincode set");
  const timezone = formatEmpty(salon?.timezone || "Asia/Kolkata", "No timezone set");

  return (
    <ProfileCard
      icon="business-outline"
      iconTone="purple"
      rightAction={
        <TouchableOpacity activeOpacity={0.84} onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      }
      subtitle="Your salon's business details and location"
      title="Salon Information"
    >
      {isLoading && !salon ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingText}>Loading salon information...</Text>
        </View>
      ) : null}
      <ProfileSubsection title="BASIC DETAILS">
        <FieldGrid>
          <FieldBox icon="business-outline" label="SALON NAME" value={formatValue(salonName)} />
          <FieldBox icon="mail-outline" label="SALON EMAIL" value={formatValue(salonEmail)} />
          <FieldBox icon="call-outline" label="SALON PHONE" value={formatValue(salonPhone)} />
          <FieldBox empty={website.isEmpty} icon="globe-outline" label="WEBSITE" value={website.text} />
        </FieldGrid>
      </ProfileSubsection>

      <ProfileSubsection title="BUSINESS & TAX">
        <FieldGrid>
          <FieldBox empty={gstin.isEmpty} icon="pricetag-outline" label="GST NUMBER" value={gstin.text} />
          <FieldBox empty={businessRegNo.isEmpty} icon="card-outline" label="BUSINESS REG. NO. (PAN)" value={businessRegNo.text} />
          <FieldBox empty={businessType.isEmpty} icon="business-outline" label="BUSINESS TYPE" value={businessType.text} />
          <FieldBox empty={businessCategory.isEmpty} icon="ticket-outline" label="BUSINESS CATEGORY" value={businessCategory.text} />
        </FieldGrid>
      </ProfileSubsection>

      <ProfileSubsection title="LOCATION">
        <FieldGrid>
          <FieldBox icon="location-outline" label="ADDRESS" value={formatValue(salonAddress)} />
          <FieldBox empty={city.isEmpty} icon="map-outline" label="CITY" value={city.text} />
          <FieldBox empty={state.isEmpty} icon="map-outline" label="STATE" value={state.text} />
          <FieldBox empty={pincode.isEmpty} icon="pricetag-outline" label="PINCODE" value={pincode.text} />
        </FieldGrid>
      </ProfileSubsection>

      <ProfileSubsection title="REGIONAL SETTINGS">
        <FieldGrid>
          <FieldBox empty={timezone.isEmpty} icon="time-outline" label="TIMEZONE" value={timezone.text} />
        </FieldGrid>
      </ProfileSubsection>

      <ProfileSubsection title="DESCRIPTION">
        <FieldGrid>
          <FieldBox empty={description.isEmpty} icon="document-text-outline" label="DESCRIPTION" value={description.text} />
        </FieldGrid>
      </ProfileSubsection>
    </ProfileCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  editButton: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
  },
  editButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loadingText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "700",
  },
});
