// CONNECTION TIMEOUT FIX - Must be at very top before any imports
const CONNECTION_TIMEOUT = 30000; // 30 seconds

const timeoutId = setTimeout(() => {
  console.error('[CONNECTION] App initialization timeout - forcing reload');
  if (!document.querySelector('#root')?.hasChildNodes()) {
    window.location.reload();
  }
}, CONNECTION_TIMEOUT);

window.addEventListener('load', () => {
  clearTimeout(timeoutId);
  console.log('[CONNECTION] App loaded successfully');
});

window.addEventListener('error', (event) => {
  console.error('[CONNECTION] Global error caught:', event.error);
  if (event.error?.message?.includes('fetch') || event.error?.message?.includes('network')) {
    console.error('[CONNECTION] Network error detected during initialization');
  }
});

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAnalytics } from "@/lib/analytics";

// Emergency: Clear all caches if app version changed
const APP_VERSION = '1.0.3';
const lastVersion = localStorage.getItem('app_version');

if (lastVersion !== APP_VERSION) {
  console.log('[EMERGENCY] Clearing caches due to version change');
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('app_version', APP_VERSION);
}

// Initialize analytics
initAnalytics();

// Global error handler for wallet extension errors (MetaMask, etc.)
// These errors come from browser extensions and should not crash the app
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || '';
  if (
    message.includes('MetaMask') ||
    message.includes('wallet') ||
    message.includes('connect') ||
    message.includes('extension') ||
    message.includes('provider') ||
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout')
  ) {
    console.warn('[CONNECTION] Suppressed rejection:', message);
    event.preventDefault();
  }
});

// Service Worker Management
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Production: Register service worker
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed silently
      });
    });
  } else {
    // Development: Unregister any existing service workers
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
