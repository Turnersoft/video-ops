import { StyleSheet } from 'react-native';

/** CSS variable values from outdoor_agent/web/app.css */
export const colors = {
  bg: '#020617',
  text: '#f8fafc',
  muted: '#94a3b8',
  muted2: '#64748b',
  orange: '#f97316',
  orangeText: '#111827',
  card: 'rgba(15, 23, 42, 0.92)',
  cardBorder: 'rgba(148, 163, 184, 0.18)',
  pill: 'rgba(30, 41, 59, 0.9)',
  badgePending: 'rgba(51, 65, 85, 0.9)',
  badgeFilmed: 'rgba(22, 101, 52, 0.85)',
  badgeFilmedText: '#bbf7d0',
  section: '#fde68a',
  online: '#86efac',
  offline: '#fca5a5',
  danger: '#ef4444',
  code: '#fde68a',
  videoBg: '#0b1220',
  black: '#000000',
  white: '#ffffff',
  headerBg: 'rgba(2, 6, 23, 0.92)',
  runChipActiveBg: 'rgba(249, 115, 22, 0.16)',
  runChipActiveText: '#fdba74',
  bannerOnlineBg: 'rgba(22, 101, 52, 0.2)',
  bannerOfflineBg: 'rgba(127, 29, 29, 0.25)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 40,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  pill: 999,
} as const;

export const typography = {
  body: 15,
  bodyLineHeight: 22,
  small: 13,
  tiny: 12,
  title: 28,
  cardTitle: 16,
  section: 12,
} as const;

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
