import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffMembers,
  selectStaffLoading,
  selectStaffRefreshing,
  selectStaffLoadingMore,
  selectStaffPagination,
  selectStaffError,
} from "@/store/staff/staff.slice";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import {
  TEAM_FILTERS,
  TEAM_SORT_OPTIONS,
  matchesTeamFilter,
  matchesTeamSearch,
  sortTeamMembers,
  type TeamFilter,
  type TeamSortOption,
  type StaffMember,
} from "@/data/teamData";
import { useStaffDailyMetrics } from "../hooks/useStaffDailyMetrics";
import { StaffActionsSheet } from "../components/StaffActionsSheet";
import {
  StaffAvatar,
  StaffButton,
  StaffHeader,
  StaffMenuItem,
  staffUi,
} from "../components/StaffPearl";
import { formatCurrency } from "@/utils/currency";
import { useFooterClearance } from "@/hooks/useFooterClearance";
export default function StaffListScreen() {
  const dispatch = useAppDispatch(),
    members = useAppSelector(selectStaffMembers),
    loading = useAppSelector(selectStaffLoading),
    refreshing = useAppSelector(selectStaffRefreshing),
    loadingMore = useAppSelector(selectStaffLoadingMore),
    pagination = useAppSelector(selectStaffPagination),
    error = useAppSelector(selectStaffError);
  const metrics = useStaffDailyMetrics(members);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState<TeamFilter>("All"),
    [sort, setSort] = useState<TeamSortOption>("Alphabetical"),
    [sortOpen, setSortOpen] = useState(false),
    [menu, setMenu] = useState<StaffMember | null>(null);
  const query = useDeferredValue(search),
    footer = useFooterClearance();
  useFocusEffect(
    useCallback(() => {
      void dispatch(fetchStaffThunk({ page: 1, limit: 30, reset: true }));
    }, [dispatch]),
  );
  const visible = useMemo(
    () =>
      sortTeamMembers(
        metrics.members.filter(
          (m) => matchesTeamFilter(m, filter) && matchesTeamSearch(m, query),
        ),
        sort,
      ),
    [metrics.members, filter, query, sort],
  );
  const refresh = () => {
    void dispatch(fetchStaffThunk({ page: 1, limit: 30, refresh: true }));
    void metrics.refresh();
  };
  const header = (
    <View style={{ gap: 14 }}>
      <StaffHeader
        title="Staff"
        subtitle={
          pagination.totalCount +
          " total · " +
          metrics.members.filter((m) => matchesTeamFilter(m, "Working"))
            .length +
          " working today"
        }
        right={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              accessibilityLabel="Attendance"
              style={staffUi.icon}
              onPress={() => router.push("/team/attendance")}
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color={pearl.accentDeep}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Staff permissions"
              style={staffUi.icon}
              onPress={() => router.push("/team/permissions")}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={pearl.accentDeep}
              />
            </TouchableOpacity>
          </View>
        }
      />
      <View
        style={[
          staffUi.input,
          { flexDirection: "row", gap: 10, alignItems: "center" },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={pearl.muted} />
        <TextInput
          accessibilityLabel="Search staff"
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff"
          placeholderTextColor={pearl.placeholder}
          style={{ flex: 1, color: pearl.ink, fontSize: 14 }}
        />
        <TouchableOpacity
          accessibilityLabel="Sort staff"
          onPress={() => setSortOpen(true)}
        >
          <Ionicons name="options-outline" size={20} color={pearl.accentDeep} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {TEAM_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: filter === f ? pearl.accentTint : pearl.glassBorder,
              backgroundColor: filter === f ? pearl.accentWash : pearl.glass,
            }}
          >
            <Text
              style={{
                color: filter === f ? pearl.accentDeep : pearl.ink2,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {f === "On Leave" ? "On leave" : f}{" "}
              {f === "Inactive"
                ? ""
                : f === "All"
                  ? pagination.totalCount
                  : metrics.members.filter((m) => matchesTeamFilter(m, f))
                      .length}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {error ? (
        <View style={staffUi.formCard}>
          <Text style={staffUi.error}>{error}</Text>
          <StaffButton secondary label="Retry" onPress={refresh} />
        </View>
      ) : null}
    </View>
  );
  return (
    <PearlBackground>
      <SafeAreaView edges={["top"]} style={staffUi.screen}>
        <AppStatusBar />
        <FlatList
          data={loading && !members.length ? [] : visible}
          keyExtractor={(m) => m.id}
          ListHeaderComponent={header}
          contentContainerStyle={[
            staffUi.content,
            { paddingBottom: footer + 90 },
          ]}

          ListEmptyComponent={
            loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={staffUi.muted}>No staff found.</Text>
            )
          }
          renderItem={({ item: m }) => (
            <TouchableOpacity
              onPress={() => router.push(("/team/" + m.id) as Href)}
              style={[staffUi.card, { padding: 14, gap: 12, marginTop: 4 }]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <StaffAvatar initials={m.initials} uri={m.avatarUrl} />
                <View style={{ flex: 1 }}>
                  <Text style={staffUi.rowTitle}>{m.name}</Text>
                  <Text style={staffUi.muted}>{m.designation || m.role}</Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color:
                      m.availability === "Available"
                        ? pearl.successText
                        : pearl.ink2,
                  }}
                >
                  {m.status === "Inactive" ? "Inactive" : m.availability}
                </Text>
                <TouchableOpacity
                  accessibilityLabel={"Actions for " + m.name}
                  onPress={() => setMenu(m)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={19}
                    color={pearl.ink}
                  />
                </TouchableOpacity>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  borderTopWidth: 0,
                  borderColor: pearl.divider,
                  paddingTop: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={staffUi.muted}>Today</Text>
                  <Text style={staffUi.rowTitle}>
                    {metrics.revenueReady
                      ? formatCurrency(m.todayRevenue)
                      : "—"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={staffUi.muted}>Appts</Text>
                  <Text style={staffUi.rowTitle}>
                    {metrics.ready ? m.todayAppointments : "—"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={pearl.accent}
            />
          }
          onEndReached={() => {
            if (!loading && !loadingMore && !refreshing && pagination.hasMore)
              void dispatch(
                fetchStaffThunk({
                  page: pagination.nextPage,
                  limit: pagination.limit,
                }),
              );
          }}
          onEndReachedThreshold={0.35}
          ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
        />
        <View style={{ position: "absolute", bottom: footer + 12, right: 16 }}>
          <StaffButton
            label="+ Add staff"
            onPress={() => router.push("/team/new")}
          />
        </View>
        <StaffActionsSheet member={menu} onClose={() => setMenu(null)} />
        <BottomSheet
          pearlStyle
          centered={false}
          title="Sort staff"
          visible={sortOpen}
          onClose={() => setSortOpen(false)}
        >
          {TEAM_SORT_OPTIONS.map((option) => (
            <StaffMenuItem
              key={option}
              label={option}
              icon={sort === option ? "checkmark-circle" : "ellipse-outline"}
              onPress={() => {
                setSort(option);
                setSortOpen(false);
              }}
            />
          ))}
        </BottomSheet>
      </SafeAreaView>
    </PearlBackground>
  );
}
