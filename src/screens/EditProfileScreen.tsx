import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { spacing } from '../theme/tokens';
import { useAction, useApi, useData } from '../data/ApiProvider';
import { t } from '../i18n';
import { useToast } from '../lib/Toast';
import { useNav } from '../navigation/NavContext';
import { AppButton, AppInput } from '../components';
import { ScreenScaffold } from './ScreenScaffold';

export function EditProfileScreen() {
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const nav = useNav();
  const me = useData((a) => a.getPerson(a.userId));
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me.data && !loaded) { setName(me.data.name); setHeadline(me.data.headline); setBio(me.data.bio); setLoaded(true); }
  }, [me.data, loaded]);

  const save = async () => {
    if (name.trim().length < 2) return setError(t('edit.err.name'));
    setBusy(true);
    const err = await act(() => api.updateProfile({ name, headline, bio }));
    setBusy(false);
    if (err) return setError(err);
    toast(t('edit.saved'));
    nav.pop();
  };

  return (
    <ScreenScaffold title={t('edit.title')} onBack={nav.pop}>
      <View style={{ gap: spacing.md }}>
        <AppInput label={t('edit.name')} value={name} onChangeText={(v) => { setName(v); setError(null); }} maxLength={80} autoCapitalize="words" error={error ?? undefined} />
        <AppInput label={t('edit.headline')} value={headline} onChangeText={setHeadline} maxLength={80} placeholder={t('edit.headlinePlaceholder')} />
        <AppInput label={t('edit.bio')} value={bio} onChangeText={setBio} maxLength={500} multiline placeholder={t('edit.bioPlaceholder')} />
        <AppButton label={t('edit.save')} size="lg" fullWidth loading={busy} onPress={save} />
      </View>
    </ScreenScaffold>
  );
}
