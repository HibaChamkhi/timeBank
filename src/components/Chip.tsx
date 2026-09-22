import React from 'react';
import { Pressable } from 'react-native';
import { control, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        minHeight: control.minTouch,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
      }}
    >
      <AppText variant="labelLg" tone={selected ? undefined : 'secondary'} style={selected ? { color: colors.primary } : undefined}>{label}</AppText>
    </Pressable>
  );
}
