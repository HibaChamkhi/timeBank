import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import { CircleAlert, CircleCheck } from 'lucide-react-native';
import { elevation, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { isRTL } from '../i18n';
import { AppText } from '../components/AppText';

type Tone = 'success' | 'error';
const ToastCtx = createContext<(message: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { insets, navigation } = useAdaptiveLayout();
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((message: string, tone: Tone = 'success') => {
    setToast({ message, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  const Icon = toast?.tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: insets.bottom + (navigation === 'bottom-tabs' ? 84 : spacing.lg), alignItems: 'center' }}>
          <View style={{ direction: isRTL() ? 'rtl' : 'ltr', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: 480, backgroundColor: colors.textPrimary, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, ...elevation[3] }}>
            <Icon size={20} color={toast.tone === 'error' ? colors.error : colors.success} />
            <AppText variant="bodyMd" style={{ color: colors.background, flexShrink: 1 }}>{toast.message}</AppText>
          </View>
        </View>
      )}
    </ToastCtx.Provider>
  );
}
