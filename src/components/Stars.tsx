import React from 'react';
import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { t } from '../i18n';

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} accessibilityRole="radio" accessibilityLabel={n === 1 ? t('review.star') : t('review.stars', { count: n })} accessibilityState={{ selected: value === n }} onPress={() => onChange(n)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Star size={34} color={n <= value ? colors.warning : colors.border} fill={n <= value ? colors.warning : 'transparent'} />
        </Pressable>
      ))}
    </View>
  );
}
