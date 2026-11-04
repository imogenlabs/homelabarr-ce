import React, { useCallback } from "react";
import { toast } from "sonner";
import { NotificationContext } from "./NotificationContext";

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
