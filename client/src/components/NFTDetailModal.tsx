import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, ShieldCheck, Zap, Info, Share2, ExternalLink, Activity, Copy, Check, Twitter, Disc, BarChart3, TrendingUp, Download } from "lucide-react";
import { Guardian, calculateBackedValue } from "@/lib/mockData";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect, useState, useMemo } from "react";
import { MarketItem } from "@/lib/marketplaceData";
import DOMPurify from 'dompurify';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: Guardian | MarketItem | null;
}

export function NFTDetailModal({ isOpen, onClose, nft }: NFTDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [backedValue, setBackedValue] = useState(calculateBackedValue());

  // Live Ticker for Backed Value
  useEffect(() => {
    const interval = setInterval(() => {
        setBackedValue(calculateBackedValue());
    }, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // Safe Sanitize Helper
  const safeSanitize = (content: string | undefined | null) => {
    if (typeof content !== 'string') return '';
    return DOMPurify.sanitize(content);
  };

  useEffect(() => {
    if (isOpen && nft) {
      // Trigger confetti - Always trigger for fun or check rarity
      const isRare = ['Rare', 'Epic', 'Legendary'].includes(nft.rarity) || nft.id % 100 === 0;
      if (isRare) {
        // Use a slightly lower z-index than modal to ensure it doesn't block interactions if that was the issue
        setTimeout(() => {
            confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#00ffff', '#bf00ff', '#ffffff'],
            zIndex: 100 // Lower z-index to be safe, modal is usually 50-100+
            });
        }, 300);
      }
    }
  }, [isOpen, nft]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (!nft || !nft.traits) return [];
    
    // Extract standard stats or generate mock ones for the visual if missing
    // We try to find specific traits, or fallback to random/hash based values for the chart visual
    const getTraitValue = (name: string) => {
        const t = nft.traits.find(tr => tr.type === name);
        if (t) return parseInt(t.value) || 5;
        // Deterministic fallback based on ID for consistency if missing
        return (nft.id * name.length) % 10 + 1;
    };

    return [
        { subject: 'Strength', A: getTraitValue('Strength'), fullMark: 10 },
        { subject: 'Agility', A: getTraitValue('Agility') || getTraitValue('Speed'), fullMark: 10 },
        { subject: 'Intellect', A: getTraitValue('Intelligence') || getTraitValue('Intellect'), fullMark: 10 },
        { subject: 'Tech', A: getTraitValue('Tech') || (nft.id % 10) + 1, fullMark: 10 },
        { subject: 'Charisma', A: getTraitValue('Charisma') || ((nft.id * 2) % 10) + 1, fullMark: 10 },
        { subject: 'Luck', A: getTraitValue('Luck') || ((nft.id * 3) % 10) + 1, fullMark: 10 },
    ];
  }, [nft]);

  if (!nft) return null;

  // Rarity Multiplier for Display
  const isRareItem = ['Rare', 'Epic', 'Legendary'].includes(nft.rarity || '');
  const displayValue = Math.floor(backedValue * (isRareItem ? 1.3 : 1.0));

  const handleCopyTraits = () => {
    if (!nft.traits) return;
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

  const handleDiscordShare = () => {
      // Mock Discord Share (usually just copies link or opens Discord web)
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      {/* 
          Using standard Dialog structure but with custom overlay/content styling for full screen mobile
      */}
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[100vw] h-[100vh] md:w-[90vw] md:h-[90vh] md:max-w-6xl max-w-none p-0 gap-0 bg-black/95 border-0 md:border md:border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl rounded-none md:rounded-xl z-[150] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200">
        <DialogTitle className="sr-only">Guardian #{nft.id} Details</DialogTitle>
        <DialogDescription className="sr-only">Details for Guardian #{nft.id}</DialogDescription>
        
        {/* Left Side: Image */}
        <div className="relative w-full md:w-1/2 h-1/3 md:h-full bg-black flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/10 group shrink-0">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md aspect-square rounded-xl overflow-hidden shadow-2xl border border-white/10"
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
        <div className="w-full md:w-1/2 flex flex-col h-2/3 md:h-full bg-card/50 relative flex-1">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-start relative bg-black/20 shrink-0">
                <div className="pr-16">
                    <h2 className="text-2xl md:text-5xl font-black text-white font-orbitron tracking-wide uppercase leading-tight mb-2">
                        {safeSanitize(nft.name)}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-primary/50 text-primary font-mono text-[10px]">
                            <ShieldCheck size={10} className="mr-1" /> VERIFIED
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-muted-foreground font-mono text-[10px]">
                            BASED L1
                        </Badge>
                    {/* Premium Backed Value Display */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-500/10 to-transparent border-l-4 border-green-500 rounded-r-lg">
                        <div className="text-[10px] text-green-400 font-mono font-bold tracking-wider uppercase mb-1 flex items-center">
                            <TrendingUp size={12} className="mr-2" /> Backed Value
                        </div>
                        <div className="text-3xl font-orbitron text-white text-glow">
                            {displayValue.toLocaleString()} <span className="text-lg text-primary">$BASED</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                            Includes 51% Mint Share + Daily Emissions
                            {isRareItem && <span className="text-green-400 ml-1">(+30% Rarity Boost Active)</span>}
                        </div>
                    </div>
                    </div>
                </div>
                
                <DialogClose asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 h-12 w-12 text-muted-foreground hover:text-white bg-black/50 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/10 hover:border-red-500 shadow-lg z-50 group"
                    >
                        <X size={24} className="group-hover:scale-110 transition-transform group-hover:text-red-400" />
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

                    {/* Radar Chart (Recharts) */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h3 className="text-sm font-orbitron text-white mb-3 flex items-center">
                            <BarChart3 size={14} className="mr-2 text-primary" /> GUARDIAN METRICS
                        </h3>
                        <div className="h-[200px] w-full flex justify-center items-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Stats"
                                        dataKey="A"
                                        stroke="#00ffff"
                                        strokeWidth={2}
                                        fill="#00ffff"
                                        fillOpacity={0.2}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #333', borderRadius: '4px' }}
                                        itemStyle={{ color: '#00ffff', fontSize: '12px', fontFamily: 'monospace' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Detailed Attributes (Wrapped Grid) */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-orbitron text-white flex items-center">
                                <Zap size={14} className="mr-2 text-accent" /> ATTRIBUTES ({nft.traits?.length || 0})
                            </h3>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-white" onClick={handleCopyTraits}>
                                {copied ? <Check size={12} className="mr-1 text-green-500" /> : <Copy size={12} className="mr-1" />}
                                {copied ? "COPIED" : "COPY ALL"}
                            </Button>
                        </div>
                        
                        {nft.traits && nft.traits.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {nft.traits.map((trait, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded p-3 hover:border-primary/30 transition-colors group relative overflow-hidden">
                                        <div className="text-[10px] text-muted-foreground uppercase mb-1 truncate" title={trait.type}>
                                            {safeSanitize(trait.type)}
                                        </div>
                                        <div className="text-sm font-bold text-white truncate" title={trait.value}>
                                            {safeSanitize(trait.value)}
                                        </div>
                                        {/* Hover Copy Button */}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(trait.value);
                                                toast({ description: `${trait.type} copied` });
                                            }}
                                            className="absolute top-1 right-1 p-1 text-white/0 group-hover:text-white/50 hover:!text-primary transition-all"
                                        >
                                            <Copy size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground text-xs font-mono">
                                No attributes found for this Guardian.
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto shrink-0">
                <div className="grid grid-cols-4 gap-3">
                     <Button variant="outline" onClick={handleTwitterShare} className="border-white/10 hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/50 text-xs font-mono">
                        <Twitter size={14} className="mr-2" /> <span className="hidden sm:inline">TWEET</span>
                     </Button>
                     <Button variant="outline" onClick={handleDiscordShare} className="border-white/10 hover:bg-[#5865F2]/20 hover:text-[#5865F2] hover:border-[#5865F2]/50 text-xs font-mono">
                        <Disc size={14} className="mr-2" /> <span className="hidden sm:inline">DISCORD</span>
                     </Button>
                     <Button variant="outline" onClick={handleShare} className="border-white/10 hover:bg-white/5 text-xs font-mono">
                        <Share2 size={14} className="mr-2" /> <span className="hidden sm:inline">SHARE</span>
                     </Button>
                     <Button variant="default" asChild className="bg-primary text-black hover:bg-primary/90 text-xs font-orbitron tracking-wider cursor-pointer">
                        <a href={`https://explorer.bf1337.org/address/${import.meta.env.VITE_NFT_CONTRACT || "0x..."}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} className="mr-2" /> <span className="hidden sm:inline">EXPLORER</span>
                        </a>
                     </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}