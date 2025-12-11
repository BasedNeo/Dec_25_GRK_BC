import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, ShieldCheck, Zap, Info, Share2, ExternalLink, Activity, Copy, Check, Twitter } from "lucide-react";
import { Guardian } from "@/lib/mockData";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect, useState } from "react";
import { MarketItem } from "@/lib/marketplaceData";

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: Guardian | MarketItem | null;
}

export function NFTDetailModal({ isOpen, onClose, nft }: NFTDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!nft) return null;

  useEffect(() => {
    if (isOpen && nft) {
      // Trigger confetti for rare items
      const isRare = ['Rare', 'Epic', 'Legendary'].includes(nft.rarity);
      if (isRare) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ffff', '#bf00ff', '#ffffff']
        });
      }
    }
  }, [isOpen, nft]);

  const handleCopyTraits = () => {
    const text = nft.traits.map(t => `${t.type}: ${t.value}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Check out my Based Guardian #${nft.id}! Rarity: ${nft.rarity} #BasedGuardians #BasedAI`;
  const shareUrl = window.location.href;

  const handleShare = async () => {
      if (navigator.share) {
          try { 
            await navigator.share({
                title: `Based Guardian #${nft.id}`,
                text: shareText,
                url: shareUrl
            }); 
          } catch(e) {}
      } else {
          navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const handleTwitterShare = () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  // Determine rarity color
  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary': return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]';
      case 'epic': return 'text-purple-400 border-purple-400/50 bg-purple-400/10 shadow-[0_0_15px_rgba(192,132,252,0.2)]';
      case 'rare': return 'text-cyan-400 border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]';
      default: return 'text-slate-400 border-slate-400/50 bg-slate-400/10';
    }
  };

  const rarityColorClass = getRarityColor(nft.rarity);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] md:max-w-[80vw] lg:max-w-5xl w-full h-[95vh] md:h-auto md:max-h-[90vh] p-0 gap-0 bg-black/95 border-white/10 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Image */}
        <div className="relative w-full md:w-1/2 h-1/2 md:h-auto bg-black flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/10 group">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-sm aspect-square rounded-xl overflow-hidden shadow-2xl border border-white/10"
            >
                <img 
                    src={nft.image} 
                    alt={nft.name} 
                    className="w-full h-full object-cover"
                />
                
                {/* ID Overlay */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded text-xs font-mono text-white">
                    #{nft.id}
                </div>

                {/* Rarity Overlay */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded text-xs font-orbitron uppercase border backdrop-blur-md ${rarityColorClass}`}>
                    {nft.rarity}
                </div>
            </motion.div>
        </div>

        {/* Right Side: Details */}
        <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-full bg-card/50">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-start relative">
                <div className="pr-12">
                    <h2 className="text-2xl md:text-4xl font-black text-white font-orbitron tracking-wide uppercase leading-tight mb-2">{nft.name}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-primary/50 text-primary font-mono text-[10px]">
                            <ShieldCheck size={10} className="mr-1" /> VERIFIED
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-muted-foreground font-mono text-[10px]">
                            BASED L1
                        </Badge>
                    </div>
                </div>
                
                <DialogClose asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 h-12 w-12 text-muted-foreground hover:text-white bg-black/50 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/10 hover:border-red-500/50 shadow-lg hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] z-50"
                    >
                        <X size={28} />
                    </Button>
                </DialogClose>
            </div>

            {/* Scrollable Attributes */}
            <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                    {/* Description / Disclaimer */}
                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded text-[10px] text-yellow-500/70 font-mono flex gap-2 items-start whitespace-pre-wrap">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        <span>Metadata is fetched directly from on-chain/IPFS sources. Rarity and values are estimates only.</span>
                    </div>

                    {/* Stats Grid */}
                    <div>
                        <h3 className="text-sm font-orbitron text-white mb-3 flex items-center">
                            <Activity size={14} className="mr-2 text-primary" /> BASE STATS
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {nft.traits.filter(t => ['Strength', 'Speed', 'Agility', 'Intellect'].includes(t.type)).map((trait, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 rounded p-3 flex justify-between items-center group hover:border-primary/30 transition-colors">
                                    <span className="text-xs text-muted-foreground font-mono uppercase">{trait.type}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary" 
                                                style={{ width: `${Math.min(parseInt(trait.value) * 10, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-white">{trait.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Detailed Attributes */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-orbitron text-white flex items-center">
                                <Zap size={14} className="mr-2 text-accent" /> FULL ATTRIBUTES
                            </h3>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-white" onClick={handleCopyTraits}>
                                {copied ? <Check size={12} className="mr-1 text-green-500" /> : <Copy size={12} className="mr-1" />}
                                {copied ? "COPIED" : "COPY ALL"}
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {nft.traits.filter(t => !['Strength', 'Speed', 'Agility', 'Intellect'].includes(t.type)).map((trait, i) => (
                                <div key={i} className="flex flex-col p-2 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <span className="text-[10px] text-muted-foreground font-mono uppercase mb-0.5">{trait.type}</span>
                                    <span className="text-sm text-white font-medium break-words whitespace-pre-wrap">{trait.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto">
                <div className="grid grid-cols-3 gap-3">
                     <Button variant="outline" onClick={handleTwitterShare} className="border-white/10 hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/50 text-xs font-mono">
                        <Twitter size={14} className="mr-2" /> TWEET
                     </Button>
                     <Button variant="outline" onClick={handleShare} className="border-white/10 hover:bg-white/5 text-xs font-mono">
                        <Share2 size={14} className="mr-2" /> SHARE
                     </Button>
                     <Button variant="default" asChild className="bg-primary text-black hover:bg-primary/90 text-xs font-orbitron tracking-wider cursor-pointer">
                        <a href={`https://explorer.bf1337.org/token/${import.meta.env.VITE_NFT_CONTRACT || "0x..."}?a=${nft.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} className="mr-2" /> EXPLORER
                        </a>
                     </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
