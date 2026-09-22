import type { Skill } from '../data/types';
import type { Tx } from '../components/CreditTransaction';

// Static samples for the design-system gallery only.
export const offers: Skill[] = [
  { id: '1', title: 'UI/UX portfolio review', category: 'Design', description: '', creditsPerHour: 1, ownerId: 'x', ownerName: 'Sarah Martin', ownerHeadline: 'UI/UX Designer', rating: 4.9, reviewCount: 24, sessionsCompleted: 24 },
  { id: '2', title: 'English conversation', category: 'Languages', description: '', creditsPerHour: 1, ownerId: 'y', ownerName: 'Karim Ben Ali', ownerHeadline: 'English Tutor', rating: null, reviewCount: 0, sessionsCompleted: 0 },
];
export const txs: Tx[] = [
  { id: 't1', hours: 1.5, title: 'English tutoring', counterpart: 'with Lea Dubois', status: 'completed' },
  { id: 't2', hours: -1, title: 'CV review', counterpart: 'with Sarah Martin', status: 'completed' },
  { id: 't3', hours: -1, title: 'Portfolio feedback', counterpart: 'with Omar Haddad', status: 'pending' },
];
export const filters = ['All', 'Nearby', 'Online', 'Available today', 'Highly rated', 'My interests'];
