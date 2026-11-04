import { createContext, useContext } from 'react';
import type { Theme } from '../lib/theme';

// The provider lives in ThemeProvider.tsx so this file exports no components
// and Fast Refresh keeps working for both.

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
