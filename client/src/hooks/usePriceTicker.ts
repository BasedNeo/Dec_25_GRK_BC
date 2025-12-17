import { useState, useEffect, useCallback, useRef } from 'react';

const SECURITY_CONFIG = {
  MAX_PRICE_CHANGE_PERCENT: 50,
  MAX_SOURCE_DIVERGENCE_PERCENT: 5,
  PRICE_BOUNDS: {
    BTC: { min: 1000, max: 1000000 },
    ETH: { min: 100, max: 100000 },
  } as Record<string, { min: number; max: number }>,
  MAX_CACHE_AGE_MS: 300000,
};

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

function getSecureCache(): { data: Record<string, PriceData>; valid: boolean } | null {
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
    return { data: parsed.data, valid: !isStale };
  } catch {
    return null;
  }
}

async function fetchFromBinance(symbols: string[]): Promise<Map<string, { price: number; change: number }>> {
  const results = new Map();
  try {
    const symbolsParam = symbols.map(s => `"${s}"`).join(',');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbolsParam}]`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response');
    
    data.forEach((ticker: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
      if (ticker.symbol && ticker.lastPrice) {
        const price = parseFloat(ticker.lastPrice);
        const change = parseFloat(ticker.priceChangePercent || '0');
        if (!isNaN(price) && price > 0) {
          results.set(ticker.symbol, { price, change });
        }
      }
    });
    return results;
  } catch {
    return results;
  }
}

async function fetchFromCoinGecko(ids: string[]): Promise<Map<string, { price: number; change: number }>> {
  const results = new Map();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    Object.entries(data).forEach(([id, info]) => {
      const priceInfo = info as { usd?: number; usd_24h_change?: number };
      if (typeof priceInfo.usd === 'number' && priceInfo.usd > 0) {
        results.set(id, { price: priceInfo.usd, change: priceInfo.usd_24h_change || 0 });
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

const FETCH_INTERVAL = 15000;

export function usePriceTicker() {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [securityStatus, setSecurityStatus] = useState<'verified' | 'single-source' | 'stale' | 'error'>('verified');
  const previousPrices = useRef<Map<string, number>>(new Map());
  const lastFetch = useRef<number>(0);

  useEffect(() => {
    const cache = getSecureCache();
    if (cache) {
      const priceMap = new Map<string, PriceData>();
      Object.entries(cache.data).forEach(([symbol, data]) => {
        priceMap.set(symbol, data);
        previousPrices.current.set(symbol, data.price);
      });
      setPrices(priceMap);
      setSecurityStatus(cache.valid ? 'verified' : 'stale');
      setIsLoading(false);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    if (Date.now() - lastFetch.current < 5000) return;
    lastFetch.current = Date.now();

    const binanceSymbols = DEFAULT_ASSETS.map(a => a.binanceSymbol);
    const geckoIds = DEFAULT_ASSETS.map(a => a.id);

    const [binanceData, geckoData] = await Promise.all([
      fetchFromBinance(binanceSymbols),
      fetchFromCoinGecko(geckoIds),
    ]);

    const priceMap = new Map<string, PriceData>();
    const cacheData: Record<string, PriceData> = {};
    let allVerified = true;

    for (const asset of DEFAULT_ASSETS) {
      const sourcePrices: { source: string; price: number; change: number }[] = [];

      const binance = binanceData.get(asset.binanceSymbol);
      if (binance) sourcePrices.push({ source: 'binance', ...binance });

      const gecko = geckoData.get(asset.id);
      if (gecko) sourcePrices.push({ source: 'coingecko', ...gecko });

      if (sourcePrices.length === 0) continue;

      let finalPrice = sourcePrices[0].price;
      let finalChange = sourcePrices[0].change;
      let verified = false;

      if (!validatePriceBounds(asset.symbol, finalPrice)) continue;

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

    setPrices(priceMap);
    setSecurityStatus(priceMap.size === 0 ? 'error' : allVerified ? 'verified' : 'single-source');
    setIsLoading(false);

    if (priceMap.size > 0) {
      setSecureCache(cacheData);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPrices]);

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
