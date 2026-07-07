import { BottomTabInset, DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";

export const AppLayout = {
  cardPadding: Spacing.lg,
  contentBottomPadding: Spacing.xxl,
  contentHorizontalPadding: Spacing.lg,
  floatingButtonBottom: BottomTabInset + 10,
  floatingButtonRight: Spacing.lg,
  headerActionSize: 40,
  headerMarginBottom: Spacing.lg,
  headerSubtitleFontSize: 13,
  headerSubtitleMarginTop: 4,
  headerTitleFontSize: 24,
  screenTitleFontWeight: "800" as const,
  screenTopPadding: 0,
  searchBarHeight: 52,
  searchBarIconSize: 18,
  searchBarPaddingX: Spacing.md,
  sectionGap: Spacing.md,
  summaryCardMinHeight: 124,
  summaryCardWidth: 156,
};

export const AppRadius = {
  card: Radius.xl,
  control: Radius.md,
  pill: Radius.full,
  search: Radius.xl,
};
