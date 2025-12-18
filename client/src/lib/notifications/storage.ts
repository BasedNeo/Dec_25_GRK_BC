import { Notification, NotificationPreferences, DEFAULT_PREFERENCES, MAX_NOTIFICATIONS } from './types';

const NOTIFICATIONS_KEY_PREFIX = 'based_notifications_';
const PREFERENCES_KEY_PREFIX = 'based_notification_prefs_';
const SEEN_IDS_KEY_PREFIX = 'based_notification_seen_';

function getNotificationsKey(wallet?: string): string {
  return `${NOTIFICATIONS_KEY_PREFIX}${wallet || 'guest'}`;
}

function getPreferencesKey(wallet?: string): string {
  return `${PREFERENCES_KEY_PREFIX}${wallet || 'guest'}`;
}

function getSeenIdsKey(wallet?: string): string {
  return `${SEEN_IDS_KEY_PREFIX}${wallet || 'guest'}`;
}

export function loadNotifications(wallet?: string): Notification[] {
  try {
    const key = getNotificationsKey(wallet);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n: unknown): n is Notification => 
      typeof n === 'object' && n !== null && 'id' in n && 'type' in n
    );
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: Notification[], wallet?: string): void {
  try {
    const key = getNotificationsKey(wallet);
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[Notifications] Failed to save:', e);
  }
}

export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>, wallet?: string): Notification {
  // Use crypto.randomUUID for stronger uniqueness guarantees
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  const newNotification: Notification = {
    ...notification,
    id: uuid,
    timestamp: Date.now(),
    read: false,
  };
  
  const existing = loadNotifications(wallet);
  const updated = [newNotification, ...existing].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(updated, wallet);
  
  return newNotification;
}

export function markAsRead(notificationId: string, wallet?: string): void {
  const notifications = loadNotifications(wallet);
  const updated = notifications.map(n => 
    n.id === notificationId ? { ...n, read: true } : n
  );
  saveNotifications(updated, wallet);
}

export function markAllAsRead(wallet?: string): void {
  const notifications = loadNotifications(wallet);
  const updated = notifications.map(n => ({ ...n, read: true }));
  saveNotifications(updated, wallet);
}

export function clearNotifications(wallet?: string): void {
  const key = getNotificationsKey(wallet);
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function deleteNotification(notificationId: string, wallet?: string): void {
  const notifications = loadNotifications(wallet);
  const updated = notifications.filter(n => n.id !== notificationId);
  saveNotifications(updated, wallet);
}

export function getUnreadCount(wallet?: string): number {
  const notifications = loadNotifications(wallet);
  return notifications.filter(n => !n.read).length;
}

export function loadPreferences(wallet?: string): NotificationPreferences {
  try {
    const key = getPreferencesKey(wallet);
    const stored = localStorage.getItem(key);
    if (!stored) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: NotificationPreferences, wallet?: string): void {
  try {
    const key = getPreferencesKey(wallet);
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch (e) {
    console.error('[Notifications] Failed to save preferences:', e);
  }
}

export function loadSeenIds(wallet?: string): Set<string> {
  try {
    const key = getSeenIdsKey(wallet);
    const stored = localStorage.getItem(key);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export function saveSeenIds(ids: Set<string>, wallet?: string): void {
  try {
    const key = getSeenIdsKey(wallet);
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

export function hasSeenId(id: string, wallet?: string): boolean {
  const seen = loadSeenIds(wallet);
  return seen.has(id);
}

export function addSeenId(id: string, wallet?: string): void {
  const seen = loadSeenIds(wallet);
  seen.add(id);
  saveSeenIds(seen, wallet);
}
