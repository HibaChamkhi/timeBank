import React from 'react';
import { View } from 'react-native';
import { CircleAlert, type LucideIcon } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { t } from '../i18n';
import { AppButton } from './AppButton';

interface Props {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
}

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, tone = 'default' }: Props) {
  const { colors } = useTheme();
  const isError = tone === 'error';
  return (
    <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.sm }}>
      <View style={{ width: 64, height: 64, borderRadius: radius.full, backgroundColor: isError ? colors.errorSoft : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={32} color={isError ? colors.error : colors.primary} />
      </View>
      <AppText variant="h3" style={{ textAlign: 'center' }} accessibilityRole="header">{title}</AppText>
      <AppText variant="bodyMd" tone="secondary" style={{ textAlign: 'center', maxWidth: 360 }}>{message}</AppText>
      {actionLabel && <View style={{ marginTop: spacing.xs }}><AppButton label={actionLabel} onPress={onAction} variant={isError ? 'secondary' : 'primary'} /></View>}
    </View>
  );
}

// Errors say what happened, whether anything was saved, and what to do next.
export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return <EmptyState tone="error" icon={CircleAlert} title={title} message={message} actionLabel={onRetry ? t('common.tryAgain') : undefined} onAction={onRetry} />;
}
