import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiFetchRaw } from '../lib/api';
import { AuthContext, type User } from './AuthContext';

// What /auth/me said: signed in, signed out, or "too many requests, ask again later".
type AuthCheck = { status: 'in' | 'out' } | { status: 'wait'; retryAfterMs: number };

// Retry-After is seconds (or an HTTP date). Wait at least a second, at most a minute.
function retryAfterMs(res: Response): number {
  const header = res.headers?.get?.('Retry-After');
  const seconds = header ? Number(header) : NaN;
  const ms = Number.isFinite(seconds)
    ? seconds * 1000
    : header ? Date.parse(header) - Date.now() : NaN;
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 1000), 60_000) : 5000;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async (): Promise<AuthCheck> => {
    try {
      const res = await apiFetchRaw('/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setLoading(false);
        return { status: 'in' };
      }
      // A 429 says nothing about the session. Showing the login screen here
      // would sign the user out and push them into the login limit too, so
      // keep loading and ask again when the server allows (HLCE-382).
      if (res.status === 429) {
        return { status: 'wait', retryAfterMs: retryAfterMs(res) };
      }
    } catch { /* network error: treat as signed out, as before */ }
    setUser(null);
    setLoading(false);
    return { status: 'out' };
  }, []);

  useEffect(() => {
    // Track the cold-load retry timer + a cancelled flag so an unmount within
    // the 1500ms window clears the pending timer and can't setState on an
    // unmounted provider (HLCE-280).
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let coldLoadRetried = false;
    const run = () => checkAuth().then(result => {
      if (cancelled) return;
      if (result.status === 'wait') {
        retryTimer = setTimeout(run, result.retryAfterMs);
      } else if (result.status === 'out' && !coldLoadRetried) {
        coldLoadRetried = true;
        retryTimer = setTimeout(run, 1500);
      }
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session bootstrap: checkAuth sets user/loading on resolve, with a 1500ms cold-load retry and a Retry-After wait on 429. This is the documented "subscribe to an external system" effect shape; no cleaner idiom without a data-fetching library.
    run();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [checkAuth]);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('hl-session-dead', handler);
    return () => window.removeEventListener('hl-session-dead', handler);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.details || err.error || 'Login failed');
    }

    const data = await res.json();
    if (data.mfa_required) {
      return { mfa_required: true, ticket: data.ticket as string };
    }
    setUser(data.user);
    return {};
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
