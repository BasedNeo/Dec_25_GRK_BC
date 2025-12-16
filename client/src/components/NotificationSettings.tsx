import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAccount } from "wagmi";
import { showToast } from "@/lib/customToast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NotificationPreferences {
  notifyListings: boolean;
  notifyOffers: boolean;
  notifySales: boolean;
}

export function NotificationSettings() {
  const { address, isConnected } = useAccount();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notifyListings: true,
    notifyOffers: true,
    notifySales: true,
  });
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (address) {
      checkSubscriptionStatus();
    }
  }, [address]);

  const checkSubscriptionStatus = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/push/status/${address}`);
      const data = await response.json();
      setIsSubscribed(data.subscribed);
      if (data.preferences) {
        setPreferences(data.preferences);
      }

      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setSubscription(sub);
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      showToast("Your browser doesn't support notifications", "error");
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      showToast("Notifications are blocked. Please enable them in your browser settings.", "error");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const subscribe = async () => {
    if (!address) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    setIsLoading(true);

    try {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        showToast("Push notifications are not supported in your browser", "error");
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const vapidResponse = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await vapidResponse.json();

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const p256dhArray = new Uint8Array(sub.getKey('p256dh')!);
      const authArray = new Uint8Array(sub.getKey('auth')!);
      const p256dh = btoa(String.fromCharCode.apply(null, Array.from(p256dhArray)));
      const auth = btoa(String.fromCharCode.apply(null, Array.from(authArray)));

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          endpoint: sub.endpoint,
          p256dh,
          auth,
          ...preferences,
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setSubscription(sub);
        showToast("Notifications enabled! You'll be notified of marketplace activity.", "success");
      } else {
        throw new Error('Failed to subscribe');
      }
    } catch (error) {
      console.error("Subscription error:", error);
      showToast("Failed to enable notifications. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);

    try {
      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription?.endpoint }),
      });

      setIsSubscribed(false);
      setSubscription(null);
      showToast("Notifications disabled", "info");
    } catch (error) {
      console.error("Unsubscribe error:", error);
      showToast("Failed to disable notifications", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    if (subscription) {
      try {
        await fetch('/api/push/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            ...newPreferences,
          }),
        });
      } catch (error) {
        console.error("Error updating preferences:", error);
      }
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Popover open={showSettings} onOpenChange={setShowSettings}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${isSubscribed ? 'text-cyan-400' : 'text-gray-400'} hover:text-cyan-300`}
          data-testid="button-notifications"
        >
          {isSubscribed ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
          {isSubscribed && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-black/95 border-cyan-500/30 text-white p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-orbitron text-sm text-cyan-400">NOTIFICATIONS</h4>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
          </div>

          {!isSubscribed ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Get notified when there's activity on your NFTs or new marketplace listings.
              </p>
              <Button
                onClick={subscribe}
                disabled={isLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron text-xs"
                data-testid="button-enable-notifications"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                ENABLE NOTIFICATIONS
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300">New Listings</label>
                  <Switch
                    checked={preferences.notifyListings}
                    onCheckedChange={(v) => updatePreferences('notifyListings', v)}
                    data-testid="switch-notify-listings"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300">Offers Received</label>
                  <Switch
                    checked={preferences.notifyOffers}
                    onCheckedChange={(v) => updatePreferences('notifyOffers', v)}
                    data-testid="switch-notify-offers"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300">Sales & Purchases</label>
                  <Switch
                    checked={preferences.notifySales}
                    onCheckedChange={(v) => updatePreferences('notifySales', v)}
                    data-testid="switch-notify-sales"
                  />
                </div>
              </div>

              <Button
                onClick={unsubscribe}
                disabled={isLoading}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs"
                data-testid="button-disable-notifications"
              >
                <BellOff className="w-4 h-4 mr-2" />
                DISABLE NOTIFICATIONS
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
