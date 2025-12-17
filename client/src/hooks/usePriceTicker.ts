import { useState, useEffect, useCallback, useRef } from 'react';

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
  source: 'binance' | 'coingecko' | 'cache';
}

const DEFAULT_ASSETS: TickerAsset[] = [
  { 
    id: 'bitcoin', 
    symbol: 'BTC', 
    name: 'Bitcoin', 
    binanceSymbol: 'BTCUSDT',
    logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' 
  },
  { 
    id: 'ethereum', 
    symbol: 'ETH', 
    name: 'Ethereum', 
    binanceSymbol: 'ETHUSDT',
    logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' 
  },
];

export const AVAILABLE_ASSETS: TickerAsset[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', binanceSymbol: 'ETHUSDT', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', binanceSymbol: 'SOLUSDT', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', binanceSymbol: 'BNBUSDT', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', binanceSymbol: 'XRPUSDT', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', binanceSymbol: 'ADAUSDT', logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', binanceSymbol: 'DOGEUSDT', logo: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', binanceSymbol: 'DOTUSDT', logo: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', binanceSymbol: 'AVAXUSDT', logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', binanceSymbol: 'LINKUSDT', logo: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
];

const STORAGE_KEY = 'ticker_assets';
const CACHE_KEY = 'ticker_prices_v2';
const ROTATE_INTERVAL = 3000;
const FETCH_INTERVAL = 10000;

async function fetchFromBinance(symbols: string[]): Promise<Map<string, { price: number; change: number }>> {
  const results = new Map();
  
  try {
    const symbolsParam = symbols.map(s => `"${s}"`).join(',');
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbolsParam}]`
    );
    
    if (!response.ok) throw new Error('Binance API error');
    
    const data = await response.json();
    
    data.forEach((ticker: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
      results.set(ticker.symbol, {
        price: parseFloat(ticker.lastPrice),
        change: parseFloat(ticker.priceChangePercent),
      });
    });
    
    return results;
  } catch {
    return results;
  }
}

async function fetchFromCoinGecko(ids: string[]): Promise<Map<string, { price: number; change: number }>> {
  const results = new Map();
  
  try {
    const idsParam = ids.join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (!response.ok) throw new Error('CoinGecko API error');
    
    const data = await response.json();
    
    Object.entries(data).forEach(([id, info]) => {
      const priceInfo = info as { usd?: number; usd_24h_change?: number };
      results.set(id, {
        price: priceInfo.usd || 0,
        change: priceInfo.usd_24h_change || 0,
      });
    });
    
    return results;
  } catch {
    return results;
  }
}

export function usePriceTicker() {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<TickerAsset[]>(DEFAULT_ASSETS);
  const [dataSource, setDataSource] = useState<'binance' | 'coingecko' | 'cache'>('cache');
  const lastFetch = useRef<number>(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored) as string[];
        const assets = ids
          .map(id => AVAILABLE_ASSETS.find(a => a.id === id))
          .filter(Boolean) as TickerAsset[];
        if (assets.length >= 2) setSelectedAssets(assets);
      } catch { /* ignore */ }
    }

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        const priceMap = new Map<string, PriceData>();
        Object.entries(data).forEach(([symbol, info]) => {
          priceMap.set(symbol, { ...(info as PriceData), source: 'cache' });
        });
        setPrices(priceMap);
        setIsLoading(false);
      } catch { /* ignore */ }
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    if (Date.now() - lastFetch.current < 5000) return;
    lastFetch.current = Date.now();

    const binanceSymbols = selectedAssets.map(a => a.binanceSymbol);
    const geckoIds = selectedAssets.map(a => a.id);

    let binanceData = await fetchFromBinance(binanceSymbols);
    let source: 'binance' | 'coingecko' | 'cache' = 'binance';

    if (binanceData.size === 0) {
      const geckoData = await fetchFromCoinGecko(geckoIds);
      source = 'coingecko';
      
      selectedAssets.forEach(asset => {
        const data = geckoData.get(asset.id);
        if (data) {
          binanceData.set(asset.binanceSymbol, data);
        }
      });
    }

    const priceMap = new Map<string, PriceData>();
    const cacheData: Record<string, PriceData> = {};

    selectedAssets.forEach(asset => {
      const data = binanceData.get(asset.binanceSymbol);
      if (data) {
        const priceData: PriceData = {
          symbol: asset.symbol,
          price: data.price,
          change24h: data.change,
          logo: asset.logo,
          source,
        };
        priceMap.set(asset.symbol, priceData);
        cacheData[asset.symbol] = priceData;
      }
    });

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: cacheData,
      timestamp: Date.now(),
    }));

    setPrices(priceMap);
    setDataSource(source);
    setIsLoading(false);
  }, [selectedAssets]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % selectedAssets.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedAssets.length]);

  const updateAssets = useCallback((assets: TickerAsset[]) => {
    if (assets.length < 2) return;
    setSelectedAssets(assets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets.map(a => a.id)));
    setCurrentIndex(0);
    lastFetch.current = 0;
  }, []);

  const currentAsset = selectedAssets[currentIndex];
  const currentPrice = prices.get(currentAsset?.symbol);

  return {
    currentAsset,
    currentPrice,
    allPrices: prices,
    selectedAssets,
    updateAssets,
    isLoading,
    currentIndex,
    dataSource,
    AVAILABLE_ASSETS,
    refresh: fetchPrices,
  };
}
