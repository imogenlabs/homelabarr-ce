import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiFetchRaw } from '../lib/api';
import { AuthContext, type User } from './AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiFetchRaw('/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch {
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Track the cold-load retry timer + a cancelled flag so an unmount within
    // the 1500ms window clears the pending timer and can't setState on an
    // unmounted provider (HLCE-280).
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session bootstrap: checkAuth sets user/loading on resolve, with a 1500ms cold-load retry. This is the documented "subscribe to an external system" effect shape; no cleaner idiom without a data-fetching library.
    checkAuth().then(ok => {
      if (!ok && !cancelled) {
        retryTimer = setTimeout(() => checkAuth(), 1500);
      }
    });
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
