import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Twitter, Link2, Check, Share2, Download, X,
  Shield, Zap, Trophy, Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Guardian } from '@/lib/mockData';
import { MarketItem } from '@/lib/marketplaceData';
import { NFTImage } from './NFTImage';
import { getRarityClass } from '@/lib/utils';
import { Security } from '@/lib/security';

interface ShareAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: Guardian | MarketItem | null;
  achievementType?: 'owned' | 'minted' | 'purchased' | 'listed';
}

export function ShareAchievementModal({ 
  isOpen, 
  onClose, 
  nft,
  achievementType = 'owned'
}: ShareAchievementModalProps) {
  const [copied, setCopied] = useState(false);

  if (!nft) return null;

  const rarityColorClass = getRarityClass(nft.rarity || 'Common');
  const shareUrl = `${window.location.origin}/?nft=${nft.id}`;
  
  const achievementMessages = {
    owned: `I own Based Guardian #${nft.id} - ${nft.rarity}!`,
    minted: `Just minted Based Guardian #${nft.id} - ${nft.rarity}!`,
    purchased: `Just acquired Based Guardian #${nft.id} - ${nft.rarity}!`,
    listed: `Listed Based Guardian #${nft.id} - ${nft.rarity} for sale!`
  };

  const achievementIcons = {
    owned: <Shield className="w-5 h-5" />,
    minted: <Zap className="w-5 h-5" />,
    purchased: <Trophy className="w-5 h-5" />,
    listed: <Star className="w-5 h-5" />
  };

  const shareText = `${achievementMessages[achievementType]} Join the Based Guardians community on BasedAI!`;
  const hashtags = 'BasedGuardians,BasedAI,NFT,Web3';

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${hashtags}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      toast({ description: 'Link copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: 'Failed to copy link', variant: 'destructive' });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Based Guardian #${nft.id}`,
          text: shareText,
          url: shareUrl
        });
      } catch (e) {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 bg-black/95 border border-white/10 overflow-hidden z-[10000]">
        <DialogTitle className="sr-only">Share Your Achievement</DialogTitle>
        <DialogDescription className="sr-only">Share your Based Guardian NFT achievement on social media</DialogDescription>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-orbitron">SHARE ACHIEVEMENT</h2>
                <p className="text-xs text-muted-foreground">Show off your Guardian!</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 overflow-hidden" data-testid="share-preview-card">
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-primary/90 text-black font-bold text-xs flex items-center gap-1">
                  {achievementIcons[achievementType]}
                  {achievementType.toUpperCase()}
                </Badge>
              </div>
              <div className="absolute top-3 right-3 z-10">
                <Badge className={`text-xs ${rarityColorClass}`}>
                  {nft.rarity}
                </Badge>
              </div>
              
              <div className="aspect-square relative">
                <NFTImage 
                  src={Security.sanitizeUrl(nft.image)} 
                  alt={Security.sanitizeText(nft.name)}
                  id={nft.id}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>
              
              <div className="p-4 -mt-16 relative z-10">
                <h3 className="text-xl font-black text-white font-orbitron">
                  {Security.sanitizeText(nft.name)}
                </h3>
                <p className="text-sm text-primary font-mono">Guardian #{nft.id}</p>
                
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-xs border-white/20 text-muted-foreground">
                    BasedAI L1
                  </Badge>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    Based Guardians
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Share via</p>
            
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={handleTwitterShare}
                className="flex-col h-auto py-4 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 text-[#1DA1F2]"
                data-testid="share-twitter-btn"
              >
                <Twitter className="w-5 h-5 mb-1" />
                <span className="text-xs">Twitter/X</span>
              </Button>
              
              <Button
                onClick={handleCopyLink}
                className="flex-col h-auto py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                data-testid="share-copy-btn"
              >
                {copied ? <Check className="w-5 h-5 mb-1 text-green-400" /> : <Link2 className="w-5 h-5 mb-1" />}
                <span className="text-xs">{copied ? 'Copied!' : 'Copy Link'}</span>
              </Button>
              
              <Button
                onClick={handleNativeShare}
                className="flex-col h-auto py-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary"
                data-testid="share-native-btn"
              >
                <Share2 className="w-5 h-5 mb-1" />
                <span className="text-xs">Share</span>
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-[10px] text-muted-foreground text-center">
              Share your Based Guardian achievements with the community!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareAchievementModal;
