import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, apiFetchRaw } from '../lib/api';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  lastLogin: string | null;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ mfa_required?: boolean; ticket?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session bootstrap: checkAuth sets user/loading on resolve, with a 1500ms cold-load retry. This is the documented "subscribe to an external system" effect shape; no cleaner idiom without a data-fetching library.
    checkAuth().then(ok => {
      if (!ok) {
        setTimeout(() => checkAuth(), 1500);
      }
    });
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
