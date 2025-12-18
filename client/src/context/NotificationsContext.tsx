import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import {
  Notification,
  NotificationPreferences,
  DEFAULT_PREFERENCES,
  NotificationType,
  loadNotifications,
  saveNotifications,
  loadPreferences,
  savePreferences,
  addNotification as addNotificationToStorage,
  markAsRead as markAsReadInStorage,
  markAllAsRead as markAllAsReadInStorage,
  deleteNotification as deleteNotificationFromStorage,
  clearNotifications as clearNotificationsFromStorage,
  hasSeenId,
  addSeenId,
} from '@/lib/notifications';

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  hasSeenEvent: (eventId: string) => boolean;
  markEventSeen: (eventId: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

export function useNotificationsSafe() {
  return useContext(NotificationsContext);
}

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loaded = loadNotifications(wallet);
    setNotifications(loaded);
    const prefs = loadPreferences(wallet);
    setPreferences(prefs);
  }, [wallet]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const shouldNotify = checkPreferences(notification.type, preferences);
    if (!shouldNotify) return;
    
    const newNotification = addNotificationToStorage(notification, wallet);
    setNotifications(prev => [newNotification, ...prev].slice(0, 100));
  }, [wallet, preferences]);

  const markAsRead = useCallback((id: string) => {
    markAsReadInStorage(id, wallet);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [wallet]);

  const markAllAsRead = useCallback(() => {
    markAllAsReadInStorage(wallet);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [wallet]);

  const deleteNotification = useCallback((id: string) => {
    deleteNotificationFromStorage(id, wallet);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [wallet]);

  const clearNotifications = useCallback(() => {
    clearNotificationsFromStorage(wallet);
    setNotifications([]);
  }, [wallet]);

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...prefs };
      savePreferences(updated, wallet);
      return updated;
    });
  }, [wallet]);

  const hasSeenEvent = useCallback((eventId: string) => {
    return hasSeenId(eventId, wallet);
  }, [wallet]);

  const markEventSeen = useCallback((eventId: string) => {
    addSeenId(eventId, wallet);
  }, [wallet]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        preferences,
        isOpen,
        setIsOpen,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearNotifications,
        updatePreferences,
        hasSeenEvent,
        markEventSeen,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

function checkPreferences(type: NotificationType, prefs: NotificationPreferences): boolean {
  switch (type) {
    case 'price_alert':
      return prefs.priceAlerts;
    case 'new_listing':
      return prefs.newListings;
    case 'governance':
      return prefs.governance;
    case 'game_event':
      return prefs.gameEvents;
    case 'offer_received':
      return prefs.offerAlerts;
    case 'sale':
      return prefs.saleAlerts;
    default:
      return true;
  }
}
