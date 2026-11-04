import { createContext, useContext } from "react";

// The provider lives in NotificationProvider.tsx so this file exports no
// components and Fast Refresh keeps working for both.

export interface NotificationContextType {
  notifications: never[];
  addNotification: (notification: { type: string; title: string; message?: string }) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
