import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertTriangle, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface NFTImageProps {
  src: string;
  alt: string;
  id?: number | string;
  className?: string;
  fallbackSrc?: string;
  aspectRatio?: string; // e.g. "aspect-square"
}

export function NFTImage({ 
  src, 
  alt, 
  id, 
  className, 
  fallbackSrc,
  aspectRatio = "aspect-square" 
}: NFTImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    // Reset state when src changes
    setIsLoading(true);
    setHasError(false);
    setCurrentSrc(src);
  }, [src]);

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (fallbackSrc) {
        setCurrentSrc(fallbackSrc);
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
           <span className="text-xs text-muted-foreground font-mono">Image unavailable</span>
           {id && <span className="text-sm font-bold text-white font-orbitron mt-1">#{id}</span>}
        </div>
      )}

      {/* Image */}
      {(!hasError || fallbackSrc) && (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-all duration-500 ease-in-out nft-image",
            isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100 loaded"
          )}
        />
      )}
    </div>
  );
}
