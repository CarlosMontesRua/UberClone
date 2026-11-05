import { StyleSheet } from 'react-native';

export const colors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  surfaceStrong: '#EDEFF3',
  text: '#111318',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  border: '#E2E5EA',
  primary: '#0A0A0A',
  primaryPressed: '#262626',
  primaryText: '#FFFFFF',
  accent: '#0E9F6E',
  accentSoft: '#E7F7F0',
  danger: '#D92D20',
  dangerSoft: '#FDECEA',
  white: '#FFFFFF',
  overlay: 'rgba(17, 19, 24, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
};

export const commonStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  step: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subtitle,
    marginBottom: spacing.xl,
  },
  formError: {
    ...typography.caption,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceStrong,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  progressHalf: {
    width: '50%',
  },
  progressFull: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  halfInput: {
    flex: 1,
  },
  columnGap: {
    width: spacing.md,
  },
});
