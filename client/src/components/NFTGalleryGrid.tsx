import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, Heart, Box } from 'lucide-react';
import './NFTGalleryGrid.css';
import { getExplorerUrl } from '../lib/contractService';
import { NFTDetailModal } from './NFTDetailModal';
import { soundManager } from '../lib/SoundManager';

export interface NFTToken {
  tokenId: number;
  name: string;
  image: string;
  owner: string;
  rarity: string;
  biologicalType?: string;
  role?: string;
  attributes?: Record<string, string>;
  price?: number;
}

interface NFTGalleryGridProps {
  tokens: NFTToken[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function NFTGalleryGrid({ tokens, isLoading = false, onLoadMore, hasMore = false }: NFTGalleryGridProps) {
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('nft_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedToken, setSelectedToken] = useState<NFTToken | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const toggleFavorite = (e: React.MouseEvent, tokenId: number) => {
    e.stopPropagation();
    soundManager.play('click');
    setFavorites(prev => {
      const newFavs = prev.includes(tokenId) 
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId];
      localStorage.setItem('nft_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const handleCardClick = (token: NFTToken) => {
    soundManager.play('click');
    setSelectedToken(token);
  };

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0
    });
    
    if (observerTarget.current) observer.observe(observerTarget.current);
    
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [handleObserver]);

  // If loading and no tokens, show initial skeletons
  if (isLoading && tokens.length === 0) {
    return (
      <div className="ngg-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <NFTCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && tokens.length === 0) {
    return (
      <div className="ngg-empty-state">
        <Box size={48} className="ngg-empty-icon" />
        <h3>No Guardians Found</h3>
        <p>Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="ngg-container">
      <div className="ngg-grid">
        {tokens.map((token) => (
          <NFTCard 
            key={token.tokenId} 
            token={token} 
            isFavorite={favorites.includes(token.tokenId)}
            onToggleFavorite={toggleFavorite}
            onClick={() => handleCardClick(token)}
          />
        ))}
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <NFTCardSkeleton key={`loading-${i}`} />
        ))}
      </div>
      {/* Infinite scroll target */}
      <div ref={observerTarget} className="ngg-observer-target" />

      {/* Detail Modal */}
      <NFTDetailModal 
        nft={selectedToken ? {
            id: selectedToken.tokenId,
            name: selectedToken.name,
            image: selectedToken.image,
            traits: [
                { type: 'Rarity', value: selectedToken.rarity },
                ...(selectedToken.biologicalType ? [{ type: 'Biological Type', value: selectedToken.biologicalType }] : []),
                ...(selectedToken.role ? [{ type: 'Role', value: selectedToken.role }] : []),
                ...(selectedToken.attributes ? Object.entries(selectedToken.attributes).map(([k, v]) => ({ type: k, value: v })) : [])
            ],
            price: selectedToken.price,
            isListed: true,
            rarity: selectedToken.rarity,
            owner: selectedToken.owner
        } as any : null} 
        isOpen={!!selectedToken} 
        onClose={() => setSelectedToken(null)} 
      />
    </div>
  );
}

function NFTCard({ token, isFavorite, onToggleFavorite, onClick }: { token: NFTToken, isFavorite: boolean, onToggleFavorite: (e: React.MouseEvent, id: number) => void, onClick: () => void }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const rarityClass = getRarityClass(token.rarity);
  const explorerUrl = getExplorerUrl('address', token.owner);

  // Extract traits for pills (fallback to attributes if props missing)
  const bioType = token.biologicalType || token.attributes?.['Biological Type'] || 'Unknown';
  const role = token.role || token.attributes?.['Role'] || 'Unknown';
  
  // Mock price if missing for display
  const displayPrice = token.price || (100 + (token.tokenId % 500)); 

  return (
    <div 
      className={`ngg-card ${rarityClass}`} 
      onClick={onClick}
      onMouseEnter={() => soundManager.play('hover')}
    >
      <div className="ngg-image-container">
        {/* Rarity Badge */}
        <div className={`ngg-rarity-badge ${rarityClass}`}>
          {token.rarity}
          {token.rarity?.toLowerCase().includes('legendary') && <span className="ngg-sparkle">✨</span>}
        </div>

        {/* Favorite Button */}
        <button 
          className={`ngg-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => onToggleFavorite(e, token.tokenId)}
        >
          <Heart size={18} fill={isFavorite ? "#ef4444" : "none"} />
        </button>

        {/* Image */}
        <div className={`ngg-image-wrapper ${imageLoaded ? 'loaded' : 'loading'}`}>
          {!imageLoaded && !imageError && <div className="ngg-image-placeholder shimmer" />}
          <img 
            src={token.image} 
            alt={token.name}
            className="ngg-image"
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />
          {imageError && (
             <div className="ngg-image-fallback">
                <Box size={32} />
                <span>Image Unavailable</span>
             </div>
          )}
        </div>
      </div>

      <div className="ngg-content">
        <div className="ngg-header">
          <h3 className="ngg-title">{token.name}</h3>
          <span className="ngg-subtitle">Based Guardians</span>
        </div>

        <div className="ngg-traits">
           <span className="ngg-trait-pill">{bioType}</span>
           <span className="ngg-trait-pill">{role}</span>
        </div>

        {/* Price Section */}
        <div className="card-price">
            <span className="price-label">Price</span>
            <span className="price-value">{displayPrice} $BASED</span>
        </div>

        {/* Action Buttons */}
        <div className="card-actions">
            <button 
              className="btn-buy" 
              onClick={(e) => { 
                e.stopPropagation(); 
                soundManager.play('click');
                // Future: Implement buy logic
              }}
            >
              BUY
            </button>
            <button 
              className="btn-offer" 
              onClick={(e) => { 
                e.stopPropagation(); 
                soundManager.play('click');
                // Future: Implement offer logic
              }}
            >
              OFFER
            </button>
        </div>

        <div className="ngg-footer">
           <div className="ngg-owner-info">
              <span className="ngg-label">Owner</span>
              <a 
                href={explorerUrl}
                target="_blank"
                rel="noreferrer" 
                className="ngg-owner-link"
                onClick={(e) => e.stopPropagation()}
              >
                {token.owner.substring(0, 6)}...{token.owner.substring(token.owner.length - 4)}
                <ExternalLink size={10} />
              </a>
           </div>
        </div>
      </div>
    </div>
  );
}

function NFTCardSkeleton() {
  return (
    <div className="ngg-card skeleton-card">
       <div className="ngg-image-container shimmer" />
       <div className="ngg-content">
          <div className="ngg-title-skeleton shimmer" />
          <div className="ngg-subtitle-skeleton shimmer" />
          <div className="ngg-traits-skeleton">
             <div className="shimmer pill" />
             <div className="shimmer pill" />
          </div>
          <div className="ngg-footer-skeleton shimmer" />
       </div>
    </div>
  );
}

// Helper for Rarity Classes
function getRarityClass(rarity: string = ''): string {
  const r = rarity.toLowerCase();
  if (r.includes('legendary') || r.includes('rarest-legendary')) return 'rarity-legendary';
  if (r.includes('very rare')) return 'rarity-very-rare';
  if (r === 'rarest') return 'rarity-rarest';
  if (r === 'rare') return 'rarity-rare';
  if (r.includes('less rare')) return 'rarity-less-rare';
  if (r.includes('less common')) return 'rarity-less-common';
  if (r.includes('most common')) return 'rarity-most-common';
  return 'rarity-common';
}
