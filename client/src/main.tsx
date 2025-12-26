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
  const message = event.error?.message || '';
  console.error('[CONNECTION] Global error caught:', event.error);
  
  // Don't crash on wallet/MetaMask errors
  if (
    message.includes('MetaMask') ||
    message.includes('wallet') ||
    message.includes('connect') ||
    message.includes('extension') ||
    message.includes('provider')
  ) {
    event.preventDefault();
    console.warn('[CONNECTION] Wallet error caught and suppressed');
    return;
  }
  
  if (message.includes('fetch') || message.includes('network')) {
    console.error('[CONNECTION] Network error detected during initialization');
  }
});

import { createRoot } from "react-dom/client";
import { ErrorBoundary } from 'react-error-boundary';
import App from "./App";
import "./index.css";
import { initAnalytics } from "@/lib/analytics";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.08)_0%,transparent_50%)]" />
      <div className="text-center p-8 relative z-10 max-w-lg">
        <div className="text-6xl mb-6">🛸</div>
        <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="mb-6 text-gray-400 text-sm">{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-black rounded-xl font-bold hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all"
          data-testid="button-error-refresh"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

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

// Performance monitoring (with legacy browser fallback)
if (typeof window !== 'undefined' && window.performance) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      let metrics: { ttfb: number; dcl: number; load: number; fcp: number } | null = null;
      
      // Try Navigation Timing Level 2 first
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        metrics = {
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          dcl: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          load: Math.round(nav.loadEventEnd - nav.startTime),
          fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
        };
      } else if (performance.timing) {
        // Fallback to deprecated performance.timing for older browsers
        const timing = performance.timing;
        metrics = {
          ttfb: timing.responseStart - timing.requestStart,
          dcl: timing.domContentLoadedEventEnd - timing.navigationStart,
          load: timing.loadEventEnd - timing.navigationStart,
          fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
        };
      }
      
      if (metrics && metrics.load > 0) {
        console.log('[PERF] Metrics:', metrics);
      }
    }, 100);
  });
}

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

// Service Worker Deregistration - clear stale caches on every load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
}

// HMR handler - suppress reloads and excessive reconnection logs
if (import.meta.hot) {
  import.meta.hot.accept();
  
  import.meta.hot.on('vite:beforeUpdate', () => {
    console.log('[HMR] Update detected, preserving state');
  });
  
  import.meta.hot.on('vite:beforeFullReload', () => {
    console.log('[HMR] Full reload suppressed');
    throw new Error('HMR_RELOAD_SUPPRESSED');
  });
  
  let hmrErrorCount = 0;
  const HMR_ERROR_THRESHOLD = 3;
  
  import.meta.hot.on('vite:ws-disconnect', () => {
    hmrErrorCount++;
    if (hmrErrorCount >= HMR_ERROR_THRESHOLD) {
      return;
    }
  });
  
  import.meta.hot.on('vite:ws-connect', () => {
    hmrErrorCount = 0;
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>
);
