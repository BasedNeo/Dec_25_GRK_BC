import { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '@/hooks/useInterval';
import { circuitBreakerManager } from '@/lib/circuitBreaker';

const SECURITY_CONFIG = {
  MAX_PRICE_CHANGE_PERCENT: 50,
  MAX_SOURCE_DIVERGENCE_PERCENT: 5,
  PRICE_BOUNDS: {
    BTC: { min: 1000, max: 1000000 },
    ETH: { min: 100, max: 100000 },
  } as Record<string, { min: number; max: number }>,
  MAX_CACHE_AGE_MS: 300000,
  STALE_THRESHOLD_MS: 120000,
};

function isMobileConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      const effectiveType = conn.effectiveType;
      return effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g';
    }
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}

function getTimeout(defaultMs: number): number {
  return isMobileConnection() ? Math.min(defaultMs, 3000) : defaultMs;
}

interface TickerAsset {
  id: string;
  symbol: string;
  name: string;
  binanceSymbol: string;
  logo?: string;
}

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  logo?: string;
  source: string;
  verified: boolean;
  timestamp: number;
}

function validatePriceBounds(symbol: string, price: number): boolean {
  const bounds = SECURITY_CONFIG.PRICE_BOUNDS[symbol];
  if (!bounds) return true;
  return price >= bounds.min && price <= bounds.max;
}

function validatePriceChange(newPrice: number, oldPrice: number | undefined): boolean {
  if (!oldPrice || oldPrice === 0) return true;
  const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
  return changePercent <= SECURITY_CONFIG.MAX_PRICE_CHANGE_PERCENT;
}

const CACHE_KEY = 'ticker_prices_secure';
const CACHE_HASH_KEY = 'ticker_prices_hash';

function hashData(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function setSecureCache(data: Record<string, PriceData>): void {
  const json = JSON.stringify({ data, timestamp: Date.now() });
  const hash = hashData(json);
  try {
    localStorage.setItem(CACHE_KEY, json);
    localStorage.setItem(CACHE_HASH_KEY, hash);
  } catch { /* ignore */ }
}

function getSecureCache(): { data: Record<string, PriceData>; valid: boolean; timestamp: number } | null {
  try {
    const json = localStorage.getItem(CACHE_KEY);
    const storedHash = localStorage.getItem(CACHE_HASH_KEY);
    if (!json || !storedHash) return null;
    
    const computedHash = hashData(json);
    if (computedHash !== storedHash) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_HASH_KEY);
      return null;
    }
    
    const parsed = JSON.parse(json);
    const isStale = Date.now() - parsed.timestamp > SECURITY_CONFIG.MAX_CACHE_AGE_MS;
    return { data: parsed.data, valid: !isStale, timestamp: parsed.timestamp };
  } catch {
    return null;
  }
}

async function fetchFromBinance(symbols: string[]): Promise<Map<string, { price: number; change: number }>> {
  const results = new Map();
  const breaker = circuitBreakerManager.getBreaker('binance-api');
  
  try {
    await breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getTimeout(5000));
      
      const requests = symbols.map(async (symbol) => {
        try {
          const res = await fetch(
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
            { signal: controller.signal }
          );
          if (!res.ok) return null;
          const data = await res.json();
          if (data.lastPrice) {
            const price = parseFloat(data.lastPrice);
            const change = parseFloat(data.priceChangePercent || '0');
            if (!isNaN(price) && price > 0) {
              return { symbol, price, change };
            }
          }
          return null;
        } catch {
          return null;
        }
      });
      
      const responses = await Promise.all(requests);
      clearTimeout(timeout);
      
      responses.forEach(r => {
        if (r) results.set(r.symbol, { price: r.price, change: r.change });
      });
    });
    return results;
  } catch {
    return results;
  }
}

async function fetchFromCoinGecko(ids: string[]): Promise<Map<string, { price: number; change: number }>> {
  const results = new Map();
  const breaker = circuitBreakerManager.getBreaker('coingecko-api');
  
  try {
    await breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getTimeout(6000));
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`,
        { 
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        }
      );
      clearTimeout(timeout);
      
      if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
      const data = await response.json();
      
      Object.entries(data).forEach(([id, info]) => {
        const priceInfo = info as { usd?: number; usd_24h_change?: number };
        if (typeof priceInfo.usd === 'number' && priceInfo.usd > 0) {
          results.set(id, { price: priceInfo.usd, change: priceInfo.usd_24h_change || 0 });
        }
      });
    });
    return results;
  } catch {
    return results;
  }
}

async function fetchFromCoinCap(): Promise<Map<string, { price: number; change: number }>> {
  const results = new Map();
  const breaker = circuitBreakerManager.getBreaker('coincap-api');
  
  try {
    await breaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getTimeout(5000));
      
      const [btcRes, ethRes] = await Promise.all([
        fetch('https://api.coincap.io/v2/assets/bitcoin', { signal: controller.signal }),
        fetch('https://api.coincap.io/v2/assets/ethereum', { signal: controller.signal }),
      ]);
      clearTimeout(timeout);
      
      if (btcRes.ok) {
        const btcData = await btcRes.json();
        if (btcData.data?.priceUsd) {
          results.set('bitcoin', {
            price: parseFloat(btcData.data.priceUsd),
            change: parseFloat(btcData.data.changePercent24Hr || '0'),
          });
        }
      }
      
      if (ethRes.ok) {
        const ethData = await ethRes.json();
        if (ethData.data?.priceUsd) {
          results.set('ethereum', {
            price: parseFloat(ethData.data.priceUsd),
            change: parseFloat(ethData.data.changePercent24Hr || '0'),
          });
        }
      }
    });
    return results;
  } catch {
    return results;
  }
}

const DEFAULT_ASSETS: TickerAsset[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', binanceSymbol: 'ETHUSDT', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
];

const FETCH_INTERVAL = 120000; // 2 minutes - matches stale threshold

export function usePriceTicker() {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [securityStatus, setSecurityStatus] = useState<'verified' | 'single-source' | 'stale' | 'error'>('verified');
  const previousPrices = useRef<Map<string, number>>(new Map());
  const lastFetch = useRef<number>(0);
  const fetchInProgress = useRef<boolean>(false);

  useEffect(() => {
    const cache = getSecureCache();
    if (cache && cache.data) {
      const priceMap = new Map<string, PriceData>();
      Object.entries(cache.data).forEach(([symbol, data]) => {
        priceMap.set(symbol, data);
        previousPrices.current.set(symbol, data.price);
      });
      setPrices(priceMap);
      const isStale = Date.now() - cache.timestamp > SECURITY_CONFIG.STALE_THRESHOLD_MS;
      setSecurityStatus(cache.valid ? 'verified' : isStale ? 'stale' : 'single-source');
      setIsLoading(false);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    if (fetchInProgress.current) return;
    if (Date.now() - lastFetch.current < 5000) return;
    
    fetchInProgress.current = true;
    lastFetch.current = Date.now();

    const binanceSymbols = DEFAULT_ASSETS.map(a => a.binanceSymbol);
    const geckoIds = DEFAULT_ASSETS.map(a => a.id);

    const [binanceData, geckoData, coinCapData] = await Promise.all([
      fetchFromBinance(binanceSymbols),
      fetchFromCoinGecko(geckoIds),
      fetchFromCoinCap(),
    ]);

    const priceMap = new Map<string, PriceData>();
    const cacheData: Record<string, PriceData> = {};
    let allVerified = true;
    let anyNewData = false;

    for (const asset of DEFAULT_ASSETS) {
      const sourcePrices: { source: string; price: number; change: number }[] = [];

      const binance = binanceData.get(asset.binanceSymbol);
      if (binance && binance.price > 0) sourcePrices.push({ source: 'binance', ...binance });

      const gecko = geckoData.get(asset.id);
      if (gecko && gecko.price > 0) sourcePrices.push({ source: 'coingecko', ...gecko });

      const coinCap = coinCapData.get(asset.id);
      if (coinCap && coinCap.price > 0) sourcePrices.push({ source: 'coincap', ...coinCap });

      if (sourcePrices.length === 0) {
        const previousPrice = previousPrices.current.get(asset.symbol);
        if (previousPrice) {
          const cachedData = prices.get(asset.symbol);
          if (cachedData) {
            priceMap.set(asset.symbol, { ...cachedData, verified: false });
            cacheData[asset.symbol] = { ...cachedData, verified: false };
          }
        }
        allVerified = false;
        continue;
      }

      anyNewData = true;
      let finalPrice = sourcePrices[0].price;
      let finalChange = sourcePrices[0].change;
      let verified = false;

      if (!validatePriceBounds(asset.symbol, finalPrice)) {
        const previousPrice = previousPrices.current.get(asset.symbol);
        if (previousPrice) finalPrice = previousPrice;
        else continue;
      }

      const previousPrice = previousPrices.current.get(asset.symbol);
      if (!validatePriceChange(finalPrice, previousPrice)) {
        finalPrice = previousPrice || finalPrice;
      }

      if (sourcePrices.length >= 2) {
        const avg = sourcePrices.reduce((sum, s) => sum + s.price, 0) / sourcePrices.length;
        const allAgree = sourcePrices.every(s => {
          const divergence = Math.abs((s.price - avg) / avg) * 100;
          return divergence <= SECURITY_CONFIG.MAX_SOURCE_DIVERGENCE_PERCENT;
        });
        if (allAgree) {
          verified = true;
          finalPrice = avg;
        } else {
          allVerified = false;
        }
      } else {
        allVerified = false;
      }

      const priceData: PriceData = {
        symbol: asset.symbol,
        price: finalPrice,
        change24h: finalChange,
        logo: asset.logo,
        source: sourcePrices.map(s => s.source).join('+'),
        verified,
        timestamp: Date.now(),
      };

      priceMap.set(asset.symbol, priceData);
      cacheData[asset.symbol] = priceData;
      previousPrices.current.set(asset.symbol, finalPrice);
    }

    if (priceMap.size > 0) {
      setPrices(priceMap);
      setSecurityStatus(anyNewData ? (allVerified ? 'verified' : 'single-source') : 'stale');
      setSecureCache(cacheData);
    } else {
      setSecurityStatus('error');
    }
    
    setIsLoading(false);
    fetchInProgress.current = false;
  }, [prices]);

  useEffect(() => {
    fetchPrices();
  }, []);

  useInterval(fetchPrices, FETCH_INTERVAL);

  const btcPrice = prices.get('BTC');
  const ethPrice = prices.get('ETH');

  return {
    btcPrice,
    ethPrice,
    allPrices: prices,
    isLoading,
    securityStatus,
    refresh: fetchPrices,
  };
}
