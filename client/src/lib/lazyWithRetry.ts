import { lazy, ComponentType } from 'react';

type ComponentImport<T> = () => Promise<{ default: T }>;

interface LazyWithRetryOptions {
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: ComponentImport<T>,
  options: LazyWithRetryOptions = {}
) {
  const {
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    onRetry,
  } = options;

  return lazy(() => retryImport(componentImport, retries, retryDelay, onRetry));
}

async function retryImport<T>(
  componentImport: ComponentImport<T>,
  retries: number,
  retryDelay: number,
  onRetry?: (attempt: number, error: Error) => void
): Promise<{ default: T }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const component = await componentImport();
      return component;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        console.warn(
          `[LazyLoad] Import failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${retryDelay}ms...`,
          error
        );
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        
        if (typeof window !== 'undefined' && 'caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          } catch {
          }
        }
      }
    }
  }

  console.error('[LazyLoad] All retry attempts failed', lastError);
  throw lastError;
}

const prefetchedModules = new Set<string>();

export function prefetchRoute(routeImport: ComponentImport<any>, routeName?: string) {
  const key = routeName || routeImport.toString();
  
  if (prefetchedModules.has(key)) {
    return;
  }
  
  prefetchedModules.add(key);
  
  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  
  idleCallback(() => {
    routeImport().catch((err) => {
      prefetchedModules.delete(key);
      console.debug('[Prefetch] Failed to prefetch route:', routeName, err);
    });
  });
}

export function createPrefetchHandler(routeImport: ComponentImport<any>, routeName?: string) {
  let prefetched = false;
  
  return () => {
    if (!prefetched) {
      prefetched = true;
      prefetchRoute(routeImport, routeName);
    }
  };
}

export const routeImports = {
  Home: () => import('@/pages/Home'),
  TermsOfService: () => import('@/pages/TermsOfService'),
  PrivacyPolicy: () => import('@/pages/PrivacyPolicy'),
  Odyssey: () => import('@/pages/Odyssey'),
  Creators: () => import('@/pages/Creators'),
  Saga: () => import('@/pages/Saga'),
  GuardianDefender: () => import('@/pages/GuardianDefender'),
  GuardianDefense: () => import('@/pages/GuardianDefense'),
  GuardianSolitaire: () => import('@/pages/GuardianSolitaire'),
  AsteroidMining: () => import('@/pages/AsteroidMining'),
  CyberBreach: () => import('@/pages/CyberBreach'),
  BasedArcade: () => import('@/pages/BasedArcade'),
  TransactionHistory: () => import('@/pages/TransactionHistory'),
  Collections: () => import('@/pages/Collections'),
  Marketplace: () => import('@/pages/Marketplace'),
  NotFound: () => import('@/pages/not-found'),
};

export const prefetchHandlers = {
  Home: createPrefetchHandler(routeImports.Home, 'Home'),
  Odyssey: createPrefetchHandler(routeImports.Odyssey, 'Odyssey'),
  Creators: createPrefetchHandler(routeImports.Creators, 'Creators'),
  Saga: createPrefetchHandler(routeImports.Saga, 'Saga'),
  BasedArcade: createPrefetchHandler(routeImports.BasedArcade, 'BasedArcade'),
  Collections: createPrefetchHandler(routeImports.Collections, 'Collections'),
  Marketplace: createPrefetchHandler(routeImports.Marketplace, 'Marketplace'),
};
