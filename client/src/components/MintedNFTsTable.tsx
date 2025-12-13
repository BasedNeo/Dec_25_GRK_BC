import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Guardian } from "@/lib/mockData";
import { NFT_CONTRACT, BLOCK_EXPLORER, IPFS_ROOT } from "@/lib/constants";
import { fetchTokenOwner, fetchTotalSupply, fetchTokenByIndex, fetchTokenURI } from "@/lib/onchain";
import { getCached, setCache, CACHE_KEYS } from "@/lib/cache";
import { useState, useEffect, useCallback } from "react";
import { getRarityClass } from "@/lib/utils";

interface MintedNFTsTableProps {
  nfts?: Guardian[]; // Keeping for compatibility but ignoring
  isLoading?: boolean;
  onRefresh?: () => void;
}

const BATCH_SIZE = 10;

export function MintedNFTsTable({ }: MintedNFTsTableProps) {
  const [mintedNFTs, setMintedNFTs] = useState<Guardian[]>([]);
  const [totalMinted, setTotalMinted] = useState<number>(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // Initialize and fetch Total Supply
  const init = useCallback(async () => {
    setIsInitializing(true);
    setMintedNFTs([]);
    setLoadedCount(0);
    
    // 1. Fetch Total Supply (Cached)
    let total = getCached<number>(CACHE_KEYS.CONTRACT_STATE + '_total', 30 * 1000);
    
    if (total === null) {
         total = await fetchTotalSupply();
         if (total !== null) setCache(CACHE_KEYS.CONTRACT_STATE + '_total', total);
    }

    if (total !== null) {
        setTotalMinted(total);
        // Initial load
        await loadBatch(total, 0);
    }
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const loadBatch = async (total: number, currentLoaded: number) => {
    setIsLoadingMore(true);
    
    // Logic: Loop from (totalMinted - 1 - currentLoaded) down to (totalMinted - 1 - currentLoaded - BATCH_SIZE)
    // Example: Total 100. Start index 99.
    // Batch 1: 99 down to 90 (10 items)
    // Batch 2: 89 down to 80
    
    const startIndex = total - 1 - currentLoaded;
    const endIndex = Math.max(-1, startIndex - BATCH_SIZE);
    
    const newItems: Guardian[] = [];

    // Parallel fetching for the batch
    const promises = [];
    
    for (let i = startIndex; i > endIndex; i--) {
        promises.push((async (index) => {
            try {
                // Check Cache for Metadata
                const cacheKey = `${CACHE_KEYS.NFT_METADATA}_${index}`;
                const cached = getCached<Guardian>(cacheKey, 5 * 60 * 1000); // 5 min cache
                if (cached) return cached;

                // 1. Get Token ID by Index
                const tokenId = await fetchTokenByIndex(index);
                if (tokenId === null) return null;

                // 2. Get Owner & URI in parallel
                const [owner, uri] = await Promise.all([
                    fetchTokenOwner(tokenId),
                    fetchTokenURI(tokenId)
                ]);

                // 3. Fetch Metadata
                // If URI is IPFS hash, prepend gateway. If HTTP, use as is.
                let metadataUrl = uri;
                if (uri && !uri.startsWith('http')) {
                    // Fallback or construct if just hash/path
                     metadataUrl = `${IPFS_ROOT}${tokenId}.json`;
                } else if (uri && uri.startsWith('ipfs://')) {
                     metadataUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                } else if (!uri) {
                     // Fallback if contract returns empty
                     metadataUrl = `${IPFS_ROOT}${tokenId}.json`;
                }

                if (!metadataUrl) {
                    // Should theoretically not happen due to fallback, but for type safety
                    console.warn(`No metadata URL for token #${tokenId}`);
                    return null;
                }

                let metadata = { name: `Guardian #${tokenId}`, attributes: [] as any[] };
                try {
                    const res = await fetch(metadataUrl);
                    if (res.ok) {
                        metadata = await res.json();
                    }
                } catch (e) {
                    console.warn(`Failed to fetch metadata for #${tokenId}`);
                }

                const rarityAttr = metadata.attributes?.find((a: any) => a.trait_type === 'Rarity');
                const rarity = rarityAttr ? rarityAttr.value : 'Common';

                const guardian = {
                    id: tokenId,
                    name: metadata.name,
                    image: '', // Not strictly needed for table but good to have
                    rarity: rarity,
                    price: 0, // Not relevant for minted
                    owner: owner || undefined,
                    traits: metadata.attributes?.map((a: any) => ({ type: a.trait_type, value: a.value })) || []
                } as Guardian;

                setCache(cacheKey, guardian);
                return guardian;

            } catch (e) {
                console.error(`Error fetching NFT at index ${index}`, e);
                return null;
            }
        })(i));
    }

    const results = await Promise.all(promises);
    const validResults = results.filter((n): n is Guardian => n !== null);
    
    // Sort by ID descending to maintain order (since parallel might finish out of order)
    validResults.sort((a, b) => b.id - a.id);

    setMintedNFTs(prev => [...prev, ...validResults]);
    setLoadedCount(prev => prev + validResults.length);
    setIsLoadingMore(false);
  };

  const handleLoadMore = () => {
    loadBatch(totalMinted, loadedCount);
  };

  const handleRefresh = () => {
    init();
  };

  const shortenAddress = (addr?: string) => {
    if (!addr) return "Unknown";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRarityColor = (rarity: string) => {
      return getRarityClass(rarity);
  };

  const hasMore = loadedCount < totalMinted;

  return (
    <div className="w-full mt-8 bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/60">
        <h3 className="font-orbitron text-white text-lg flex items-center gap-2">
           Minted NFT Details ({totalMinted} Total)
           {isInitializing && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </h3>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh} 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
            title="Refresh List"
        >
            <RefreshCw size={14} className={isInitializing ? "animate-spin" : ""} />
        </Button>
      </div>
      
      {isInitializing && mintedNFTs.length === 0 ? (
        <div className="w-full">
            {/* Desktop Skeleton */}
            <div className="hidden md:block">
                <div className="p-4 grid grid-cols-5 gap-4 border-b border-white/10 bg-white/5">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32 ml-auto" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 grid grid-cols-5 gap-4 border-b border-white/5 items-center">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24 ml-auto" />
                    </div>
                ))}
            </div>
            
            {/* Mobile Skeleton */}
            <div className="md:hidden flex flex-col gap-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-3 flex flex-col gap-3 rounded-lg">
                        <Skeleton className="h-6 w-3/4" />
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-cyan-400 font-mono w-[100px]">Token #</TableHead>
                    <TableHead className="text-cyan-400 font-mono">Name</TableHead>
                    <TableHead className="text-cyan-400 font-mono">Rarity</TableHead>
                    <TableHead className="text-cyan-400 font-mono">Biological Type</TableHead>
                    <TableHead className="text-cyan-400 font-mono text-right">Owner</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mintedNFTs.map((guardian, idx) => {
                        const bioType = guardian.traits?.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                        const owner = guardian.owner || "Loading...";

                        return (
                            <TableRow key={`${guardian.id}-${idx}`} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="font-mono text-white">
                                <a 
                                    href={`${BLOCK_EXPLORER}/token/${NFT_CONTRACT}/instance/${guardian.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center hover:text-cyan-400 transition-colors gap-1 group"
                                >
                                    #{guardian.id}
                                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </TableCell>
                            <TableCell className="font-bold text-white font-orbitron text-xs md:text-sm">{guardian.name}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`${getRarityColor(guardian.rarity)} font-mono text-[10px] uppercase whitespace-nowrap`}>
                                    {guardian.rarity}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400 font-mono text-xs">{bioType}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-gray-500">
                                <a 
                                    href={`${BLOCK_EXPLORER}/address/${owner}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-end gap-1 hover:text-cyan-400 transition-colors group"
                                >
                                    {shortenAddress(owner)}
                                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-2 p-4">
                 {mintedNFTs.map((guardian, idx) => {
                    const bioType = guardian.traits?.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                    const owner = guardian.owner || "Loading...";
                    
                    return (
                        <Card key={`${guardian.id}-${idx}`} className="bg-white/5 border-white/10 p-3 flex flex-col gap-2">
                             <div className="flex justify-between items-center">
                                 <a 
                                     href={`${BLOCK_EXPLORER}/token/${NFT_CONTRACT}/instance/${guardian.id}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="font-mono text-cyan-400 font-bold flex items-center gap-1"
                                 >
                                    #{guardian.id}
                                    <ExternalLink size={10} />
                                 </a>
                                 <Badge variant="outline" className={`${getRarityColor(guardian.rarity)} font-mono text-[10px] uppercase`}>
                                    {guardian.rarity}
                                 </Badge>
                             </div>
                             <div className="flex justify-between items-center">
                                 <span className="text-white font-orbitron text-sm">{guardian.name}</span>
                             </div>
                             <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-white/5 pt-2 mt-1">
                                 <span className="font-mono">{bioType}</span>
                                 <a 
                                     href={`${BLOCK_EXPLORER}/address/${owner}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="flex items-center gap-1 hover:text-cyan-400 font-mono"
                                 >
                                     {shortenAddress(owner)}
                                     <ExternalLink size={10} />
                                 </a>
                             </div>
                        </Card>
                    );
                 })}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center p-6 border-t border-white/10 bg-black/20">
                    <Button 
                        variant="outline" 
                        onClick={handleLoadMore} 
                        disabled={isLoadingMore}
                        className="w-full md:w-auto min-w-[200px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-orbitron tracking-widest uppercase"
                    >
                        {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isLoadingMore ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
            
            {!hasMore && mintedNFTs.length > 0 && (
                 <div className="text-center py-4 text-xs font-mono text-muted-foreground/50 bg-black/20 border-t border-white/10">
                    END OF MINTED TOKENS
                 </div>
            )}
            
            {mintedNFTs.length === 0 && !isInitializing && (
                <div className="text-center py-12 text-muted-foreground bg-black/20">
                    <p className="font-orbitron mb-2">NO NFTS MINTED YET</p>
                    <p className="text-xs font-mono opacity-50">Be the first to mint a Guardian!</p>
                </div>
            )}
        </>
      )}
    </div>
  );
}
