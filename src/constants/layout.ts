import { BottomTabInset, DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";

export const AppLayout = {
  cardPadding: 14,
  contentBottomPadding: Spacing.xxl,
  contentHorizontalPadding: 22,
  floatingButtonBottom: BottomTabInset + 10,
  floatingButtonRight: 22,
  headerActionHitSlop: 12,
  headerActionSize: 38,
  headerMarginBottom: 18,
  headerSubtitleFontSize: 11.5,
  headerSubtitleMarginTop: 2,
  headerTitleFontSize: 22,
  screenTitleFontWeight: "800" as const,
  screenTopPadding: 0,
  searchBarHeight: 52,
  searchBarIconSize: 16,
  searchBarPaddingX: 14,
  sectionGap: 14,
  summaryCardMinHeight: 124,
  summaryCardWidth: 156,
};

export const AppRadius = {
  card: Radius.xl,
  control: Radius.md,
  pill: Radius.full,
  search: Radius.xl,
};
