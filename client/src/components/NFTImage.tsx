import React, { useState, useEffect, useRef } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Fast gateway for IPFS images
const FAST_GATEWAY = 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/';

// Convert any IPFS URL to use the fast gateway
function optimizeImageUrl(url: string): string {
  if (!url) return '';
  return url
    .replace('ipfs://', FAST_GATEWAY)
    .replace('https://ipfs.io/ipfs/', FAST_GATEWAY)
    .replace('https://gateway.pinata.cloud/ipfs/', FAST_GATEWAY);
}

interface NFTImageProps {
  src: string;
  alt: string;
  id?: number | string;
  className?: string;
  fallbackSrc?: string;
  aspectRatio?: string; // e.g. "aspect-square"
  priority?: boolean; // For above-the-fold images
  width?: number; // Explicit width to prevent layout shift
  height?: number; // Explicit height to prevent layout shift
}

export const NFTImage = React.memo(function NFTImage({ 
  src, 
  alt, 
  id, 
  className, 
  fallbackSrc,
  aspectRatio = "aspect-square",
  priority = false,
  width = 400,
  height = 400
}: NFTImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const optimizedSrc = optimizeImageUrl(src);
  const optimizedFallback = fallbackSrc ? optimizeImageUrl(fallbackSrc) : undefined;
  const [currentSrc, setCurrentSrc] = useState(optimizedSrc);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset state when src changes
    setIsLoading(true);
    setHasError(false);
    setCurrentSrc(optimizeImageUrl(src));
  }, [src]);
  
  // Preload image for better performance
  useEffect(() => {
    if (priority && optimizedSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc;
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, optimizedSrc]);

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (optimizedFallback) {
        setCurrentSrc(optimizedFallback);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={cn("relative overflow-hidden", aspectRatio, className)}>
      
      {/* Gradient placeholder - always visible as base layer */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-purple-900/20 to-black/40"
        style={{
          opacity: isLoading ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
        }}
      />
      
      {/* Image with fade-in effect on load */}
      {(!hasError || optimizedFallback) && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoading ? 0 : 1,
            transform: isLoading ? 'scale(1.02)' : 'scale(1)',
            transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
          }}
          className="w-full h-full object-cover nft-image"
        />
      )}
      
      {/* Loading indicator overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
           <div className="flex flex-col items-center">
             <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
             {id && <span className="text-[10px] font-mono text-primary/70">#{id}</span>}
           </div>
        </div>
      )}

      {/* Error State */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-secondary/10 p-4 text-center">
           <div className="bg-red-500/10 p-3 rounded-full mb-2">
             <ImageOff className="w-6 h-6 text-red-500/50" />
           </div>
           <span className="text-xs text-muted-foreground font-mono">Metadata unavailable</span>
           {id && <span className="text-sm font-bold text-white font-orbitron mt-1">#{id}</span>}
        </div>
      )}
    </div>
  );
});
