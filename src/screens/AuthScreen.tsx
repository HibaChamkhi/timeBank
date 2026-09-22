import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { useAuth } from '../auth/AuthProvider';
import { t } from '../i18n';
import { AppButton, AppInput, AppText, LanguagePicker } from '../components';

export function AuthScreen() {
  const { colors } = useTheme();
  const { insets } = useAdaptiveLayout();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const submit = async () => {
    setError(null);
    if (signup && name.trim().length < 2) return setError(t('auth.err.name'));
    if (!email.includes('@')) return setError(t('auth.err.email'));
    if (password.length < 6) return setError(t('auth.err.password'));
    setBusy(true);
    const err = signup ? await signUp(name, email, password) : await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.md }}>
          <View style={{ alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md }}>
            <Image source={require('../../assets/logo.png')} accessibilityLabel={t('auth.logo')} style={{ width: 88, height: 88, borderRadius: radius.xl }} />
            <AppText variant="displayMd" accessibilityRole="header">TimeBank</AppText>
            <AppText variant="bodyMd" tone="secondary" style={{ textAlign: 'center' }}>
              {signup ? t('auth.tagline.signup') : t('auth.tagline.signin')}
            </AppText>
          </View>

          {signup && <AppInput label={t('auth.name')} value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />}
          <AppInput label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <AppInput label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete={signup ? 'new-password' : 'current-password'} error={error ?? undefined} />

          <AppButton label={signup ? t('auth.signup') : t('auth.signin')} size="lg" fullWidth loading={busy} onPress={submit} />
          <AppButton
            label={signup ? t('auth.toSignin') : t('auth.toSignup')}
            variant="ghost"
            fullWidth
            onPress={() => { setError(null); setMode(signup ? 'signin' : 'signup'); }}
          />
          <View style={{ alignItems: 'center', marginTop: spacing.md }}><LanguagePicker /></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
