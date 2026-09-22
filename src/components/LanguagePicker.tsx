import React from 'react';
import { View } from 'react-native';
import { spacing } from '../theme/tokens';
import { LOCALES, t } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import { Chip } from './Chip';

export function LanguagePicker() {
  const { locale, setLocale } = useI18n();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('lang.label')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {LOCALES.map((l) => <Chip key={l} label={t(`lang.${l}` as const)} selected={l === locale} onPress={() => setLocale(l)} />)}
    </View>
  );
}
