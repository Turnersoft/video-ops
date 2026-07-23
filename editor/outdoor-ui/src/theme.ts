import { StyleSheet } from 'react-native';

import app from './App.module.scss';

function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Design tokens — sourced from App.module.scss */
export const colors = {
  bg: app.bg,
  text: app.text,
  muted: app.muted,
  muted2: app.muted2,
  orange: app.orange,
  orangeText: app.orangeText,
  card: app.card,
  cardBorder: app.cardBorder,
  pill: app.pill,
  badgePending: app.badgePending,
  badgeFilmed: app.badgeFilmed,
  badgeFilmedText: app.badgeFilmedText,
  section: app.section,
  online: app.online,
  offline: app.offline,
  danger: app.danger,
  code: app.code,
  videoBg: app.videoBg,
  black: app.black,
  white: app.white,
  headerBg: app.headerBg,
  runChipActiveBg: app.runChipActiveBg,
  runChipActiveText: app.runChipActiveText,
  bannerOnlineBg: app.bannerOnlineBg,
  bannerOfflineBg: app.bannerOfflineBg,
} as const;

export const spacing = {
  xs: px(app.spaceXs),
  sm: px(app.spaceSm),
  md: px(app.spaceMd),
  lg: px(app.spaceLg),
  xl: px(app.spaceXl),
  xxl: px(app.spaceXxl),
} as const;

export const radii = {
  sm: px(app.radiusSm),
  md: px(app.radiusMd),
  pill: px(app.radiusPill),
} as const;

export const typography = {
  body: px(app.fontBody),
  bodyLineHeight: px(app.fontBodyLineHeight),
  small: px(app.fontSmall),
  tiny: px(app.fontTiny),
  title: px(app.fontTitle),
  cardTitle: px(app.fontCardTitle),
  section: px(app.fontSection),
} as const;

/** Cross-platform StyleSheet mirrors of App.module.scss shared classes */
export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    maxWidth: 920,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
  },
  headerTitle: {
    margin: 0,
    fontSize: typography.title,
    fontWeight: '800',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  btn: {
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    backgroundColor: colors.pill,
  },
  btnText: {
    fontWeight: '700',
    color: colors.text,
    fontSize: typography.body,
  },
  btnPrimary: {
    backgroundColor: colors.orange,
  },
  btnPrimaryText: {
    color: colors.orangeText,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnDangerText: {
    color: colors.white,
  },
  btnBack: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  btnBackText: {
    color: colors.orange,
    fontWeight: '700',
  },
  banner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  bannerOnline: {
    backgroundColor: colors.bannerOnlineBg,
  },
  bannerOnlineText: {
    color: colors.online,
    fontSize: typography.small,
    fontWeight: '600',
  },
  bannerOffline: {
    backgroundColor: colors.bannerOfflineBg,
  },
  bannerOfflineText: {
    color: colors.offline,
    fontSize: typography.small,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: typography.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.badgePending,
  },
  badgeText: {
    fontSize: typography.tiny,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  badgeFilmed: {
    backgroundColor: colors.badgeFilmed,
  },
  badgeFilmedText: {
    color: colors.badgeFilmedText,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: 10,
    color: colors.section,
    fontSize: typography.section,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  slideCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
  },
  slideIndex: {
    color: colors.orange,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  slideBody: {
    color: colors.muted,
    marginTop: 6,
  },
  takeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 10,
  },
  runChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  runChip: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  runChipActive: {
    borderColor: colors.orange,
    backgroundColor: colors.runChipActiveBg,
  },
  runChipText: {
    fontSize: typography.tiny,
    fontWeight: '700',
    color: colors.text,
  },
  runChipActiveText: {
    color: colors.runChipActiveText,
  },
  videoCard: {
    backgroundColor: colors.videoBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  socialCard: {
    backgroundColor: colors.videoBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    padding: 10,
  },
  socialPlatform: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.muted,
  },
  mutedText: {
    color: colors.muted,
    fontSize: typography.small,
  },
  codeText: {
    color: colors.code,
    fontFamily: 'Menlo',
    fontSize: typography.tiny,
  },
});

export { default as appClasses } from './App.module.scss';
