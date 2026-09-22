import React, { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { control, fontFor, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

interface Props extends TextInputProps { label: string; error?: string }

export function AppInput({ label, error, editable = true, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: spacing.micro }}>
      <AppText variant="labelMd" tone="secondary">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.textMuted}
        style={{ minHeight: control.heightMd, paddingHorizontal: spacing.sm, borderRadius: radius.input, borderWidth: focused || error ? 2 : 1, borderColor: error ? colors.error : focused ? colors.focusRing : colors.border, backgroundColor: editable ? colors.surface : colors.surfaceAlt, color: colors.textPrimary, fontFamily: fontFor('regular'), fontSize: 16, outlineStyle: 'none' } as any}
        {...rest}
      />
      {/* Error is icon + text below the field, never just a red border. */}
      {error && (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <CircleAlert size={14} color={colors.error} />
          <AppText variant="bodySm" tone="error">{error}</AppText>
        </View>
      )}
    </View>
  );
}
