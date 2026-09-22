import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { t } from '../i18n';
import { backendConfigured, supabase } from '../lib/supabase';

interface AuthValue {
  /** True while the stored session is being restored at launch. */
  loading: boolean;
  session: Session | null;
  /** No backend configured: the app runs on sample data without accounts. */
  demo: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return t('auth.err.invalid');
  if (m.includes('already registered')) return t('auth.err.exists');
  if (m.includes('password')) return t('auth.err.password');
  if (m.includes('email')) return t('auth.err.email');
  if (m.includes('network') || m.includes('fetch')) return t('auth.err.network');
  return t('auth.err.generic');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(backendConfigured);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      demo: !backendConfigured,
      signIn: async (email, password) => {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
        return error ? friendlyAuthError(error.message) : null;
      },
      signUp: async (name, email, password) => {
        const { error } = await supabase!.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
        return error ? friendlyAuthError(error.message) : null;
      },
      signOut: async () => { await supabase?.auth.signOut(); },
    }),
    [loading, session],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
