import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { colors, radii, spacing, typography } from "./theme";

/** Layout profile — never use Platform.OS for spacing/columns. */
export type OutdoorLayout = "browser" | "mobile";

export type OutdoorLayoutStyles = {
  main: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  headerActions: ViewStyle;
  card: ViewStyle;
  grid: ViewStyle;
  gridItemHalf: ViewStyle;
  gridItemThird: ViewStyle;
  /** Side-by-side video + script on browser; CutReviewPanel stacks on mobile portrait. */
  studioRow: ViewStyle;
  studioVideoPane: ViewStyle;
  studioScriptPane: ViewStyle;
  videos: ViewStyle;
  compareRow: ViewStyle;
  beatRow: ViewStyle;
  beatChip: ViewStyle;
  remotionFrame: ViewStyle;
  socialGrid: ViewStyle;
  socialCard: ViewStyle;
  coverTile: ViewStyle;
  touchTarget: ViewStyle;
  pipelineToolbar: ViewStyle;
};

const browser: OutdoorLayoutStyles = {
  main: {
    flex: 1,
    flexGrow: 1,
    minHeight: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    maxWidth: 1180,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: colors.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.12)",
  },
  headerTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    flexShrink: 1,
    lineHeight: 22,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
    flexShrink: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  gridItemHalf: {
    width: "48%",
    flexBasis: "48%",
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "48%",
  },
  gridItemThird: {
    width: "31%",
    flexBasis: "31%",
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "31%",
  },
  videos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-start",
  },
  studioRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
    width: "100%",
  },
  studioVideoPane: {
    flex: 1.15,
    minWidth: 0,
    alignSelf: "stretch",
  },
  studioScriptPane: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
  },
  compareRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "stretch",
  },
  beatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  beatChip: {
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(51, 65, 85, 0.9)",
    maxWidth: 220,
    gap: 2,
  },
  remotionFrame: {
    flex: 1,
    width: "100%",
    minHeight: 620,
    height: "100%",
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-start",
    alignContent: "flex-start",
  },
  socialCard: {
    width: "100%",
    backgroundColor: colors.videoBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    padding: 14,
    gap: 8,
  },
  coverTile: {
    width: "31%",
    flexBasis: "31%",
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "31%",
    backgroundColor: colors.videoBg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    paddingBottom: spacing.sm,
  },
  touchTarget: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pipelineToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
};

const mobile: OutdoorLayoutStyles = {
  main: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 48,
    maxWidth: undefined,
    alignSelf: "stretch",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.12)",
  },
  headerTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    width: "100%",
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    justifyContent: "flex-start",
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "column",
    gap: 12,
  },
  gridItemHalf: {
    width: "100%",
  },
  gridItemThird: {
    width: "100%",
  },
  videos: {
    flexDirection: "column",
    gap: 10,
  },
  studioRow: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
    width: "100%",
  },
  studioVideoPane: {
    flexGrow: 0,
    flexShrink: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  studioScriptPane: {
    flexGrow: 1,
    flexShrink: 1,
    width: "100%",
    minHeight: 200,
    alignSelf: "stretch",
  },
  compareRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch",
  },
  beatRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: spacing.sm,
  },
  beatChip: {
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(51, 65, 85, 0.9)",
    minWidth: 120,
    flexShrink: 0,
    gap: 2,
  },
  remotionFrame: {
    flex: 1,
    width: "100%",
    minHeight: 420,
    height: "100%",
  },
  socialGrid: {
    flexDirection: "column",
    gap: 12,
  },
  socialCard: {
    width: "100%",
    backgroundColor: colors.videoBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    padding: 10,
    gap: 6,
  },
  coverTile: {
    width: "100%",
    backgroundColor: colors.videoBg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    paddingBottom: spacing.sm,
  },
  touchTarget: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pipelineToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
};

const LAYOUTS: Record<OutdoorLayout, OutdoorLayoutStyles> = {
  browser,
  mobile,
};

export function layoutStylesFor(layout: OutdoorLayout): OutdoorLayoutStyles {
  return LAYOUTS[layout];
}

export function isMobileLayout(layout: OutdoorLayout): boolean {
  return layout === "mobile";
}

/** Full-height side-by-side studio row (cut / align) — browser and iPhone. */
export function pipelineStudioHeight(
  windowHeight: number,
  layout: OutdoorLayout,
): number {
  const ratio = layout === "browser" ? 0.88 : 0.78;
  const cap = layout === "browser" ? 980 : 760;
  return Math.max(440, Math.min(Math.round(windowHeight * ratio), cap));
}

/** Shared screen chrome that does not depend on layout profile. */
export const layoutChrome = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  sectionGap: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  muted: {
    color: colors.muted,
    fontSize: typography.small,
  },
});
