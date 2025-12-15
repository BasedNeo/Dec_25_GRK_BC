import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, ShieldCheck, Zap, Info, Share2, ExternalLink, Activity, Copy, Check, Twitter, Disc, BarChart3, TrendingUp, Download, MessageCircle, Tag, XCircle } from "lucide-react";
import { Guardian, calculateBackedValue } from "@/lib/mockData";
const MINT_PRICE = 69420;
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect, useState, useMemo } from "react";
import { MarketItem } from "@/lib/marketplaceData";
import DOMPurify from 'dompurify';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { NFT_CONTRACT, BLOCK_EXPLORER } from "@/lib/constants";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Security } from "@/lib/security";
import { getRarityClass } from "@/lib/utils";
import { BuyButton } from "./BuyButton";
import { NFTImage } from "./NFTImage";
import { ShareAchievementModal } from "./ShareAchievementModal";
import { useAccount, useReadContract } from 'wagmi';
import { useMarketplace, useListing } from '@/hooks/useMarketplace';
import { CHAIN_ID, MARKETPLACE_CONTRACT } from '@/lib/constants';

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: Guardian | MarketItem | null;
}

export function NFTDetailModal({ isOpen, onClose, nft }: NFTDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [backedValue, setBackedValue] = useState(calculateBackedValue());
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [listPrice, setListPrice] = useState<number>(MINT_PRICE);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showMintExplainerModal, setShowMintExplainerModal] = useState(false);
  
  const { address, isConnected } = useAccount();
  const marketplace = useMarketplace();
  const { listing, isLoading: isLoadingListing, refetch: refetchListing } = useListing(nft?.id);
  
  // Fetch actual owner from NFT contract for real-time accuracy
  const { data: actualOwner, refetch: refetchOwner } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: [{
      name: 'ownerOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'tokenId', type: 'uint256' }],
      outputs: [{ type: 'address' }]
    }],
    functionName: 'ownerOf',
    args: nft?.id !== undefined ? [BigInt(nft.id)] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: nft?.id !== undefined && isOpen }
  });
  
  // Use on-chain owner if available, fallback to nft.owner
  const isOwner = address && actualOwner 
    ? address.toLowerCase() === (actualOwner as string).toLowerCase()
    : nft && 'owner' in nft && address 
      ? nft.owner?.toLowerCase() === address?.toLowerCase() 
      : false;
  const isListed = listing?.active ?? nft?.isListed ?? false;
  const currentListingPrice = listing?.price ? Number(listing.price) : nft?.price;
  
  // Auto-refresh after successful transactions
  useEffect(() => {
    if (marketplace.state.isSuccess) {
      // Refresh all marketplace data
      refetchOwner();
      refetchListing();
      marketplace.refresh();
      
      // Reset state after 3 seconds
      setTimeout(() => marketplace.reset(), 3000);
    }
  }, [marketplace.state.isSuccess, refetchOwner, refetchListing]);
  
  const handleAcceptOffer = async (offer: any) => {
    if (!nft) return;
    try {
      await marketplace.acceptOffer(nft.id, offer.offerer);
      toast({ 
        title: "Offer Accepted", 
        description: `You accepted an offer of ${offer.amount} $BASED`,
        className: "bg-black border-green-500 text-green-500 font-orbitron"
      });
    } catch (error) {
      console.error('Failed to accept offer:', error);
    }
  };

  useEffect(() => {
    // Reset state on open if needed
  }, [isOpen, nft]);

  // Live Ticker for Backed Value
  useEffect(() => {
    const interval = setInterval(() => {
        setBackedValue(calculateBackedValue());
    }, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // Safe Sanitize Helper - Strips HTML tags to enforce textContent
  const safeSanitize = (content: string | undefined | null) => {
    return Security.sanitizeText(content);
  };

  useEffect(() => {
    if (isOpen && nft) {
      // Trigger confetti only for Legendaries to reduce clutter
      const isLegendary = nft.rarity?.toLowerCase().includes('legendary') || nft.rarity?.toLowerCase().includes('rarest');
      if (isLegendary) {
        // Use a slightly lower z-index than modal to ensure it doesn't block interactions if that was the issue
        setTimeout(() => {
            confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#00ffff', '#bf00ff', '#ffffff'],
            zIndex: 1100 // Higher z-index to be on top of modal (1000)
            });
        }, 300);
      }
    }
  }, [isOpen, nft]);

  // Chart Data Preparation (Removed as per request to switch back to card view for stats)
  
  if (!nft) return null;

  // Rarity Multiplier for Display
  const isRareItem = ['More Rare', 'Very Rare', 'Rarest-Legendary', 'Rare', 'Less Rare'].includes(nft.rarity || '');
  
  // Calculate Boosted Value
  // Base formula: 51% mint share + emissions
  // Boost: +30% on the total value for rare items
  // Note: We use calculateBackedValue which now has the exact multiplier logic, so we can just use that if we pass rarity
  // But for this display variable, let's use the explicit logic from mockData if available
  const currentBacked = calculateBackedValue(nft.rarity || 'Common');
  const displayValue = currentBacked;

  const handleCopyTraits = () => {
    if (!nft.traits) return;
    const text = nft.traits.map(t => `${t.type}: ${t.value}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Check out Based Guardian #${nft.id} - ${nft.rarity}! 🛡️\n${window.location.href}`;
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
          navigator.clipboard.writeText(shareText);
          setCopied(true);
          toast({ description: "Share link copied to clipboard" });
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const handleTwitterShare = () => {
      const text = `Check out Based Guardian #${nft.id} - ${nft.rarity}! 🛡️`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };


  // Determine rarity color
  const getRarityColor = (rarity: string) => {
    return getRarityClass(rarity);
  };

  const rarityColorClass = getRarityColor(nft.rarity || 'Common');

  // Grouped Stats Logic
  const statKeys = ['Speed', 'Agility', 'Intellect', 'Intelligence', 'Strength'];
  const stats = nft.traits?.filter(t => statKeys.includes(t.type)) || [];
  const otherTraits = nft.traits?.filter(t => !statKeys.includes(t.type)) || [];
  
  // Helper to safely parse stat value
  const getStatValue = (val: string) => {
    const parsed = parseInt(val);
    return isNaN(parsed) ? 5 : parsed; // Default to 5 if not a number
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
          Using standard Dialog structure but with custom overlay/content styling for full screen mobile
      */}
      <DialogContent className="modal-content fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[100vw] h-[100vh] md:w-[90vw] md:h-[90vh] md:max-w-6xl max-w-none p-0 gap-0 bg-black/95 border-0 md:border md:border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl rounded-none md:rounded-xl z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200">
        <DialogTitle className="sr-only">Guardian #{nft.id} Details</DialogTitle>
        <DialogDescription className="sr-only">Details for Guardian #{nft.id}</DialogDescription>
        
        {/* Left Side: Image */}
        <div className="relative w-full md:w-1/2 h-1/4 md:h-full bg-black flex items-center justify-center p-4 md:p-6 border-b md:border-b-0 md:border-r border-white/10 group shrink-0">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md aspect-square rounded-xl overflow-hidden shadow-2xl border border-white/10"
            >
                <NFTImage 
                    src={Security.sanitizeUrl(nft.image)} 
                    alt={Security.sanitizeText(nft.name)} 
                    id={nft.id}
                    className="w-full h-full object-cover transition-opacity duration-300"
                />
                
                {/* ID Overlay */}
                <a 
                    href={`${BLOCK_EXPLORER}/token/${NFT_CONTRACT}/instance/${nft.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded text-xs font-mono text-white hover:text-cyan-400 hover:border-cyan-400/50 transition-colors flex items-center gap-1 z-20"
                >
                    #{nft.id} <ExternalLink size={10} />
                </a>

                {/* Rarity Overlay */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded text-xs font-orbitron uppercase border backdrop-blur-md ${rarityColorClass}`}>
                    {nft.rarity}
                </div>
            </motion.div>

            {/* MOBILE ONLY: Buyer Controls Right Below Image */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/95 to-transparent z-20">
              {/* Transaction State Feedback - Mobile */}
              {marketplace.state.isPending && (
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg animate-pulse mb-2">
                  <p className="text-cyan-400 text-xs font-mono text-center">⏳ Confirm in wallet...</p>
                </div>
              )}
              {marketplace.state.isConfirming && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-pulse mb-2">
                  <p className="text-amber-400 text-xs font-mono text-center">⏳ Confirming...</p>
                </div>
              )}
              {marketplace.state.isSuccess && (
                <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg mb-2">
                  <p className="text-green-400 text-xs font-mono text-center">✅ Success!</p>
                </div>
              )}
              
              {/* Owner Controls - Mobile */}
              {isOwner ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-green-400 text-center">YOU OWN THIS NFT</p>
                  {!marketplace.isApproved ? (
                    <Button 
                      className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold font-orbitron text-sm py-2"
                      onClick={async () => {
                        await marketplace.approveMarketplace();
                        setTimeout(() => marketplace.refresh(), 3000);
                      }}
                      disabled={marketplace.state.isPending || marketplace.state.isConfirming}
                    >
                      {marketplace.state.isPending ? 'CONFIRM...' : 'APPROVE MARKETPLACE'}
                    </Button>
                  ) : !isListed ? (
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={listPrice || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+/, '').replace(/[^0-9]/g, '');
                          setListPrice(val ? parseInt(val, 10) : 0);
                        }}
                        placeholder="77000"
                        className="flex-1 bg-white/5 border-white/10 font-mono text-sm h-10"
                      />
                      <Button 
                        className="bg-green-500 text-black hover:bg-green-400 font-bold font-orbitron text-sm h-10 px-4"
                        onClick={() => marketplace.listNFT(nft.id, listPrice)}
                        disabled={listPrice < 1 || marketplace.state.isPending}
                      >
                        LIST
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 text-center">
                        <p className="text-lg font-orbitron text-green-400 font-bold">
                          {currentListingPrice?.toLocaleString()} $BASED
                        </p>
                      </div>
                      <Button 
                        className="bg-red-500/80 text-white hover:bg-red-500 font-bold font-orbitron text-sm h-10 px-4"
                        onClick={() => marketplace.delistNFT(nft.id)}
                        disabled={marketplace.state.isPending}
                      >
                        DELIST
                      </Button>
                    </div>
                  )}
                </div>
              ) : nft.owner ? (
                /* Buyer Controls - Mobile */
                <div className="space-y-2">
                  {isListed ? (
                    <>
                      <div className="flex items-center justify-between p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-mono">PRICE</p>
                          <p className="text-lg font-orbitron text-cyan-400 font-bold">
                            {currentListingPrice?.toLocaleString()} $BASED
                          </p>
                        </div>
                        <BuyButton 
                          tokenId={nft.id} 
                          price={currentListingPrice || MINT_PRICE} 
                          className="h-10"
                          onBuy={(id, price) => {
                              toast({ 
                                  title: "Purchase Initiated", 
                                  description: `Buying Guardian #${id}...`,
                                  className: "bg-black border-cyan-500 text-cyan-500 font-orbitron"
                              });
                          }}
                        />
                      </div>
                      <Button 
                        className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 font-orbitron font-bold text-sm h-10"
                        onClick={() => setShowOfferModal(true)}
                      >
                        MAKE OFFER
                      </Button>
                    </>
                  ) : (
                    <Button 
                      className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-orbitron font-bold text-sm h-10"
                      onClick={() => setShowOfferModal(true)}
                    >
                      MAKE OFFER
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
        </div>

        {/* Right Side: Details */}
        <div className="w-full md:w-1/2 flex flex-col h-3/4 md:h-full bg-card/50 relative flex-1">
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
                    </div>
                </div>
                
                <DialogClose asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 h-14 w-14 md:h-14 md:w-14 h-[80px] w-[80px] text-white hover:text-white bg-black/80 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/20 hover:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] z-50 group"
                    >
                        <X size={32} className="md:w-8 md:h-8 w-12 h-12 group-hover:scale-110 transition-transform group-hover:text-red-400 font-bold" strokeWidth={3} />
                    </Button>
                </DialogClose>
            </div>

            {/* Scrollable Attributes */}
            <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                    {/* Premium Backed Value Display (Scrollable) */}
                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-transparent border-l-4 border-green-500 rounded-r-lg">
                        <div className="text-[10px] text-green-400 font-mono font-bold tracking-wider uppercase mb-1 flex items-center">
                            <TrendingUp size={12} className="mr-2" /> Backed Value
                        </div>
                        <div className="text-3xl font-orbitron text-white text-glow">
                            {displayValue.toLocaleString()} <span className="text-lg text-primary">$BASED</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                            Includes 51% Mint Share + Daily Emissions
                            {isRareItem && <span className="text-green-400 ml-1">(Rarity Boost Active)</span>}
                            <div className="mt-1 text-primary/70">Boosted Value: {displayValue.toLocaleString()} $BASED</div>
                        </div>
                    </div>

                    {/* Description / Disclaimer */}
                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded text-[10px] text-yellow-500/70 font-mono flex gap-2 items-start whitespace-pre-wrap">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        <span>Metadata is fetched directly from on-chain/IPFS sources. Rarity and values are estimates only.</span>
                    </div>

                    <Separator className="bg-white/10" />
                    
                    {/* Stats Group (Speed, Agility, etc.) */}
                    {stats.length > 0 && (
                        <div>
                             <h3 className="text-sm font-orbitron text-white mb-3 flex items-center">
                                <BarChart3 size={14} className="mr-2 text-primary" /> BASE STATS
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {stats.map((stat, i) => {
                                    const val = getStatValue(stat.value);
                                    return (
                                        <div key={i} className="stat-card bg-white/5 border border-white/10 rounded p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">{stat.type}</span>
                                                <span className="text-sm font-bold text-white font-orbitron">{stat.value}/10</span>
                                            </div>
                                            {/* Green Progress Bar */}
                                            <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(val / 10) * 100}%` }}
                                                    transition={{ duration: 1, delay: 0.2 }}
                                                    className="h-full bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <Separator className="bg-white/10 mt-6" />
                        </div>
                    )}

                    {/* Detailed Attributes (Wrapped Grid) */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-orbitron text-white flex items-center">
                                <Zap size={14} className="mr-2 text-accent" /> ATTRIBUTES ({otherTraits.length || 0})
                            </h3>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-white" onClick={handleCopyTraits}>
                                {copied ? <Check size={12} className="mr-1 text-green-500" /> : <Copy size={12} className="mr-1" />}
                                {copied ? "COPIED" : "COPY ALL"}
                            </Button>
                        </div>
                        
                        {otherTraits && otherTraits.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {otherTraits.map((trait, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded p-3 hover:border-primary/30 transition-colors group relative overflow-hidden">
                                        <div className="text-[10px] text-muted-foreground uppercase mb-1 truncate" title={trait.type}>
                                            {safeSanitize(trait.type)}
                                        </div>
                                        <div className="text-sm font-bold text-white whitespace-normal break-words leading-tight" title={trait.value}>
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

                    {/* ACTIVE OFFERS SECTION - OpenSea Style */}
                    <div className="mt-6 border-t border-white/10 pt-4">
                        <h4 className="text-sm font-orbitron text-white mb-3 flex items-center gap-2">
                            <MessageCircle size={14} className="text-cyan-400" />
                            OFFERS
                        </h4>
                        
                        {activeOffers && activeOffers.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {activeOffers.map((offer, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                                <span className="text-xs font-mono text-cyan-400">
                                                    {offer.offerer.slice(0, 4)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-mono text-white">{Number(offer.amount).toLocaleString()} $BASED</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Expires: {new Date(offer.expiresAt * 1000).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Show Accept button if user is owner */}
                                        {isOwner && (
                                            <Button 
                                                size="sm" 
                                                className="bg-green-500 text-black hover:bg-green-600 text-xs"
                                                onClick={() => handleAcceptOffer(offer)}
                                            >
                                                ACCEPT
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No active offers</p>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto shrink-0 space-y-4">
                {/* TRANSACTION STATE FEEDBACK - Desktop only */}
                <div className="hidden md:block space-y-4">
                  {marketplace.state.isPending && (
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg animate-pulse">
                      <p className="text-cyan-400 text-sm font-mono text-center">⏳ Confirm in your wallet...</p>
                    </div>
                  )}
                  {marketplace.state.isConfirming && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-pulse">
                      <p className="text-amber-400 text-sm font-mono text-center">⏳ Transaction confirming on blockchain...</p>
                    </div>
                  )}
                  {marketplace.state.isSuccess && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm font-mono text-center">✅ Transaction successful!</p>
                    </div>
                  )}
                </div>
                {marketplace.state.isError && marketplace.state.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm font-mono text-center">❌ {marketplace.state.error}</p>
                  </div>
                )}

                {/* OWNER CONTROLS - Desktop only */}
                {isOwner && (
                  <div className="hidden md:block space-y-4 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                    <p className="text-xs font-mono text-green-400 text-center">YOU OWN THIS NFT</p>
                    {/* STEP 1: Approve Marketplace (if not already approved) */}
                    {!marketplace.isApproved ? (
                      <div className="space-y-3">
                        <p className="text-xs text-amber-400 text-center font-mono">
                          Step 1 of 2: Approve marketplace to list your NFTs
                        </p>
                        <Button 
                          className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold font-orbitron"
                          onClick={async () => {
                            await marketplace.approveMarketplace();
                            setTimeout(() => marketplace.refresh(), 3000);
                          }}
                          disabled={marketplace.state.isPending || marketplace.state.isConfirming}
                          data-testid="button-approve-marketplace"
                        >
                          {marketplace.state.isPending ? 'CONFIRM IN WALLET...' :
                           marketplace.state.isConfirming ? 'APPROVING...' :
                           'APPROVE MARKETPLACE'}
                        </Button>
                      </div>
                    ) : !isListed ? (
                      /* STEP 2: List for Sale */
                      <div className="space-y-3">
                        <p className="text-xs text-green-400 text-center font-mono">
                          ✓ Marketplace approved! Set your price:
                        </p>
                        <div className="flex gap-2 items-center">
                          <Input 
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={listPrice || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/^0+/, '').replace(/[^0-9]/g, '');
                              setListPrice(val ? parseInt(val, 10) : 0);
                            }}
                            placeholder="77000"
                            className="flex-1 bg-white/5 border-white/10 font-mono text-lg"
                            data-testid="input-list-price"
                          />
                          <span className="text-muted-foreground font-mono">$BASED</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          You'll receive {Math.floor(listPrice * 0.99).toLocaleString()} $BASED after 1% fee
                        </p>
                        <Button 
                          className="w-full bg-green-500 text-black hover:bg-green-400 font-bold font-orbitron shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                          onClick={() => marketplace.listNFT(nft.id, listPrice)}
                          disabled={listPrice < 1 || marketplace.state.isPending}
                          data-testid="button-list-nft"
                        >
                          <Tag size={16} className="mr-2" />
                          {marketplace.state.isPending ? 'LISTING...' : 'LIST FOR SALE'}
                        </Button>
                      </div>
                    ) : (
                      /* Already Listed - Show Delist Button */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground font-mono">LISTED FOR</p>
                            <p className="text-xl font-orbitron text-green-400 font-bold">
                              {currentListingPrice?.toLocaleString() || '—'} $BASED
                            </p>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">ACTIVE</Badge>
                        </div>
                        <Button 
                          className="w-full bg-red-500/80 text-white hover:bg-red-500 font-bold font-orbitron"
                          onClick={() => marketplace.delistNFT(nft.id)}
                          disabled={marketplace.state.isPending}
                          data-testid="button-delist-nft"
                        >
                          <XCircle size={16} className="mr-2" />
                          {marketplace.state.isPending ? 'REMOVING...' : 'REMOVE LISTING'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* BUYER CONTROLS - Desktop only, show if NOT owner AND NFT is minted */}
                {!isOwner && nft.owner && (
                  <div className="hidden md:block space-y-3">
                    {isListed ? (
                      <>
                        <div className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground font-mono">LISTED PRICE</p>
                            <p className="text-xl font-orbitron text-cyan-400 font-bold">
                              {currentListingPrice?.toLocaleString()} $BASED
                            </p>
                          </div>
                        </div>
                        <BuyButton 
                          tokenId={nft.id} 
                          price={currentListingPrice || MINT_PRICE} 
                          className="w-full"
                          onBuy={(id, price) => {
                              toast({ 
                                  title: "Purchase Initiated", 
                                  description: `Buying Guardian #${id} for ${price.toLocaleString()} $BASED...`,
                                  className: "bg-black border-cyan-500 text-cyan-500 font-orbitron"
                              });
                          }}
                        />
                        <Button 
                          className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-orbitron font-bold"
                          onClick={() => setShowOfferModal(true)}
                          data-testid="button-make-offer"
                        >
                          MAKE OFFER
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-orbitron font-bold"
                        onClick={() => setShowOfferModal(true)}
                        data-testid="button-make-offer"
                      >
                        MAKE OFFER
                      </Button>
                    )}
                  </div>
                )}

                <Separator className="bg-white/10" />

                <div className="grid grid-cols-3 gap-3">
                     <Button variant="outline" onClick={handleTwitterShare} className="border-white/10 hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/50 text-xs font-mono">
                        <Twitter size={14} className="mr-2" /> <span className="hidden sm:inline">TWEET</span>
                     </Button>
                     <Button variant="outline" onClick={() => setShowShareModal(true)} className="border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/50 text-xs font-mono" data-testid="open-share-modal-btn">
                        <Share2 size={14} className="mr-2" /> <span className="hidden sm:inline">SHARE</span>
                     </Button>
                     <Button variant="default" asChild className="bg-white/5 text-white hover:bg-white/10 text-xs font-orbitron tracking-wider cursor-pointer border border-white/10">
                        <a href={`${BLOCK_EXPLORER}/address/${NFT_CONTRACT}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} className="mr-2" /> <span className="hidden sm:inline">EXPLORER</span>
                        </a>
                     </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>

    <ShareAchievementModal 
      isOpen={showShareModal}
      onClose={() => setShowShareModal(false)}
      nft={nft}
      achievementType="owned"
    />

    {/* Mint Explainer Modal - MUST be outside the parent Dialog */}
    <Dialog open={showMintExplainerModal} onOpenChange={setShowMintExplainerModal}>
      <DialogContent className="bg-black/95 border border-cyan-500/50 max-w-md p-6 z-[10000]">
        <DialogTitle className="text-xl font-orbitron text-cyan-400 mb-4">
          Random Mint Process
        </DialogTitle>
        <DialogDescription className="text-gray-300 space-y-4">
          <p>
            Based Guardians uses a <span className="text-cyan-400 font-semibold">random mint</span> system. 
            This means you cannot choose a specific Guardian to mint.
          </p>
          <p>
            When you mint, you'll receive a randomly assigned Guardian from the unminted pool. 
            Each Guardian is unique with its own rarity and traits!
          </p>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mt-4">
            <p className="text-cyan-400 font-orbitron text-sm">
              Ready to mint? Click below to continue to the minting page.
            </p>
          </div>
        </DialogDescription>
        <div className="flex gap-3 mt-6">
          <Button 
            variant="outline" 
            className="flex-1 border-white/20 text-white hover:bg-white/10 font-orbitron"
            onClick={() => setShowMintExplainerModal(false)}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-green-500 text-black hover:bg-green-400 font-orbitron font-bold"
            onClick={() => {
              setShowMintExplainerModal(false);
              window.open('https://aftermint.trade', '_blank');
            }}
            data-testid="button-confirm-mint"
          >
            Continue to Mint
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}