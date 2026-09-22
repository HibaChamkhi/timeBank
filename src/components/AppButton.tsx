import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { control, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
}

export function AppButton({ label, onPress, variant = 'primary', size = 'md', icon: Icon, loading, disabled, fullWidth, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const height = { sm: control.heightSm, md: control.heightMd, lg: control.heightLg }[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      // Small buttons still get a 44pt touch target.
      hitSlop={Math.max(0, (control.minTouch - height) / 2)}
      style={({ pressed, focused }: any) => {
        const bg = {
          primary: pressed ? colors.primaryPressed : colors.primary,
          secondary: pressed ? colors.surfaceAlt : 'transparent',
          ghost: pressed ? colors.surfaceAlt : 'transparent',
          destructive: pressed ? colors.errorSoft : 'transparent',
        }[variant];
        return {
          height,
          minWidth: control.minTouch,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
          borderRadius: radius.md,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' || variant === 'destructive' ? 1 : 0,
          borderColor: variant === 'destructive' ? colors.error : colors.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.xs,
          opacity: inactive ? 0.5 : 1,
          outlineWidth: focused ? 2 : 0,
          outlineColor: colors.focusRing,
          outlineOffset: 2,
        } as any;
      }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {Icon && <Icon size={20} color={fg(variant, colors)} />}
          <AppText variant="labelLg" style={{ color: fg(variant, colors) }}>{label}</AppText>
        </View>
      )}
    </Pressable>
  );
}

function fg(variant: ButtonVariant, c: ReturnType<typeof useTheme>['colors']) {
  return variant === 'primary' ? c.onPrimary : variant === 'destructive' ? c.error : variant === 'ghost' ? c.primary : c.textPrimary;
}
