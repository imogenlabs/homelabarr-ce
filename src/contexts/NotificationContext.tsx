import React, { createContext, useContext, useCallback } from "react";
import { toast } from "sonner";

interface NotificationContextType {
  notifications: never[];
  addNotification: (notification: { type: string; title: string; message?: string }) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const success = useCallback((title: string, message?: string) => {
    toast.success(title, { description: message });
  }, []);

  const error = useCallback((title: string, message?: string) => {
    toast.error(title, { description: message, duration: 8000 });
  }, []);

  const warning = useCallback((title: string, message?: string) => {
    toast.warning(title, { description: message, duration: 6000 });
  }, []);

  const info = useCallback((title: string, message?: string) => {
    toast.info(title, { description: message });
  }, []);

  const addNotification = useCallback((notification: { type: string; title: string; message?: string }) => {
    const fn = notification.type === "success" ? toast.success
      : notification.type === "error" ? toast.error
      : notification.type === "warning" ? toast.warning
      : toast.info;
    fn(notification.title, { description: notification.message });
  }, []);

  const removeNotification = useCallback(() => {}, []);

  return (
    <NotificationContext.Provider value={{
      notifications: [],
      addNotification,
      removeNotification,
      success,
      error,
      warning,
      info,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
