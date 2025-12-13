import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

interface BuyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tokenId: number | string;
  price: number | string | undefined;
  currency?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onBuy?: (tokenId: number | string, price: number | string) => void;
  compact?: boolean; // For tight spaces like grid cards
}

export function BuyButton({ 
  tokenId, 
  price, 
  currency = "$BASED",
  size = 'medium', 
  variant = 'primary', 
  className, 
  onBuy,
  compact = false,
  ...props 
}: BuyButtonProps) {
  
  const handleBuyClick = (e: React.MouseEvent) => {
    // REMOVED e.stopPropagation() to allow event delegation
    if (onBuy && price) {
        onBuy(tokenId, price);
    }
  };

  const sizeClasses = {
    small: "h-8 text-xs px-3",
    medium: "h-10 text-sm px-4",
    large: "h-12 text-base px-6"
  };

  const variantClasses = {
    primary: "buy-btn btn-cyber-gradient text-white hover:opacity-90 border-0 shadow-[0_0_15px_rgba(0,255,255,0.3)]",
    secondary: "bg-white/10 text-white hover:bg-white/20 border-white/10",
    outline: "border-primary/50 text-primary hover:bg-primary/10",
    ghost: "hover:bg-white/5 text-muted-foreground hover:text-white"
  };

  return (
    <Button 
      className={cn(
        "buy-btn font-orbitron tracking-wider font-bold transition-all duration-300 group relative overflow-hidden",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      onClick={handleBuyClick}
      disabled={!price}
      data-token-id={tokenId}
      data-price={price}
      data-action="buy"
      {...props}
    >
      {/* Glow effect for primary */}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-sm" />
      )}
      
      <div className="relative flex items-center justify-center gap-1.5 z-10 w-full">
        {!compact && <span className="uppercase tracking-wide">BUY</span>}
        {compact && <ShoppingBag size={14} />}
        
        {price && (
            <>
                <div className="h-3 w-px bg-white/30 mx-0.5" />
                <span className={cn("font-mono font-bold", compact ? "text-xs" : "")}>
                    {Number(price).toLocaleString()}
                </span>
            </>
        )}
      </div>
    </Button>
  );
}
