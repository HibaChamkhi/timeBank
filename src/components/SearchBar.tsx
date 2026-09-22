import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { control, fontFor, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { t } from '../i18n';

export function SearchBar({ value, onChangeText, placeholder = t('discover.search') }: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, height: control.heightMd, paddingHorizontal: spacing.sm, borderRadius: radius.input, borderWidth: focused ? 2 : 1, borderColor: focused ? colors.focusRing : colors.border, backgroundColor: colors.surface }}>
      <Search size={20} color={colors.textMuted} />
      <TextInput
        accessibilityLabel={t('discover.searchA11y')}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, fontFamily: fontFor('regular'), fontSize: 16, color: colors.textPrimary, outlineStyle: 'none' } as any}
      />
    </View>
  );
}
