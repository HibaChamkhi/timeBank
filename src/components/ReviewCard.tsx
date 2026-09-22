import React from 'react';
import { View } from 'react-native';
import { spacing } from '../theme/tokens';
import { timeAgo } from '../lib/format';
import type { Review } from '../data/types';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Rating } from './Rating';

export function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={review.reviewerName} size={32} />
        <View style={{ flex: 1 }}>
          <AppText variant="labelLg">{review.reviewerName}</AppText>
          <AppText variant="caption" tone="muted">{timeAgo(review.createdAt)}</AppText>
        </View>
        <Rating value={review.rating} />
      </View>
      {!!review.comment && <AppText variant="bodyMd" tone="secondary">{review.comment}</AppText>}
    </View>
  );
}
