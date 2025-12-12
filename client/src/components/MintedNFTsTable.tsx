import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Guardian } from "@/lib/mockData";

interface MintedNFTsTableProps {
  mintedGuardians: Guardian[];
  loading: boolean;
  totalMinted: number;
}

export function MintedNFTsTable({ mintedGuardians, loading, totalMinted }: MintedNFTsTableProps) {
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

  return (
    <div className="w-full mt-8 bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/60">
        <h3 className="font-orbitron text-white text-lg flex items-center gap-2">
           Minted NFTs Details ({totalMinted} Total)
           {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </h3>
      </div>
      
      {loading && mintedGuardians.length === 0 ? (
        <div className="p-8 flex justify-center items-center text-muted-foreground font-mono">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing minted data...
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                {mintedGuardians.map((guardian) => {
                    const bioType = guardian.traits.find(t => t.type === 'Character Type' || t.type === 'Biological Type')?.value || 'Unknown';
                    
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
      )}
    </div>
  );
}
