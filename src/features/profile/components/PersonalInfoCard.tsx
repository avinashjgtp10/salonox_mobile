import { FieldBox, FieldGrid, ProfileCard } from "@/features/profile/components/ProfileSections";
import { formatMonthYear, formatValue } from "@/features/profile/utils/profileFormat";
import type { UserProfile } from "@/types/profile";
import type { SalonListItem } from "@/types/salon";

export function PersonalInfoCard({ profile, salon }: { profile: UserProfile; salon: SalonListItem | null }) {
  return (
    <ProfileCard icon="person-outline" subtitle="Your name, email and contact details" title="Personal Information">
      <FieldGrid>
        <FieldBox icon="person-outline" label="FULL NAME" value={formatValue(profile.fullName)} />
        <FieldBox icon="mail-outline" label="EMAIL ADDRESS" value={formatValue(profile.email)} />
        <FieldBox icon="call-outline" label="PHONE NUMBER" value={formatValue(profile.phone)} />
        <FieldBox icon="globe-outline" label="COUNTRY" value={formatValue(profile.countryCode ?? profile.country)} />
        <FieldBox icon="id-card-outline" label="ROLE" value={formatValue(profile.role)} badge="SYSTEM" />
        <FieldBox icon="checkmark-circle" label="MEMBER SINCE" value={formatMonthYear(salon?.createdAt)} />
      </FieldGrid>
    </ProfileCard>
  );
}
