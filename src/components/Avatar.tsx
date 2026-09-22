import React from 'react';
import { Image, Text, View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { fontFor, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type AvatarSize = 24 | 32 | 40 | 48 | 64 | 96;

interface Props {
  name: string;
  uri?: string;
  size?: AvatarSize;
  online?: boolean;
  verified?: boolean;
}

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export function Avatar({ name, uri, size = 40, online, verified }: Props) {
  const { colors } = useTheme();
  const dot = Math.max(8, size * 0.24);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={name} style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius.full }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text_ size={size} color={colors.primary}>{initials(name)}</Text_>
        </View>
      )}
      {online && <View style={{ position: 'absolute', right: 0, bottom: 0, width: dot, height: dot, borderRadius: radius.full, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface }} />}
      {verified && size >= 48 && (
        <View style={{ position: 'absolute', right: -2, top: -2, backgroundColor: colors.surface, borderRadius: radius.full }}>
          <BadgeCheck size={Math.round(size * 0.3)} color={colors.primary} />
        </View>
      )}
    </View>
  );
}

function Text_({ size, color, children }: { size: number; color: string; children: string }) {
  return <Text style={{ fontFamily: fontFor('semibold'), fontSize: Math.round(size * 0.38), color }} maxFontSizeMultiplier={1}>{children}</Text>;
}
