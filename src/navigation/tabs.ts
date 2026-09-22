import { Compass, House, Receipt, UserRound, type LucideIcon } from 'lucide-react-native';

export type TabKey = 'home' | 'discover' | 'activity' | 'profile';
import { t } from '../i18n';

/** Labels are read at render time so they follow the active language. */
export const tabs: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: 'home', get label() { return t('tab.home'); }, Icon: House },
  { key: 'discover', get label() { return t('tab.discover'); }, Icon: Compass },
  { key: 'activity', get label() { return t('tab.activity'); }, Icon: Receipt },
  { key: 'profile', get label() { return t('tab.profile'); }, Icon: UserRound },
];
