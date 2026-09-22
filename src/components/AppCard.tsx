import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { elevation, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  featured?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function AppCard({ children, onPress, padding = spacing.md, featured, style, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: featured ? radius.xl : radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding,
    ...elevation[1],
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [base, pressed && { backgroundColor: colors.surfaceAlt }, style]}>
      {children}
    </Pressable>
  );
}
