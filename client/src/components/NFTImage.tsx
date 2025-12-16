import React, { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertTriangle, ImageOff } from "lucide-react";
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
}

export const NFTImage = React.memo(function NFTImage({ 
  src, 
  alt, 
  id, 
  className, 
  fallbackSrc,
  aspectRatio = "aspect-square",
  priority = false
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
    <div className={cn("relative overflow-hidden bg-secondary/20", aspectRatio, className)}>
      
      {/* Loading State: Skeleton or Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm">
           <Skeleton className="absolute inset-0 w-full h-full bg-secondary/30" />
           <div className="relative z-20 flex flex-col items-center">
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

      {/* Image */}
      {(!hasError || optimizedFallback) && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-all duration-300 ease-out nft-image",
            isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100 loaded"
          )}
        />
      )}
    </div>
  );
});
