import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, BookOpen, Eye, EyeOff, Lock, Unlock, 
  Users, MapPin, Calendar, ChevronRight, Star, Shield, 
  Zap, Ghost, Crown, Compass, X, ChevronLeft, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  LORE_CHARACTERS, 
  LORE_LOCATIONS, 
  LORE_EVENTS, 
  LORE_FACTIONS,
  DISCOVERY_QUOTES,
  type LoreCharacter,
  type LoreLocation,
  type LoreEvent,
  type LoreFaction
} from "@/lib/loreData";
import { IPFS_ROOT } from "@/lib/constants";

const PINATA_GATEWAY = 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/';

function NFTImageGallery({ tokenIds, characterName }: { tokenIds: number[]; characterName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Lazy load - only fetch images when component is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  const fetchImage = useCallback(async (tokenId: number) => {
    try {
      const res = await fetch(`${IPFS_ROOT}${tokenId}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.image) {
          const imageUrl = data.image
            .replace('ipfs://', PINATA_GATEWAY)
            .replace('https://ipfs.io/ipfs/', PINATA_GATEWAY);
          return imageUrl;
        }
      }
    } catch {
    }
    return null;
  }, []);
  
  useEffect(() => {
    if (!isVisible) return;
    
    const loadImages = async () => {
      setLoading(true);
      // Only load first 3 images initially for faster load
      const imagePromises = tokenIds.slice(0, 3).map(async (id) => {
        const url = await fetchImage(id);
        return { id, url };
      });
      const results = await Promise.all(imagePromises);
      const imageMap: Record<number, string> = {};
      results.forEach(r => {
        if (r.url) imageMap[r.id] = r.url;
      });
      setImages(imageMap);
      setLoading(false);
    };
    loadImages();
  }, [tokenIds, fetchImage, isVisible]);
  
  const displayIds = tokenIds.slice(0, 3);
  const currentTokenId = displayIds[currentIndex];
  const currentImage = images[currentTokenId];
  
  const nextImage = () => setCurrentIndex((i) => (i + 1) % displayIds.length);
  const prevImage = () => setCurrentIndex((i) => (i - 1 + displayIds.length) % displayIds.length);
  
  return (
    <div 
      ref={containerRef} 
      className="relative w-full mb-4"
      style={{ minHeight: '200px' }}
    >
      <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-black border border-white/10">
        {!isVisible || loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-900/20 to-purple-900/20">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : currentImage ? (
          <>
            <img
              key={currentTokenId}
              src={currentImage}
              alt={`${characterName} #${currentTokenId}`}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'block' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {displayIds.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors z-10"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors z-10"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {displayIds.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-cyan-400' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
              </>
            )}
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-xs text-white/80 font-mono z-10">
              #{currentTokenId}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
            <ImageIcon className="w-10 h-10 mb-2" />
            <span className="text-sm">No image available</span>
          </div>
        )}
      </div>
    </div>
  );
}

type TabType = 'characters' | 'locations' | 'events' | 'factions';

interface DiscoveryState {
  characters: string[];
  locations: string[];
  events: string[];
  secrets: string[];
}

const STORAGE_KEY = 'basedguardians_lore_discoveries';

function getStoredDiscoveries(): DiscoveryState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
  }
  return { characters: [], locations: [], events: [], secrets: [] };
}

function saveDiscoveries(state: DiscoveryState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function CharacterCard({ 
  character, 
  isDiscovered, 
  hasSecretUnlocked,
  onDiscover,
  onUnlockSecret 
}: { 
  character: LoreCharacter;
  isDiscovered: boolean;
  hasSecretUnlocked: boolean;
  onDiscover: () => void;
  onUnlockSecret: () => void;
}) {
  const [showSecret, setShowSecret] = useState(false);
  
  const typeColors = {
    guardian: 'from-cyan-500 to-blue-500',
    frog: 'from-green-500 to-emerald-500',
    creature: 'from-purple-500 to-violet-500'
  };
  
  const typeIcons = {
    guardian: Shield,
    frog: Zap,
    creature: Ghost
  };
  
  const TypeIcon = typeIcons[character.type];
  
  if (!isDiscovered) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Card 
          className="bg-black/40 border-white/10 p-4 cursor-pointer hover:border-cyan-500/50 transition-all group"
          onClick={onDiscover}
          data-testid={`lore-card-locked-${character.id}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white/30 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div>
              <p className="text-white/30 font-mono text-sm">??? Unknown ???</p>
              <p className="text-white/20 text-xs mt-1">Click to discover</p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
        </Card>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      <Card 
        className="bg-black/40 border-white/10 overflow-hidden"
        data-testid={`lore-card-${character.id}`}
      >
        <div className={`h-1 bg-gradient-to-r ${typeColors[character.type]}`} />
        
        <div className="p-4">
          {character.nftTokenIds && character.nftTokenIds.length > 0 && (
            <NFTImageGallery 
              tokenIds={character.nftTokenIds} 
              characterName={character.name} 
            />
          )}
          
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${typeColors[character.type]} flex items-center justify-center`}>
                <TypeIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-white">{character.name}</h3>
                <p className="text-xs text-white/50">{character.title}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-white/20 text-white/60 capitalize">
              {character.type}
            </Badge>
          </div>
          
          <p className="text-sm text-white/70 mb-3 leading-relaxed">
            {character.backstory}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {character.traits.map((trait, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] bg-white/5 text-white/50">
                {trait}
              </Badge>
            ))}
          </div>
          
          <div className="text-xs text-white/40 mb-3">
            <span className="text-cyan-400/70">Allegiance:</span> {character.allegiance}
          </div>
          
          <div className="border-t border-white/10 pt-3">
            {hasSecretUnlocked ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 mb-2"
                  onClick={() => setShowSecret(!showSecret)}
                  data-testid={`button-toggle-secret-${character.id}`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Secret Lore
                  </span>
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                
                <AnimatePresence>
                  {showSecret && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20"
                    >
                      <p className="text-sm text-purple-200/80 italic leading-relaxed">
                        {character.secretLore}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-white/40 hover:text-purple-400 hover:bg-purple-500/10"
                onClick={onUnlockSecret}
                data-testid={`button-unlock-secret-${character.id}`}
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Unlock Secret Lore
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function LocationCard({ 
  location, 
  isDiscovered, 
  hasSecretUnlocked,
  onDiscover,
  onUnlockSecret,
  characters
}: { 
  location: LoreLocation;
  isDiscovered: boolean;
  hasSecretUnlocked: boolean;
  onDiscover: () => void;
  onUnlockSecret: () => void;
  characters: LoreCharacter[];
}) {
  const [showSecret, setShowSecret] = useState(false);
  const connectedChars = characters.filter(c => location.connectedCharacters.includes(c.id));
  
  if (!isDiscovered) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card 
          className="bg-black/40 border-white/10 p-4 cursor-pointer hover:border-purple-500/50 transition-all group"
          onClick={onDiscover}
          data-testid={`lore-location-locked-${location.id}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
              <Compass className="w-5 h-5 text-white/30 group-hover:text-purple-400 transition-colors" />
            </div>
            <div>
              <p className="text-white/30 font-mono text-sm">??? Uncharted ???</p>
              <p className="text-white/20 text-xs mt-1">Click to explore</p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="bg-black/40 border-white/10 overflow-hidden" data-testid={`lore-location-${location.id}`}>
        <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-orbitron font-bold text-white">{location.name}</h3>
          </div>
          
          <p className="text-sm text-white/70 mb-3 leading-relaxed">
            {location.description}
          </p>
          
          {connectedChars.length > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs text-white/40">
              <Users className="w-3 h-3" />
              <span>Connected: {connectedChars.map(c => c.name).join(', ')}</span>
            </div>
          )}
          
          <div className="border-t border-white/10 pt-3">
            {hasSecretUnlocked ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 mb-2"
                  onClick={() => setShowSecret(!showSecret)}
                  data-testid={`button-toggle-location-secret-${location.id}`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Hidden Story
                  </span>
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                
                <AnimatePresence>
                  {showSecret && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20"
                    >
                      <p className="text-sm text-amber-200/80 italic leading-relaxed">
                        {location.hiddenStory}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-white/40 hover:text-amber-400 hover:bg-amber-500/10"
                onClick={onUnlockSecret}
                data-testid={`button-unlock-location-secret-${location.id}`}
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Discover Hidden Story
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function EventCard({ 
  event, 
  isDiscovered, 
  onDiscover 
}: { 
  event: LoreEvent;
  isDiscovered: boolean;
  onDiscover: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  if (!isDiscovered) {
    return (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Card 
          className="bg-black/40 border-white/10 p-3 cursor-pointer hover:border-rose-500/50 transition-all group"
          onClick={onDiscover}
          data-testid={`lore-event-locked-${event.id}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white/30 group-hover:text-rose-400 transition-colors" />
            </div>
            <p className="text-white/30 font-mono text-sm">??? Lost in Time ???</p>
          </div>
        </Card>
      </motion.div>
    );
  }
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card 
        className="bg-black/40 border-white/10 overflow-hidden cursor-pointer hover:border-rose-500/30 transition-all"
        onClick={() => setExpanded(!expanded)}
        data-testid={`lore-event-${event.id}`}
      >
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-orbitron text-sm text-white">{event.title}</h4>
                <p className="text-[10px] text-rose-400/70">{event.era}</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-white/10"
              >
                <p className="text-sm text-white/70 mb-2">{event.description}</p>
                <div className="bg-rose-500/10 rounded-lg p-2 border border-rose-500/20">
                  <p className="text-xs text-rose-200/80 italic">{event.significance}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

function FactionCard({ faction }: { faction: LoreFaction }) {
  const [expanded, setExpanded] = useState(false);
  const members = LORE_CHARACTERS.filter(c => faction.members.includes(c.id));
  
  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-violet-500',
    gold: 'from-yellow-500 to-amber-500',
    red: 'from-red-600 to-rose-500'
  };
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card 
        className="bg-black/40 border-white/10 overflow-hidden cursor-pointer hover:border-white/20 transition-all"
        onClick={() => setExpanded(!expanded)}
        data-testid={`lore-faction-${faction.id}`}
      >
        <div className={`h-1 bg-gradient-to-r ${colorMap[faction.color] || colorMap.cyan}`} />
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[faction.color] || colorMap.cyan} flex items-center justify-center`}>
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-white">{faction.name}</h3>
                <p className="text-[10px] text-white/40 italic">"{faction.motto}"</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="text-sm text-white/70 mb-3 leading-relaxed">
                  {faction.description}
                </p>
                
                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs text-white/40 mb-2">Notable Members:</p>
                  <div className="flex flex-wrap gap-2">
                    {members.map(member => (
                      <Badge 
                        key={member.id}
                        variant="outline" 
                        className="text-[10px] border-white/20 text-white/60"
                      >
                        {member.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

function getItemDisplayName(item: LoreCharacter | LoreLocation | LoreEvent | { name: string }): string {
  if ('title' in item) {
    return item.title;
  }
  return item.name;
}

function DiscoveryModal({ 
  type, 
  item, 
  onClose 
}: { 
  type: 'character' | 'location' | 'event' | 'secret';
  item: LoreCharacter | LoreLocation | LoreEvent | { name: string };
  onClose: () => void;
}) {
  const quote = useMemo(() => 
    DISCOVERY_QUOTES[Math.floor(Math.random() * DISCOVERY_QUOTES.length)],
    []
  );
  
  const displayName = getItemDisplayName(item);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-gradient-to-br from-black via-gray-900 to-black border border-cyan-500/30 rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.1)_0%,transparent_70%)]" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-white/40 hover:text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="relative z-10"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            {type === 'secret' ? (
              <Unlock className="w-10 h-10 text-white" />
            ) : (
              <Sparkles className="w-10 h-10 text-white" />
            )}
          </div>
          
          <h2 className="font-orbitron text-2xl text-white mb-2">
            {type === 'secret' ? 'Secret Unlocked!' : 'Discovery Made!'}
          </h2>
          
          <p className="text-cyan-400 font-bold mb-4">
            {displayName}
          </p>
          
          <p className="text-white/50 text-sm italic mb-6">
            "{quote}"
          </p>
          
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-orbitron"
            data-testid="button-close-discovery"
          >
            Continue Exploring
          </Button>
        </motion.div>
        
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            initial={{ 
              x: '50%', 
              y: '50%',
              opacity: 1,
              scale: 0
            }}
            animate={{ 
              x: `${Math.random() * 100}%`, 
              y: `${Math.random() * 100}%`,
              opacity: 0,
              scale: 2
            }}
            transition={{
              duration: 1,
              delay: i * 0.05,
              ease: "easeOut"
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

export function LoreExplorer() {
  const [activeTab, setActiveTab] = useState<TabType>('characters');
  const [discoveries, setDiscoveries] = useState<DiscoveryState>(getStoredDiscoveries);
  const [discoveryModal, setDiscoveryModal] = useState<{
    type: 'character' | 'location' | 'event' | 'secret';
    item: LoreCharacter | LoreLocation | LoreEvent | { name: string };
  } | null>(null);
  
  useEffect(() => {
    saveDiscoveries(discoveries);
  }, [discoveries]);
  
  const progress = useMemo(() => {
    const totalCharacters = LORE_CHARACTERS.length;
    const totalLocations = LORE_LOCATIONS.length;
    const totalEvents = LORE_EVENTS.length;
    const totalSecrets = LORE_CHARACTERS.length + LORE_LOCATIONS.length;
    
    const discovered = 
      discoveries.characters.length + 
      discoveries.locations.length + 
      discoveries.events.length + 
      discoveries.secrets.length;
    
    const total = totalCharacters + totalLocations + totalEvents + totalSecrets;
    
    return {
      discovered,
      total,
      percentage: Math.round((discovered / total) * 100)
    };
  }, [discoveries]);
  
  const discoverCharacter = (id: string) => {
    if (!discoveries.characters.includes(id)) {
      const char = LORE_CHARACTERS.find(c => c.id === id);
      if (char) {
        setDiscoveries(prev => ({
          ...prev,
          characters: [...prev.characters, id]
        }));
        setDiscoveryModal({ type: 'character', item: char });
      }
    }
  };
  
  const discoverLocation = (id: string) => {
    if (!discoveries.locations.includes(id)) {
      const loc = LORE_LOCATIONS.find(l => l.id === id);
      if (loc) {
        setDiscoveries(prev => ({
          ...prev,
          locations: [...prev.locations, id]
        }));
        setDiscoveryModal({ type: 'location', item: loc });
      }
    }
  };
  
  const discoverEvent = (id: string) => {
    if (!discoveries.events.includes(id)) {
      const evt = LORE_EVENTS.find(e => e.id === id);
      if (evt) {
        setDiscoveries(prev => ({
          ...prev,
          events: [...prev.events, id]
        }));
        setDiscoveryModal({ type: 'event', item: evt });
      }
    }
  };
  
  const unlockSecret = (id: string, name: string) => {
    if (!discoveries.secrets.includes(id)) {
      setDiscoveries(prev => ({
        ...prev,
        secrets: [...prev.secrets, id]
      }));
      setDiscoveryModal({ type: 'secret', item: { name: `${name}'s Secret` } });
    }
  };
  
  const tabs: { id: TabType; label: string; icon: typeof BookOpen; count: number; total: number }[] = [
    { 
      id: 'characters', 
      label: 'Characters', 
      icon: Users,
      count: discoveries.characters.length,
      total: LORE_CHARACTERS.length
    },
    { 
      id: 'locations', 
      label: 'Locations', 
      icon: MapPin,
      count: discoveries.locations.length,
      total: LORE_LOCATIONS.length
    },
    { 
      id: 'events', 
      label: 'Timeline', 
      icon: Calendar,
      count: discoveries.events.length,
      total: LORE_EVENTS.length
    },
    { 
      id: 'factions', 
      label: 'Factions', 
      icon: Crown,
      count: LORE_FACTIONS.length,
      total: LORE_FACTIONS.length
    }
  ];
  
  return (
    <div className="w-full" data-testid="lore-explorer">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span className="font-orbitron text-white">Lore Discovery</span>
          </div>
          <span className="text-sm text-white/60">
            {progress.discovered} / {progress.total} discovered
          </span>
        </div>
        <Progress value={progress.percentage} className="h-2" />
        <p className="text-xs text-white/40 mt-1 text-right">{progress.percentage}% complete</p>
      </div>
      
      <div className="flex gap-1.5 md:gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className={`flex-shrink-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 ${
                activeTab === tab.id 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              {tab.label}
              <Badge variant="secondary" className="ml-1.5 md:ml-2 text-[9px] md:text-[10px] bg-white/10 px-1 md:px-1.5">
                {tab.count}/{tab.total}
              </Badge>
            </Button>
          );
        })}
      </div>
      
      <ScrollArea className="h-[600px] pr-4">
        <AnimatePresence mode="wait">
          {activeTab === 'characters' && (
            <motion.div
              key="characters"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid gap-4 md:grid-cols-2"
            >
              {LORE_CHARACTERS.map(char => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  isDiscovered={discoveries.characters.includes(char.id)}
                  hasSecretUnlocked={discoveries.secrets.includes(char.id)}
                  onDiscover={() => discoverCharacter(char.id)}
                  onUnlockSecret={() => unlockSecret(char.id, char.name)}
                />
              ))}
            </motion.div>
          )}
          
          {activeTab === 'locations' && (
            <motion.div
              key="locations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid gap-4 md:grid-cols-2"
            >
              {LORE_LOCATIONS.map(loc => (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  isDiscovered={discoveries.locations.includes(loc.id)}
                  hasSecretUnlocked={discoveries.secrets.includes(`loc-${loc.id}`)}
                  onDiscover={() => discoverLocation(loc.id)}
                  onUnlockSecret={() => unlockSecret(`loc-${loc.id}`, loc.name)}
                  characters={LORE_CHARACTERS}
                />
              ))}
            </motion.div>
          )}
          
          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="relative pl-4 border-l-2 border-rose-500/30">
                {LORE_EVENTS.map((evt, i) => (
                  <div key={evt.id} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-rose-500/50 border-2 border-rose-500" />
                    <EventCard
                      event={evt}
                      isDiscovered={discoveries.events.includes(evt.id)}
                      onDiscover={() => discoverEvent(evt.id)}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          
          {activeTab === 'factions' && (
            <motion.div
              key="factions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid gap-4"
            >
              {LORE_FACTIONS.map(faction => (
                <FactionCard key={faction.id} faction={faction} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
      
      <AnimatePresence>
        {discoveryModal && (
          <DiscoveryModal
            type={discoveryModal.type}
            item={discoveryModal.item}
            onClose={() => setDiscoveryModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default LoreExplorer;
