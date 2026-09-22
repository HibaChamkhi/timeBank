import React from 'react';
import { View } from 'react-native';
import { spacing } from '../theme/tokens';
import type { Skill } from '../data/types';
import { categoryLabel, t } from '../i18n';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { AppButton } from './AppButton';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Rating } from './Rating';
import { CreditAmount } from './CreditBalance';

// Hierarchy: person → skill → trust → cost in time → action.
export function SkillCard({ skill, onPress, onBook }: { skill: Skill; onPress?: () => void; onBook?: () => void }) {
  return (
    <AppCard padding={spacing.lg} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <Avatar name={skill.ownerName} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="h3" numberOfLines={1}>{skill.ownerName}</AppText>
          <AppText variant="bodyMd" tone="secondary" numberOfLines={1}>{skill.ownerHeadline || t('skill.member')}</AppText>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <AppText variant="labelLg" numberOfLines={2}>{skill.title}</AppText>
        <View style={{ flexDirection: 'row' }}><Badge label={categoryLabel(skill.category)} /></View>
      </View>
      <Rating value={skill.rating} sessions={skill.sessionsCompleted || undefined} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <CreditAmount hours={skill.creditsPerHour} />
        <AppText variant="bodySm" tone="muted">{t('unit.perHour')}</AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <View style={{ flex: 1 }}><AppButton label={t('skill.viewProfile')} variant="secondary" fullWidth onPress={onPress} /></View>
        {onBook && <View style={{ flex: 1 }}><AppButton label={t('skill.book')} fullWidth onPress={onBook} /></View>}
      </View>
    </AppCard>
  );
}
