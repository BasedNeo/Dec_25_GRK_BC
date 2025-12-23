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
import { useInterval } from "@/hooks/useInterval";
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
import { useAccount, useReadContract, useSwitchChain, useChainId } from 'wagmi';
import { useMarketplace, useListing } from '@/hooks/useMarketplace';
import { CHAIN_ID, MARKETPLACE_CONTRACT } from '@/lib/constants';
import { useOffersV3 } from '@/hooks/useOffersV3';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogHeader } from '@/components/ui/dialog';
import { Gavel, Timer, CheckCircle2, AlertTriangle, Lock, MessageSquare, Sparkles } from 'lucide-react';
import { useIsGuardianHolder } from '@/hooks/useIsGuardianHolder';
import { Textarea } from '@/components/ui/textarea';

// Inline Offer Modal Component
function OfferModalInline({ isOpen, onClose, item }: { isOpen: boolean; onClose: () => void; item: Guardian | MarketItem | null }) {
  const [amount, setAmount] = useState<number>(1000);
  const [duration, setDuration] = useState<string>("7");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { makeOffer, isLoading: offerLoading } = useOffersV3();
  const { isHolder } = useIsGuardianHolder();
  
  const durationOptions = [
    { value: "1", label: "1 Day" },
    { value: "3", label: "3 Days" },
    { value: "7", label: "1 Week" },
    { value: "30", label: "1 Month" },
  ];
  
  // Fetch wallet balance
  useEffect(() => {
    if (isOpen && isConnected && address) {
      setBalanceLoading(true);
      const fetchBalance = async () => {
        try {
          const { ethers } = await import('ethers');
          const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
          const balanceWei = await provider.getBalance(address);
          const balance = parseFloat(ethers.formatEther(balanceWei));
          setWalletBalance(balance);
        } catch {
          setWalletBalance(null);
        } finally {
          setBalanceLoading(false);
        }
      };
      fetchBalance();
    }
  }, [isOpen, isConnected, address]);
  
  // Reset when item changes
  useEffect(() => {
    if (item) {
      setAmount(item.price ? Math.floor(item.price * 0.9) : 1000);
      setDuration("7");
      setMessage("");
      setValidationError(null);
    }
  }, [item]);
  
  const handleSubmit = async () => {
    setValidationError(null);
    
    if (!isConnected) {
      onClose();
      setTimeout(() => {
        openConnectModal?.();
      }, 100);
      return;
    }
    
    if (chainId !== 32323) {
      switchChain?.({ chainId: 32323 });
      return;
    }
    
    const sanitizedAmount = Math.max(1, Math.min(Number(amount), 999999999));
    if (isNaN(sanitizedAmount) || sanitizedAmount <= 0 || !item) {
      setValidationError('Please enter a valid offer amount (1 - 999,999,999)');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await makeOffer(item.id, amount, parseInt(duration), isHolder ? message.trim() : undefined);
      if (success) {
        setMessage("");
        onClose();
        toast({ 
          title: "Offer Submitted!", 
          description: `Your offer of ${amount.toLocaleString()} $BASED has been submitted.`,
          className: "bg-black border-cyan-500 text-cyan-500 font-orbitron"
        });
      }
    } catch {
      setValidationError('Failed to submit offer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!item) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-black/95 backdrop-blur-xl border-cyan-500/30 text-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl overflow-y-auto overscroll-contain touch-pan-y"
        style={{ zIndex: 99999, WebkitOverflowScrolling: 'touch' }}
      >
        <DialogHeader className="pt-8 sm:pt-0">
          <DialogTitle className="font-orbitron text-xl flex items-center gap-2">
            <Gavel className="text-cyan-400" size={20} />
            MAKE AN OFFER
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Offer on <span className="text-cyan-400 font-bold">{Security.sanitizeText(item.name)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* V3 INFO BANNER */}
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-400 text-sm mb-1">FUNDS STAY IN YOUR WALLET</p>
                <p className="text-xs text-green-200/80">
                  This is FREE (just a signature). Your $BASED only leaves your wallet when you complete the purchase after seller accepts.
                </p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="text-xs text-cyan-400/70 uppercase font-mono tracking-wider">OFFER AMOUNT ($BASED)</Label>
            <div className="flex gap-2">
              <Input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amount || ''} 
                onChange={(e) => {
                  const val = e.target.value.replace(/^0+/, '').replace(/[^0-9]/g, '');
                  setAmount(val ? parseInt(val, 10) : 0);
                  setValidationError(null);
                }}
                className="bg-white/5 border-white/20 text-white font-mono text-lg focus:border-cyan-500/50 focus:ring-cyan-500/20"
                placeholder="Enter amount..."
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => walletBalance && setAmount(Math.floor(walletBalance * 0.95))}
                disabled={!walletBalance}
                className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 font-mono text-xs px-4 h-10"
              >
                MAX
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {balanceLoading ? (
                <span className="animate-pulse">Loading balance...</span>
              ) : walletBalance !== null ? (
                <>Balance: <span className="text-emerald-400">{walletBalance.toLocaleString()}</span> $BASED</>
              ) : isConnected ? (
                'Could not load balance'
              ) : (
                'Connect wallet to see balance'
              )}
            </div>
          </div>
          
          {/* Validation Error */}
          {validationError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-300">{validationError}</span>
            </div>
          )}

          {/* Duration Select */}
          <div className="space-y-2">
            <Label className="text-xs text-cyan-400/70 uppercase font-mono tracking-wider">OFFER DURATION</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-cyan-500/50 h-12">
                <div className="flex items-center gap-2">
                  <Timer size={16} className="text-cyan-400" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent 
                className="bg-black/95 backdrop-blur-xl border-cyan-500/30 text-white"
                style={{ zIndex: 999999 }}
              >
                {durationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="hover:bg-cyan-500/20">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Message (Guardian Holders only) */}
          {isHolder ? (
            <div className="space-y-2">
              <Label className="text-xs text-cyan-400/70 uppercase font-mono tracking-wider flex items-center gap-2">
                <MessageSquare size={12} /> MESSAGE TO SELLER (Optional)
                <Sparkles size={12} className="text-green-400" />
              </Label>
              <Textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                placeholder="Add a personal message..."
                className="bg-white/5 border-white/20 text-white h-20 resize-none"
              />
              <p className="text-[10px] text-muted-foreground text-right">{message.length}/280</p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-400 text-xs">
                <Lock size={14} />
                <span>Own a Guardian to unlock messaging</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 font-orbitron font-bold text-lg"
            onClick={handleSubmit}
            disabled={isSubmitting || offerLoading}
          >
            {isSubmitting || offerLoading ? (
              <span className="animate-pulse">SIGNING...</span>
            ) : !isConnected ? (
              'CONNECT WALLET'
            ) : (
              <>SUBMIT OFFER</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  useInterval(() => {
    setBackedValue(calculateBackedValue());
  }, 1000);

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

  // Rarity Multiplier for Display (new 7-tier system)
  const isRareItem = ['Epic Legendary', 'Very Rare Legendary', 'Rare', 'Less Rare'].includes(nft.rarity || '');
  
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
        
        {/* Mobile Close Button - Fixed at top right of screen */}
        <DialogClose asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden fixed top-4 right-4 h-12 w-12 text-white bg-black/80 hover:bg-red-500/20 hover:text-red-500 rounded-full border border-white/20 hover:border-red-500 z-[9999]"
          >
            <X size={24} strokeWidth={3} />
          </Button>
        </DialogClose>
        
        {/* Left Side: Image */}
        <div className="relative w-full md:w-1/2 h-[40vh] md:h-full bg-black flex items-center justify-center p-4 md:p-6 md:border-r border-white/10 group shrink-0">
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
                <div className="p-2 bg-cyan-400/50 border-2 border-cyan-300 rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.6)] animate-[pulse_0.8s_ease-in-out_infinite] mb-2">
                  <p className="text-white text-xs font-mono text-center font-bold drop-shadow-[0_0_6px_rgba(0,255,255,0.8)]">⏳ Confirm in wallet...</p>
                </div>
              )}
              {marketplace.state.isConfirming && (
                <div className="p-2 bg-amber-400/50 border-2 border-amber-300 rounded-lg shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-[pulse_0.8s_ease-in-out_infinite] mb-2">
                  <p className="text-white text-xs font-mono text-center font-bold drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">⏳ Confirming...</p>
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
                        onClick={() => marketplace.listNFT(nft.id, String(listPrice))}
                        disabled={listPrice < 1 || marketplace.state.isPending}
                      >
                        LIST
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground font-mono mb-0.5">LISTED FOR</p>
                        <p className="text-xl font-orbitron text-green-400 font-bold tracking-tight">
                          {currentListingPrice?.toLocaleString()} <span className="text-sm">$BASED</span>
                        </p>
                      </div>
                      <Button 
                        className="bg-red-500 text-white hover:bg-red-600 font-bold font-orbitron text-sm h-10 px-5 shrink-0"
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
              ) : (
                /* Unminted NFT - Show Mint Button */
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono">MINT PRICE</p>
                      <p className="text-lg font-orbitron text-purple-400 font-bold">
                        {MINT_PRICE.toLocaleString()} $BASED
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-500 hover:to-cyan-400 font-orbitron font-bold text-sm h-10"
                    onClick={() => setShowMintExplainerModal(true)}
                    data-testid="button-mint-nft-mobile"
                  >
                    MINT AN NFT
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center font-mono">
                    Random mint - you'll receive a random Guardian
                  </p>
                </div>
              )}
            </div>
        </div>

        {/* Right Side: Details */}
        <div className="w-full md:w-1/2 flex flex-col h-[60vh] md:h-full bg-card/50 relative">
            {/* Header - Compact */}
            <div className="p-4 border-b border-white/10 flex justify-between items-start relative bg-black/20 shrink-0">
                <div className="pr-12">
                    <h2 className="text-xl md:text-3xl font-black text-white font-orbitron tracking-wide uppercase leading-tight mb-1">
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
                        className="hidden md:flex absolute top-3 right-3 h-10 w-10 text-white hover:text-white bg-black/80 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all border border-white/20 hover:border-red-500 z-50 group"
                    >
                        <X size={20} className="group-hover:scale-110 transition-transform group-hover:text-red-400 font-bold" strokeWidth={3} />
                    </Button>
                </DialogClose>
            </div>

            {/* Scrollable Attributes - Using overflow-y-auto instead of ScrollArea for reliability */}
            <div 
              className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 touch-pan-y"
              style={{ 
                maxHeight: 'calc(100% - 80px)',
                WebkitOverflowScrolling: 'touch'
              }}
            >
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
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto shrink-0 space-y-4">
                {/* TRANSACTION STATE FEEDBACK - Desktop only */}
                <div className="hidden md:block space-y-4">
                  {marketplace.state.isPending && (
                    <div className="p-3 bg-cyan-400/50 border-2 border-cyan-300 rounded-lg shadow-[0_0_25px_rgba(0,255,255,0.6)] animate-[pulse_0.8s_ease-in-out_infinite]">
                      <p className="text-white text-sm font-mono text-center font-bold drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]">⏳ Confirm in your wallet...</p>
                    </div>
                  )}
                  {marketplace.state.isConfirming && (
                    <div className="p-3 bg-amber-400/50 border-2 border-amber-300 rounded-lg shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-[pulse_0.8s_ease-in-out_infinite]">
                      <p className="text-white text-sm font-mono text-center font-bold drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">⏳ Transaction confirming on blockchain...</p>
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
                          onClick={() => marketplace.listNFT(nft.id, String(listPrice))}
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

                {/* UNMINTED NFT CONTROLS - Desktop only, show MINT button for unminted NFTs */}
                {!isOwner && !nft.owner && (
                  <div className="hidden md:block space-y-3">
                    <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">MINT PRICE</p>
                        <p className="text-xl font-orbitron text-purple-400 font-bold">
                          {MINT_PRICE.toLocaleString()} $BASED
                        </p>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">AVAILABLE</Badge>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-500 hover:to-cyan-400 font-orbitron font-bold py-3"
                      onClick={() => setShowMintExplainerModal(true)}
                      data-testid="button-mint-nft-desktop"
                    >
                      MINT AN NFT
                    </Button>
                    <p className="text-xs text-muted-foreground text-center font-mono">
                      Random mint - you'll receive a random Guardian from the unminted pool
                    </p>
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

    {/* Offer Modal - MUST be outside the parent Dialog */}
    <OfferModalInline 
      isOpen={showOfferModal}
      onClose={() => setShowOfferModal(false)}
      item={nft}
    />

    {/* Mint Explainer Modal - MUST be outside the parent Dialog */}
    <Dialog open={showMintExplainerModal} onOpenChange={setShowMintExplainerModal}>
      <DialogContent className="bg-black/95 border border-cyan-500/50 max-w-md p-6 z-[10000]">
        <DialogTitle className="text-xl font-orbitron text-cyan-400 mb-4">
          Random Mint Process
        </DialogTitle>
        <DialogDescription className="sr-only">Information about the random mint process for Based Guardians</DialogDescription>
        <div className="text-gray-300 space-y-4">
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
        </div>
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