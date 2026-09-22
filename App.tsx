import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotoSansArabic_400Regular, NotoSansArabic_500Medium, NotoSansArabic_600SemiBold, NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic';
import { I18nProvider, LocaleView } from './src/i18n/I18nProvider';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { AdaptiveLayoutProvider } from './src/layout/AdaptiveLayout';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { AuthScreen } from './src/screens/AuthScreen';
import { ApiProvider, useApiContext } from './src/data/ApiProvider';
import { ToastProvider } from './src/lib/Toast';

/** Dark icons on light backgrounds and the reverse, following the app theme. */
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />;
}

/** Signed-in members see the app; everyone else sees sign-in (or the demo when no backend is set up). */
function Root() {
  const { loading, session, demo } = useAuth();
  const { api } = useApiContext();
  if (loading || ((demo || session) && !api)) return null;
  return <LocaleView>{demo || session ? <AppNavigator /> : <AuthScreen />}</LocaleView>;
}

export default function App() {
  const [loaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    NotoSansArabic_400Regular, NotoSansArabic_500Medium, NotoSansArabic_600SemiBold, NotoSansArabic_700Bold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <I18nProvider>
      <ThemeProvider>
        <AdaptiveLayoutProvider>
          <ThemedStatusBar />
          <ToastProvider>
            <AuthProvider>
              <ApiProvider>
                <Root />
              </ApiProvider>
            </AuthProvider>
          </ToastProvider>
        </AdaptiveLayoutProvider>
      </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
