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
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Guardian } from "@/lib/mockData";
import { NFT_CONTRACT } from "@/lib/constants";
import { fetchTokenByIndex, fetchTokenOwner, fetchTotalSupply } from "@/lib/onchain";
import { fetchGuardianMetadata } from "@/lib/ipfs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

interface MintedNFTsTableProps {
  totalMinted?: number; // Passed from Hero, but we also sync internally
}

const BATCH_SIZE = 12;

export function MintedNFTsTable({ totalMinted: initialTotal }: MintedNFTsTableProps) {
  // Use initialTotal if provided (and non-zero), otherwise start at 0
  const [liveTotal, setLiveTotal] = useState<number>(initialTotal || 0);
  const [isInitializing, setIsInitializing] = useState(true);

  // Sync with contract on mount and periodically
  const syncTotal = async () => {
    try {
        const total = await fetchTotalSupply();
        if (total !== null) {
            setLiveTotal(total);
        }
    } catch (e) {
        console.error("Failed to fetch live total:", e);
    } finally {
        setIsInitializing(false);
    }
  };

  useEffect(() => {
    syncTotal();
    const interval = setInterval(syncTotal, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  // Update liveTotal if prop changes (and is valid/larger)
  useEffect(() => {
    if (initialTotal !== undefined && initialTotal > liveTotal) {
        setLiveTotal(initialTotal);
    }
  }, [initialTotal]);

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

  // Fetch function for load more
  const fetchMintedBatch = async ({ pageParam }: { pageParam: number }) => {
    // pageParam is the starting INDEX (highest index for this batch)
    // We want to fetch BATCH_SIZE items going downwards: index, index-1, ...
    
    // Safety check
    if (pageParam < 0) return { nfts: [], nextCursor: undefined };

    const startIndex = pageParam;
    const endIndex = Math.max(0, startIndex - BATCH_SIZE + 1);
    
    // Generate Indices to fetch
    const indicesToFetch = [];
    for (let i = startIndex; i >= endIndex; i--) {
        indicesToFetch.push(i);
    }

    if (indicesToFetch.length === 0) {
        return { nfts: [], nextCursor: undefined };
    }

    // Fetch in parallel
    const fetchedNFTs = await Promise.all(indicesToFetch.map(async (index) => {
        try {
            // 1. Get Token ID from Contract Index
            const tokenId = await fetchTokenByIndex(index);
            if (tokenId === null) throw new Error(`Failed to fetch token at index ${index}`);

            // 2. Get Real Owner
            const owner = await fetchTokenOwner(tokenId);

            // 3. Get Metadata from IPFS
            const metadata = await fetchGuardianMetadata(tokenId);
            
            return {
                ...metadata,
                owner: owner || 'Unknown',
            } as Guardian;
        } catch (e) {
            console.warn(`Error loading minted NFT at index ${index}:`, e);
            // Fallback placeholder
            return {
                id: 0, 
                name: "Loading Error",
                rarity: "Common",
                traits: [],
                owner: "Unknown",
                image: "",
                isError: true
            } as Guardian;
        }
    }));

    return {
        nfts: fetchedNFTs,
        // If we reached 0, no next page. Otherwise, next cursor is one below current end.
        nextCursor: endIndex > 0 ? endIndex - 1 : undefined
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery({
    queryKey: ['mintedNFTs', liveTotal], // Re-fetch when liveTotal changes
    queryFn: fetchMintedBatch,
    initialPageParam: Math.max(0, liveTotal - 1), // Start from last index
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: liveTotal > 0,
    staleTime: 1000 * 60, // 1 min cache
  });

  const allNFTs = data?.pages.flatMap(page => page.nfts) || [];

  return (
    <div className="w-full mt-8 bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/60">
        <h3 className="font-orbitron text-white text-lg flex items-center gap-2">
           Minted NFT Details ({liveTotal} Total)
           {(isFetchingNextPage || isInitializing) && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </h3>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { syncTotal(); refetch(); }} 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
            title="Refresh List"
        >
            <RefreshCw size={14} className={isFetchingNextPage ? "animate-spin" : ""} />
        </Button>
      </div>
      
      {status === 'pending' || (isInitializing && liveTotal === 0) ? (
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
                    {allNFTs.map((guardian, idx) => {
                        // Skip rendering placeholders if possible, or render basic info
                        if (guardian.id === 0 && guardian.isError) return null;

                        const bioType = guardian.traits?.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                        
                        return (
                            <TableRow key={`${guardian.id}-${idx}`} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="font-mono text-white">
                                <a 
                                    href={`https://explorer.bf1337.org/token/${NFT_CONTRACT}/instance/${guardian.id}`}
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
                                    href={`https://explorer.bf1337.org/address/${guardian.owner}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-end gap-1 hover:text-cyan-400 transition-colors group"
                                >
                                    {shortenAddress(guardian.owner)}
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
                 {allNFTs.map((guardian, idx) => {
                    if (guardian.id === 0 && guardian.isError) return null;
                    const bioType = guardian.traits?.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                    return (
                        <Card key={`${guardian.id}-${idx}`} className="bg-white/5 border-white/10 p-3 flex flex-col gap-2">
                             <div className="flex justify-between items-center">
                                 <a 
                                     href={`https://explorer.bf1337.org/token/${NFT_CONTRACT}/instance/${guardian.id}`}
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
                                     href={`https://explorer.bf1337.org/address/${guardian.owner}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="flex items-center gap-1 hover:text-cyan-400 font-mono"
                                 >
                                     {shortenAddress(guardian.owner)}
                                     <ExternalLink size={10} />
                                 </a>
                             </div>
                        </Card>
                    );
                 })}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
                <div className="flex justify-center p-6 border-t border-white/10 bg-black/20">
                    <Button 
                        variant="outline" 
                        onClick={() => fetchNextPage()} 
                        disabled={isFetchingNextPage}
                        className="w-full md:w-auto min-w-[200px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-orbitron tracking-widest uppercase"
                    >
                        {isFetchingNextPage ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            "Load More"
                        )}
                    </Button>
                </div>
            )}
            
            {!hasNextPage && allNFTs.length > 0 && (
                 <div className="text-center py-4 text-xs font-mono text-muted-foreground/50 bg-black/20 border-t border-white/10">
                    END OF MINTED TOKENS
                 </div>
            )}
            
            {allNFTs.length === 0 && !isFetchingNextPage && !isInitializing && (
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
