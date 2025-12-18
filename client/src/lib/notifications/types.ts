export type NotificationType = 
  | 'price_alert' 
  | 'new_listing' 
  | 'governance' 
  | 'game_event'
  | 'offer_received'
  | 'sale';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  priceAlerts: boolean;
  priceChangeThreshold: number;
  newListings: boolean;
  governance: boolean;
  gameEvents: boolean;
  offerAlerts: boolean;
  saleAlerts: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  priceAlerts: true,
  priceChangeThreshold: 5,
  newListings: true,
  governance: true,
  gameEvents: true,
  offerAlerts: true,
  saleAlerts: true,
};

export const MAX_NOTIFICATIONS = 100;
