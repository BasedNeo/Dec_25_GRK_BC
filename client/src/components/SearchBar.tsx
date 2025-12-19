import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface Collection {
  id: number;
  contractAddress: string;
  name: string;
  symbol: string;
  thumbnailImage: string | null;
  floorPrice: string | null;
}

interface PopularSearch {
  query: string;
  count: number;
}

export function SearchBar({ 
  onSearch,
  placeholder = "Search NFTs, collections...",
  className = ""
}: { 
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: collections, isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ['searchCollections', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const res = await fetch(`/api/search/collections?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: query.length >= 2,
    staleTime: 30000
  });

  const { data: popularSearches } = useQuery<PopularSearch[]>({
    queryKey: ['popularSearches'],
    queryFn: async () => {
      const res = await fetch('/api/search/popular?limit=5');
      if (!res.ok) throw new Error('Failed to fetch popular searches');
      return res.json();
    },
    staleTime: 60000
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        setLocation(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
      }
      setIsOpen(false);
    }
  }, [onSearch, setLocation]);

  const handleCollectionClick = (address: string) => {
    setLocation(`/marketplace?collection=${address}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit(query);
            if (e.key === 'Escape') setIsOpen(false);
          }}
          placeholder={placeholder}
          className="pl-10 pr-10 bg-gray-900/80 border-gray-700 focus:border-cyan-500 text-white placeholder:text-gray-500"
          data-testid="input-search"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
          >
            {collectionsLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
              </div>
            )}

            {!collectionsLoading && query.length >= 2 && collections && collections.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Collections
                </div>
                {collections.map((collection) => (
                  <button
                    key={collection.contractAddress}
                    onClick={() => handleCollectionClick(collection.contractAddress)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
                    data-testid={`search-result-${collection.contractAddress}`}
                  >
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                      {collection.thumbnailImage ? (
                        <img
                          src={collection.thumbnailImage}
                          alt={collection.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-cyan-500 text-sm font-bold">
                          {collection.symbol?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{collection.name}</div>
                      <div className="text-gray-400 text-sm">
                        {collection.floorPrice ? `Floor: ${parseFloat(collection.floorPrice).toFixed(2)} BASED` : 'No floor price'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!collectionsLoading && query.length >= 2 && (!collections || collections.length === 0) && (
              <div className="px-3 py-4 text-center text-gray-400">
                No results found for "{query}"
              </div>
            )}

            {query.length < 2 && popularSearches && popularSearches.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Popular Searches
                </div>
                {popularSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search.query);
                      handleSubmit(search.query);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
                    data-testid={`popular-search-${index}`}
                  >
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-300">{search.query}</span>
                    <span className="ml-auto text-xs text-gray-500">{search.count} searches</span>
                  </button>
                ))}
              </div>
            )}

            {query.length < 2 && (!popularSearches || popularSearches.length === 0) && (
              <div className="px-3 py-4 text-center text-gray-400 text-sm">
                Start typing to search collections and NFTs
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
