import { useState } from 'react';
import { Bell, BellOff, Check, CheckCheck, Trash2, Settings, X, TrendingUp, ShoppingBag, Gavel, Gamepad2, Tag, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/context/NotificationsContext';
import { NotificationType } from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const { unreadCount, isOpen, setIsOpen } = useNotifications();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative text-gray-400 hover:text-cyan-400 transition-colors"
        data-testid="button-notification-bell"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-cyan-500 text-black text-[10px] font-bold rounded-full px-1"
              data-testid="text-unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
      <NotificationDrawer />
    </>
  );
}

function NotificationDrawer() {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    preferences,
    updatePreferences,
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'price_alert':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'new_listing':
        return <Tag className="w-4 h-4 text-purple-400" />;
      case 'governance':
        return <Gavel className="w-4 h-4 text-yellow-400" />;
      case 'game_event':
        return <Gamepad2 className="w-4 h-4 text-pink-400" />;
      case 'offer_received':
        return <ShoppingBag className="w-4 h-4 text-orange-400" />;
      case 'sale':
        return <DollarSign className="w-4 h-4 text-cyan-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[400px] bg-black/95 border-cyan-500/30 p-0"
      >
        <SheetHeader className="p-4 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-orbitron text-cyan-400 text-sm tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4" />
              NOTIFICATION CENTER
              {unreadCount > 0 && (
                <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className={`h-8 w-8 ${showSettings ? 'text-cyan-400' : 'text-gray-400'} hover:text-cyan-300`}
                data-testid="button-notification-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-orbitron text-xs text-cyan-400 tracking-wider">PREFERENCES</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  <X className="w-3 h-3 mr-1" /> Close
                </Button>
              </div>

              <div className="space-y-4">
                <SettingToggle
                  label="Price Alerts"
                  description="Get notified of significant price changes"
                  checked={preferences.priceAlerts}
                  onCheckedChange={(v) => updatePreferences({ priceAlerts: v })}
                  testId="switch-price-alerts"
                />
                
                {preferences.priceAlerts && (
                  <div className="ml-4 space-y-2">
                    <label className="text-xs text-gray-400">
                      Alert threshold: {preferences.priceChangeThreshold}%
                    </label>
                    <Slider
                      value={[preferences.priceChangeThreshold]}
                      onValueChange={([v]) => updatePreferences({ priceChangeThreshold: v })}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                      data-testid="slider-price-threshold"
                    />
                  </div>
                )}

                <SettingToggle
                  label="New Listings"
                  description="When new Guardians are listed for sale"
                  checked={preferences.newListings}
                  onCheckedChange={(v) => updatePreferences({ newListings: v })}
                  testId="switch-new-listings"
                />

                <SettingToggle
                  label="Sales"
                  description="When Guardians are sold on the marketplace"
                  checked={preferences.saleAlerts}
                  onCheckedChange={(v) => updatePreferences({ saleAlerts: v })}
                  testId="switch-sales"
                />

                <SettingToggle
                  label="Governance"
                  description="New proposals and voting deadlines"
                  checked={preferences.governance}
                  onCheckedChange={(v) => updatePreferences({ governance: v })}
                  testId="switch-governance"
                />

                <SettingToggle
                  label="Game Events"
                  description="High scores and rank achievements"
                  checked={preferences.gameEvents}
                  onCheckedChange={(v) => updatePreferences({ gameEvents: v })}
                  testId="switch-game-events"
                />

                <SettingToggle
                  label="Offers"
                  description="When you receive offers on your NFTs"
                  checked={preferences.offerAlerts}
                  onCheckedChange={(v) => updatePreferences({ offerAlerts: v })}
                  testId="switch-offers"
                />
              </div>

              <div className="pt-4 border-t border-cyan-500/20">
                <Button
                  variant="outline"
                  onClick={clearNotifications}
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                  data-testid="button-clear-all"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Clear All Notifications
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-[calc(100vh-80px)]"
            >
              {unreadCount > 0 && (
                <div className="p-2 border-b border-cyan-500/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="w-full text-cyan-400 hover:bg-cyan-500/10 text-xs"
                    data-testid="button-mark-all-read"
                  >
                    <CheckCheck className="w-3 h-3 mr-2" />
                    Mark all as read
                  </Button>
                </div>
              )}

              <Tabs defaultValue="all" className="flex-1 flex flex-col">
                <TabsList className="w-full bg-black/50 border-b border-cyan-500/20 rounded-none p-0">
                  <TabsTrigger 
                    value="all" 
                    className="flex-1 text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 rounded-none"
                  >
                    All ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="unread" 
                    className="flex-1 text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 rounded-none"
                  >
                    Unread ({unreadCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="flex-1 m-0 mt-0">
                  <NotificationList
                    notifications={notifications}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    getIcon={getIcon}
                  />
                </TabsContent>

                <TabsContent value="unread" className="flex-1 m-0 mt-0">
                  <NotificationList
                    notifications={unreadNotifications}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    getIcon={getIcon}
                    emptyMessage="No unread notifications"
                  />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId: string;
}

function SettingToggle({ label, description, checked, onCheckedChange, testId }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <label className="text-sm text-white">{label}</label>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        data-testid={testId}
      />
    </div>
  );
}

interface NotificationListProps {
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
  }>;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  getIcon: (type: NotificationType) => React.ReactNode;
  emptyMessage?: string;
}

function NotificationList({ 
  notifications, 
  onMarkRead, 
  onDelete, 
  getIcon,
  emptyMessage = "No notifications yet" 
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
        <BellOff className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm">{emptyMessage}</p>
        <p className="text-xs mt-1">We'll let you know when something happens</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-cyan-500/10">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`p-3 hover:bg-cyan-500/5 transition-colors relative group ${
              !notification.read ? 'bg-cyan-500/5' : ''
            }`}
            data-testid={`notification-item-${notification.id}`}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${
                    notification.read ? 'text-gray-400' : 'text-white'
                  }`}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <span className="flex-shrink-0 w-2 h-2 bg-cyan-400 rounded-full mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-[10px] text-gray-600 mt-1">
                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMarkRead(notification.id)}
                  className="h-6 w-6 text-gray-500 hover:text-cyan-400"
                  data-testid={`button-mark-read-${notification.id}`}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(notification.id)}
                className="h-6 w-6 text-gray-500 hover:text-red-400"
                data-testid={`button-delete-${notification.id}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
}
