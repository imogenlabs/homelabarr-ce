import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationProvider } from "./contexts/NotificationProvider";
import { AuthProvider } from "./contexts/AuthProvider";
import { ThemeProvider } from "./contexts/ThemeProvider";
import App from "./App.tsx";
import "./index.css";
import { getTheme, setTheme } from "./lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { startAnalytics } from "./lib/analytics";
import { getInstance } from "./lib/api";

try {
  ['homelabarr_token', 'homelabarr_user', 'homelabarr_jwt'].forEach(k => localStorage.removeItem(k));
} catch {
  /* no-op: clearing legacy localStorage keys is best-effort */
}

setTheme(getTheme());
startAnalytics(getInstance);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <App />
            <Toaster position="bottom-right" richColors />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
