import React, { createContext, useContext, useMemo, useState } from 'react';
import { View, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';

/**
 * Layout is derived from the window, never the device model. Size classes follow
 * the common compact / medium / expanded convention so a folded flip phone,
 * a normal phone, an unfolded foldable, an iPad and a browser all resolve the same way.
 */
export type SizeClass = 'compact' | 'medium' | 'expanded';

export interface Hinge {
  /** Vertical (left/right panes) or horizontal (top/bottom panes) fold. */
  orientation: 'vertical' | 'horizontal';
  /** Hinge rectangle in window coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AdaptiveLayoutValue {
  windowWidth: number;
  windowHeight: number;
  availableWidth: number;
  sizeClass: SizeClass;
  isLandscape: boolean;
  columns: 1 | 2 | 3;
  horizontalPadding: number;
  maxContentWidth: number;
  navigation: 'bottom-tabs' | 'sidebar';
  insets: { top: number; bottom: number; left: number; right: number };
  /** null on non-foldable windows. Content must never be placed under it. */
  hinge: Hinge | null;
}

export const breakpoints = { medium: 600, expanded: 840 } as const;
export const maxContentWidth = 1120;

const Ctx = createContext<AdaptiveLayoutValue | null>(null);

export function AdaptiveLayoutProvider({
  children,
  hinge = null,
}: {
  children: React.ReactNode;
  /** Wire a native fold-posture source here when one is available. */
  hinge?: Hinge | null;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const value = useMemo<AdaptiveLayoutValue>(() => {
    const sizeClass: SizeClass = width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';
    const horizontalPadding = sizeClass === 'compact' ? spacing.md : sizeClass === 'medium' ? spacing.xl : spacing.xxl;
    const navigation = sizeClass === 'expanded' ? 'sidebar' : 'bottom-tabs';
    const sidebar = navigation === 'sidebar' ? 240 : 0;
    const availableWidth = width - sidebar - insets.left - insets.right;
    const columns = availableWidth >= 960 ? 3 : availableWidth >= 560 ? 2 : 1;
    return {
      windowWidth: width,
      windowHeight: height,
      availableWidth,
      sizeClass,
      isLandscape: width > height,
      columns,
      horizontalPadding,
      maxContentWidth,
      navigation,
      insets,
      hinge,
    };
  }, [width, height, insets, hinge]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdaptiveLayout() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdaptiveLayout must be used inside AdaptiveLayoutProvider');
  return ctx;
}

/** Centered, max-width, safe-area-aware content column. */
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { horizontalPadding, maxContentWidth: max } = useAdaptiveLayout();
  return (
    <View style={[{ width: '100%', maxWidth: max, alignSelf: 'center', paddingHorizontal: horizontalPadding }, style]}>
      {children}
    </View>
  );
}

/**
 * Responsive grid: column count comes from the grid's own measured width, so it stays
 * correct beside a sidebar or split pane. Cards never get narrower than minItemWidth.
 */
export function AdaptiveGrid<T>({
  data,
  renderItem,
  keyExtractor,
  gap = spacing.md,
  minItemWidth = 300,
}: {
  data: T[];
  renderItem: (item: T) => React.ReactElement;
  keyExtractor: (item: T) => string;
  gap?: number;
  minItemWidth?: number;
}) {
  const [width, setWidth] = useState(0);
  const columns = width ? Math.max(1, Math.floor((width + gap) / (minItemWidth + gap))) : 1;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {data.map((item) => (
        <View key={keyExtractor(item)} style={{ width: `${100 / columns}%`, padding: gap / 2 }}>
          {renderItem(item)}
        </View>
      ))}
    </View>
  );
}

/**
 * Two panes when there is room, one stacked column otherwise. If a hinge splits the window,
 * the panes are placed on either side of it so nothing sits under the fold.
 */
export function SplitPane({ primary, secondary, secondaryWidth = 280 }: { primary: React.ReactNode; secondary: React.ReactNode; secondaryWidth?: number }) {
  const { sizeClass, hinge } = useAdaptiveLayout();
  if (sizeClass === 'compact') {
    return (
      <View style={{ gap: spacing.md }}>
        {secondary}
        {primary}
      </View>
    );
  }
  const gutter = hinge && hinge.orientation === 'vertical' ? hinge.width : spacing.xl;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ width: secondaryWidth }}>{secondary}</View>
      <View style={{ width: gutter }} />
      <View style={{ flex: 1 }}>{primary}</View>
    </View>
  );
}
