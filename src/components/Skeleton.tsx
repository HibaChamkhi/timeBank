import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, ViewStyle } from 'react-native';
import { motion, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export function Skeleton({ width = '100%', height = 16, style }: { width?: number | `${number}%`; height?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: motion.slow * 3, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: motion.slow * 3, useNativeDriver: true }),
      ]));
      loop.start();
    });
    return () => loop?.stop();
  }, [opacity]);
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no" style={[{ width, height, borderRadius: radius.input, backgroundColor: colors.surfaceAlt, opacity }, style]} />;
}
