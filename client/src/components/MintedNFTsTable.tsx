import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { Guardian } from "@/lib/mockData";
import { IPFS_ROOT } from "@/lib/constants";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MintedNFTsTableProps {
  totalMinted: number;
}

const PAGE_SIZE = 10;

export function MintedNFTsTable({ totalMinted }: MintedNFTsTableProps) {
  const shortenAddress = (addr?: string) => {
    if (!addr) return "Unknown";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRarityColor = (rarity: string) => {
      if (rarity === 'Rarest-Legendary') return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
      if (rarity === 'Very Rare') return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      if (rarity === 'More Rare') return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      if (rarity === 'Rare') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50';
      if (rarity === 'Less Rare') return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      if (rarity === 'Less Common') return 'bg-green-500/20 text-green-400 border-green-500/50';
      if (rarity === 'Common') return 'bg-white/10 text-white border-white/20';
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  // Fetch function for infinite scroll
  const fetchMintedBatch = async ({ pageParam }: { pageParam: number }) => {
    // pageParam is the starting ID (highest)
    // We want to fetch 10 items going downwards: pageParam, pageParam-1, ...
    const startId = pageParam;
    const endId = Math.max(1, startId - PAGE_SIZE + 1);
    
    // Generate IDs to fetch
    const idsToFetch = [];
    for (let i = startId; i >= endId; i--) {
        idsToFetch.push(i);
    }

    if (idsToFetch.length === 0) {
        return { nfts: [], nextCursor: undefined };
    }

    // Fetch in parallel
    const fetchedNFTs = await Promise.all(idsToFetch.map(async (id) => {
        try {
            // Using the configured IPFS gateway
            const res = await fetch(`${IPFS_ROOT}${id}.json`);
            if (!res.ok) throw new Error(`Failed to fetch ${id}`);
            const json = await res.json();
            
            const rarityAttr = json.attributes.find((t:any) => t.trait_type === 'Rarity Level' || t.trait_type === 'Rarity');
            const bioAttr = json.attributes.find((t:any) => t.trait_type === 'Biological Type' || t.trait_type === 'Character Type');
            
            // Mock owner logic to match Hero demo
            let owner = `0x${id.toString(16).padStart(40, '0')}`;
            if (id === 3002) owner = 'Your wallet';
            else if (id === 149) owner = 'Test wallet';

            // Normalize rarity for UI consistency
            let rarityValue = rarityAttr?.value || 'Common';
            if (rarityValue === 'Rarest (1/1s)') rarityValue = 'Rarest-Legendary';
            if (rarityValue === 'Rarest') rarityValue = 'More Rare'; // Handle legacy/alternate naming

            return {
                id,
                name: json.name || `Guardian #${id}`,
                rarity: rarityValue,
                traits: bioAttr ? [{ type: 'Biological Type', value: bioAttr.value }] : [],
                image: json.image || '', // Not strictly needed for table but good to have
                owner,
            } as Guardian;
        } catch (e) {
            // Fallback for error
            return {
                id,
                name: `Guardian #${id}`,
                rarity: 'Common',
                traits: [],
                owner: 'Unknown',
                image: '', // Fallback image
                isError: true
            } as Guardian;
        }
    }));

    return {
        nfts: fetchedNFTs,
        nextCursor: endId > 1 ? endId - 1 : undefined
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['mintedNFTs', totalMinted],
    queryFn: fetchMintedBatch,
    initialPageParam: totalMinted,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: totalMinted > 0,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  // Intersection Observer for Infinite Scroll
  const observerTarget = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
           fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allNFTs = data?.pages.flatMap(page => page.nfts) || [];

  return (
    <div className="w-full mt-8 bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/60">
        <h3 className="font-orbitron text-white text-lg flex items-center gap-2">
           Minted NFTs Details ({totalMinted} Total)
           {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </h3>
      </div>
      
      {status === 'pending' ? (
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
                {Array.from({ length: 10 }).map((_, i) => (
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
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-3 flex flex-col gap-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-6 w-3/4" />
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-24" />
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
                    {allNFTs.map((guardian) => {
                        const bioType = guardian.traits?.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                        
                        return (
                            <TableRow key={guardian.id} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="font-mono text-white">#{guardian.id}</TableCell>
                            <TableCell className="font-bold text-white font-orbitron text-xs md:text-sm">{guardian.name}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`${getRarityColor(guardian.rarity)} font-mono text-[10px] uppercase whitespace-nowrap`}>
                                    {guardian.rarity}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400 font-mono text-xs">{bioType}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-gray-500">
                                {guardian.owner === 'Your wallet' ? <span className="text-green-400">Your wallet</span> : shortenAddress(guardian.owner)}
                            </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-2 p-4">
                 {allNFTs.map((guardian) => {
                    const bioType = guardian.traits?.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                    return (
                        <Card key={guardian.id} className="bg-white/5 border-white/10 p-3 flex flex-col gap-2">
                             <div className="flex justify-between items-center">
                                 <span className="font-mono text-cyan-400 font-bold">#{guardian.id}</span>
                                 <Badge variant="outline" className={`${getRarityColor(guardian.rarity)} font-mono text-[10px] uppercase`}>
                                    {guardian.rarity}
                                 </Badge>
                             </div>
                             <div className="flex justify-between items-center">
                                 <span className="text-white font-orbitron text-sm">{guardian.name}</span>
                             </div>
                             <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-white/5 pt-2 mt-1">
                                 <span className="font-mono">{bioType}</span>
                                 <span className="font-mono">{guardian.owner === 'Your wallet' ? <span className="text-green-400">Your wallet</span> : shortenAddress(guardian.owner)}</span>
                             </div>
                        </Card>
                    );
                 })}
            </div>

            {/* Infinite Scroll Loader & Sentinel */}
            <div ref={observerTarget} className="flex flex-col items-center justify-center py-6 w-full bg-black/20 min-h-[60px]">
                {isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-cyan-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-xs font-mono">LOADING MORE MINTS...</span>
                    </div>
                )}
                {!hasNextPage && allNFTs.length > 0 && (
                     <div className="text-xs font-mono text-muted-foreground/50 mt-2">
                        END OF MINTS
                     </div>
                )}
            </div>
        </>
      )}
    </div>
  );
}
