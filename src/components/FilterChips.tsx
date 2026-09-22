import React from 'react';
import { ScrollView } from 'react-native';
import { spacing } from '../theme/tokens';
import { Chip } from './Chip';

export function FilterChips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}>
      {options.map((o) => <Chip key={o} label={o} selected={o === value} onPress={() => onChange(o)} />)}
    </ScrollView>
  );
}
