import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { DemoApi } from './demoApi';
import { friendlyError } from './errors';
import { SupabaseApi } from './supabaseApi';
import type { Api } from './types';

interface Ctx { api: Api | null; version: number; bump: () => void }
const ApiCtx = createContext<Ctx>({ api: null, version: 0, bump: () => {} });

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { session, demo } = useAuth();
  const [api, setApi] = useState<Api | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    if (demo) {
      const d = new DemoApi();
      off = d.subscribe(bump);
      setApi(d);
    } else if (session && supabase) {
      supabase.from('profiles').select('full_name').eq('id', session.user.id).single().then(({ data }) => {
        if (!cancelled) setApi(new SupabaseApi(supabase!, session.user.id, data?.full_name || 'there'));
      });
    } else {
      setApi(null);
    }
    return () => { cancelled = true; off?.(); };
  }, [demo, session?.user.id, bump]);

  const value = useMemo(() => ({ api, version, bump }), [api, version, bump]);
  return <ApiCtx.Provider value={value}>{children}</ApiCtx.Provider>;
}

export const useApiContext = () => useContext(ApiCtx);
export function useApi(): Api {
  const { api } = useContext(ApiCtx);
  if (!api) throw new Error('useApi used before sign-in');
  return api;
}

interface DataState<T> { data: T | null; error: string | null; loading: boolean; reload: () => void }

/** Loads data and reloads it after any action (and optionally on a timer). */
export function useData<T>(load: (api: Api) => Promise<T>, deps: unknown[] = [], pollMs?: number): DataState<T> {
  const { api, version } = useContext(ApiCtx);
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!api) return;
    let alive = true;
    loadRef.current(api).then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (e) => alive && setState((s) => ({ data: s.data, error: friendlyError(e).message, loading: false })),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, version, tick, ...deps]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => setTick((n) => n + 1), pollMs);
    return () => clearInterval(t);
  }, [pollMs]);

  return { ...state, reload: () => setTick((n) => n + 1) };
}

/** Runs a mutation, refreshes all screens, and returns an error message (or null). */
export function useAction() {
  const { bump } = useContext(ApiCtx);
  return useCallback(async (fn: () => Promise<unknown>): Promise<string | null> => {
    try { await fn(); bump(); return null; } catch (e) { bump(); return friendlyError(e).message; }
  }, [bump]);
}
