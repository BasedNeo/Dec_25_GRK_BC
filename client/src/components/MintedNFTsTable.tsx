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
import { NFT_CONTRACT, BLOCK_EXPLORER } from "@/lib/constants";
import { fetchTokenOwner } from "@/lib/onchain";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { getRarityClass } from "@/lib/utils";

interface MintedNFTsTableProps {
  nfts: Guardian[];
  isLoading: boolean;
  onRefresh: () => void;
}

const BATCH_SIZE = 12;

export function MintedNFTsTable({ nfts, isLoading, onRefresh }: MintedNFTsTableProps) {
  const [page, setPage] = useState(1);
  // Reset page when nfts change significantly (e.g. reload), or maybe keep it?
  // If nfts list grows (new mint), we probably want to stay on page 1 (showing newest).
  // The nfts prop passed here should be ALL minted nfts.
  // We want to show them in REVERSE order (newest first).
  
  const sortedNFTs = [...nfts].sort((a, b) => b.id - a.id);
  
  const totalPages = Math.ceil(sortedNFTs.length / BATCH_SIZE);
  const currentBatch = sortedNFTs.slice(0, page * BATCH_SIZE);
  const hasMore = page < totalPages;

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const shortenAddress = (addr?: string) => {
    if (!addr) return "Unknown";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRarityColor = (rarity: string) => {
      // Map to CSS classes using centralized utility if possible, or keep local
      // The user asked to update "getRarityClass" with new map.
      // We'll use the utility function we are about to create in utils.ts
      return getRarityClass(rarity);
  };

  // We might need to fetch owners for the current batch if not present
  // But for now we'll just display what we have (CSV data doesn't have owners)
  // To strictly follow "syncs with live contract", we should fetch owners.
  // But that's heavy. Let's assume for this "Rarity Chart" task, the chart is the priority.
  // We can add a simple effect to fetch owners for visible items.

  const [owners, setOwners] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchVisibleOwners = async () => {
        const batchIds = currentBatch.map(n => n.id);
        // Only fetch if we don't have it
        const idsToFetch = batchIds.filter(id => !owners[id]);
        
        if (idsToFetch.length === 0) return;

        // Parallel fetch
        idsToFetch.forEach(async (id) => {
            try {
                const owner = await fetchTokenOwner(id);
                setOwners(prev => ({ ...prev, [id]: owner || 'Unknown' }));
            } catch (e) {
                console.warn(`Failed to fetch owner for #${id}`);
            }
        });
    };
    
    fetchVisibleOwners();
  }, [page, nfts.length]); // Re-run when page changes or new NFTs arrive

  return (
    <div className="w-full mt-8 bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/60">
        <h3 className="font-orbitron text-white text-lg flex items-center gap-2">
           Minted NFT Details ({nfts.length} Total)
           {isLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </h3>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
            title="Refresh List"
        >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>
      
      {isLoading && nfts.length === 0 ? (
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
                    {currentBatch.map((guardian, idx) => {
                        const bioType = guardian.traits?.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                        const owner = owners[guardian.id] || "Loading...";

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
                 {currentBatch.map((guardian, idx) => {
                    const bioType = guardian.traits?.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                    const owner = owners[guardian.id] || "Loading...";
                    
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
                        className="w-full md:w-auto min-w-[200px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-orbitron tracking-widest uppercase"
                    >
                        Load More
                    </Button>
                </div>
            )}
            
            {!hasMore && nfts.length > 0 && (
                 <div className="text-center py-4 text-xs font-mono text-muted-foreground/50 bg-black/20 border-t border-white/10">
                    END OF MINTED TOKENS
                 </div>
            )}
            
            {nfts.length === 0 && !isLoading && (
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
