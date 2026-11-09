import { useRegionalPreferences } from "@/localization/preferences";
import { useMemo, useState } from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { PearlBottomNav } from "@/components/ui/PearlBottomNav";
import { useStaffDetails } from "../hooks/useStaffDetails";
import { useStaffDailyMetrics } from "../hooks/useStaffDailyMetrics";
import { useStaffPerformance } from "../hooks/useStaffPerformance";
import { StaffActionsSheet } from "../components/StaffActionsSheet";
import {
  StaffAvatar,
  StaffHeader,
  StaffButton,
  StaffMenuItem,
  staffUi,
} from "../components/StaffPearl";
import { formatCurrency } from "@/utils/currency";
import { maskPhone } from "@/utils/maskPhone";
import { useAppToast } from "@/hooks/useAppToast";
import { STAFF_MODULE_SECTIONS } from "../constants/staffModule.constants";
export default function StaffProfileScreen() {
  "use no memo";
  useRegionalPreferences();
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useStaffDetails(id);
  const list = useMemo(
    () => (details.staffMember ? [details.staffMember] : []),
    [details.staffMember],
  );
  const daily = useStaffDailyMetrics(list, true);
  const member = daily.members[0] ?? details.staffMember;
  const performance = useStaffPerformance(details.staffMember, "month");
  const [tab, setTab] = useState("Overview"),
    [actions, setActions] = useState(false);
  const toast = useAppToast();
  const route = (path: string) => router.push(path as Href);
  const row = (label: string, value: string) => (
    <View
      key={label}
      style={{
        flexDirection: "row",
        gap: 12,
        paddingVertical: 10,
        alignItems: "center",
      }}
    >
      <Text translate style={[staffUi.muted, { width: "32%" }]}>{label}</Text>
      <Text style={[staffUi.rowTitle, { flex: 1, textAlign: "right" }]}>
        {value || "—"}
      </Text>
    </View>
  );
  return (
    <PearlBackground>
      <SafeAreaView edges={["top", "bottom"]} style={staffUi.screen}>
        <AppStatusBar />
        <ScrollView
          contentContainerStyle={[staffUi.content, { paddingBottom: 160 }]}
        >
          <StaffHeader
            centered
            title="Staff profile"
            right={
              member ? (
                <TouchableOpacity
                  accessibilityLabel="Staff actions"
                  style={staffUi.icon}
                  onPress={() => setActions(true)}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={21}
                    color={pearl.ink}
                  />
                </TouchableOpacity>
              ) : null
            }
          />
          {details.detailsLoading && !member ? <ActivityIndicator /> : null}
          {details.detailsError ? (
            <View style={staffUi.formCard}>
              <Text style={staffUi.error}>{details.detailsError}</Text>
              <StaffButton label="Retry" onPress={details.refresh} />
            </View>
          ) : null}
          {member ? (
            <>
              <View style={[staffUi.formCard, { borderRadius: 28 }]}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <StaffAvatar
                    initials={member.initials}
                    uri={member.avatarUrl}
                    size={68}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={staffUi.title}>{member.name}</Text>
                    <Text style={staffUi.muted}>
                      {member.designation || member.role}
                    </Text>
                    <Text style={{ fontSize: 11, color: pearl.successText }}>
                      {member.availability}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", paddingTop: 8 }}>
                  {(
                    [
                      {
                        label: "Call",
                        icon: "call-outline",
                        action: () =>
                          void Linking.openURL("tel:" + member.phone).catch(
                            () => toast.showError("Calling is unavailable."),
                          ),
                      },
                      {
                        label: "WhatsApp",
                        icon: "logo-whatsapp",
                        action: () =>
                          route(
                            "/inbox/" +
                              (
                                (member.phoneCountryCode ?? "91") + member.phone
                              ).replace(/\D/g, ""),
                          ),
                      },
                      {
                        label: "Schedule",
                        icon: "calendar-outline",
                        action: () => route("/team/" + id + "/schedule"),
                      },
                      {
                        label: "Edit",
                        icon: "create-outline",
                        action: () => route("/team/" + id + "/edit"),
                      },
                    ] as const
                  ).map((a) => (
                    <TouchableOpacity
                      key={a.label}
                      onPress={a.action}
                      style={{ flex: 1, alignItems: "center", gap: 6 }}
                    >
                      <View style={[staffUi.icon, { width: 42, height: 42 }]}>
                        <Ionicons
                          name={a.icon}
                          size={20}
                          color={pearl.accentDeep}
                        />
                      </View>
                      <Text translate style={staffUi.muted}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={staffUi.tabs}>
                {["Overview", "Details", "Services"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    style={[
                      staffUi.tab,
                      tab === t && { backgroundColor: pearl.glassStrong },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: tab === t ? pearl.ink : pearl.muted,
                      }}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {tab === "Overview" ? (
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  {[
                    [
                      "Today",
                      daily.ready ? member.todayAppointments + " appts" : "—",
                    ],
                    [
                      "This week",
                      daily.revenueReady
                        ? formatCurrency(member.weeklyRevenue)
                        : "—",
                    ],
                    [
                      "This month",
                      daily.revenueReady
                        ? formatCurrency(member.monthlyRevenue)
                        : "—",
                    ],
                    [
                      "Rating",
                      performance.data?.rating?.totalReviews
                        ? performance.data.rating.averageRating.toFixed(1) +
                          " \u2605"
                        : "—",
                    ],
                    [
                      "Attendance",
                      performance.data?.daysPresent != null
                        ? performance.data.daysPresent + " days this month"
                        : "—",
                    ],
                    [
                      "Leave left",
                      member.leaveBalance === "-" ? "—" : member.leaveBalance,
                    ],
                  ].map(([label, value]) => (
                    <TouchableOpacity
                      disabled={label !== "This month"}
                      onPress={() => route("/team/" + id + "/history")}
                      key={label}
                      style={[
                        staffUi.formCard,
                        { flexBasis: "47%", flexGrow: 1 },
                      ]}
                    >
                      <Text translate style={staffUi.muted}>{label}</Text>
                      <Text style={[staffUi.title, { fontSize: 21 }]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {tab === "Details" ? (
                <>
                  <View style={staffUi.formCard}>
                    {row("Phone", maskPhone(member.phone))}
                    {row("Email", member.email)}
                    {row("Joined", member.joiningDate)}
                    {row("Shift", member.workingHours)}
                    {row(
                      "Address",
                      member.address ??
                        details.addresses[0]?.addressLine ??
                        "Not added",
                    )}
                  </View>
                  <Text translate style={staffUi.heading}>Emergency contact</Text>
                  <View style={staffUi.formCard}>
                    {details.emergencyContactListState?.loading ? (
                      <ActivityIndicator />
                    ) : null}
                    {details.emergencyContacts.length ? (
                      details.emergencyContacts.map((c) => (
                        <View key={c.id}>
                          <Text style={staffUi.rowTitle}>{c.fullName}</Text>
                          <Text style={staffUi.muted}>{c.phone}</Text>
                        </View>
                      ))
                    ) : (
                      <>
                        <Text translate
                          style={[staffUi.rowTitle, { textAlign: "center" }]}
                        >
                          No emergency contact
                        </Text>
                        <Text style={[staffUi.muted, { textAlign: "center" }]}>
                          Add someone to call if {member.name.split(" ")[0]} is
                          unwell at work.
                        </Text>
                      </>
                    )}
                    <StaffButton
                      secondary
                      label="Add contact"
                      onPress={() =>
                        route("/team/" + id + "/emergency-contacts")
                      }
                    />
                  </View>
                  <View style={staffUi.card}>
                    {STAFF_MODULE_SECTIONS.filter(
                      (s) =>
                        s.route &&
                        ![
                          "profile",
                          "address",
                          "emergencyContacts",
                          "notes",
                          "documents",
                          "importStaff",
                        ].includes(s.key),
                    ).map((section) => (
                      <StaffMenuItem
                        key={section.key}
                        label={section.label}
                        icon="chevron-forward-outline"
                        onPress={() =>
                          route(section.route!.replace("[id]", id))
                        }
                      />
                    ))}
                  </View>
                </>
              ) : null}
              {tab === "Services" ? (
                <>
                  <View style={staffUi.card}>
                    {member.assignedServices.length ? (
                      member.assignedServices.map((name, index) => (
                        <View key={index} style={staffUi.menuRow}>
                          <View style={staffUi.icon}>
                            <Ionicons
                              name="cut-outline"
                              size={20}
                              color={pearl.accentDeep}
                            />
                          </View>
                          <Text style={staffUi.rowTitle}>{name}</Text>
                        </View>
                      ))
                    ) : (
                      <Text translate style={[staffUi.muted, { padding: 18 }]}>
                        No services assigned.
                      </Text>
                    )}
                  </View>
                  <StaffButton
                    secondary
                    label="Assign services"
                    onPress={() => route("/catalog")}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
        <PearlBottomNav />
        <StaffActionsSheet
          member={actions ? (member ?? null) : null}
          onClose={() => setActions(false)}
          onDeleted={() => router.replace("/team")}
        />
      </SafeAreaView>
    </PearlBackground>
  );
}
