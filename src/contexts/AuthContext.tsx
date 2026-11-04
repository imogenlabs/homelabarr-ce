import { createContext, useContext } from 'react';

// The provider lives in AuthProvider.tsx so this file exports no components
// and Fast Refresh keeps working for both.

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  lastLogin: string | null;
  mustChangePassword?: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ mfa_required?: boolean; ticket?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
