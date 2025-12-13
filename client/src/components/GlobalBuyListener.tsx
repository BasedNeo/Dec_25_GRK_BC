import { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

// Extend Window interface for the user's snippet compatibility
declare global {
  interface Window {
    ethereum?: any;
    connectedAccount?: string;
  }
}

export function GlobalBuyListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleGlobalClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find if click was on a buy button (or inside one)
      const buyButton = target.closest('.buy-btn, .buy-now-btn, [class*="buy-btn"], button[data-action="buy"]');
      
      if (buyButton instanceof HTMLElement) {
        // If the button has an onClick handler that prevented default, we might duplicate logic
        // But the user specifically asked for this delegation.
        
        // We only proceed if it looks like a buy button with data attributes
        const tokenId = buyButton.dataset.tokenId || buyButton.closest('[data-token-id]')?.getAttribute('data-token-id');
        const price = buyButton.dataset.price || buyButton.closest('[data-price]')?.getAttribute('data-price');
        
        if (tokenId && price) {
          // If the component already handled it via React prop, we might want to avoid double-firing
          // However, the user asked to REMOVE individual listeners.
          // Since we can't easily check if a React handler ran, we'll implement the logic here.
          
          console.log('Global Buy Listener Caught Click:', { tokenId, price });
          
          // Check wallet connection (Mocking the check or using window.ethereum if available)
          // In this mock environment, we might not have window.ethereum, so we'll simulate success or check basic connectivity
          const isConnected = true; // window.ethereum || window.connectedAccount || true for mockup
          
          if (!isConnected) {
             toast({
                title: "Wallet Not Connected",
                description: "Please connect your wallet first",
                variant: "destructive"
             });
             return;
          }

          // Proceed with purchase logic
          try {
             toast({
                title: "Initiating Purchase",
                description: `Processing buy for Token #${tokenId} at ${price} $BASED`,
                className: "bg-black border-cyan-500 text-cyan-500 font-orbitron"
             });
             
             // Simulate async purchase
             // await executePurchase(tokenId, price);
             
          } catch (error: any) {
             toast({
                title: "Purchase Failed",
                description: error.message,
                variant: "destructive"
             });
          }
        }
      }
    };

    // Attach to the main container or document body
    // The user suggested: const collectionContainer = document.querySelector('.collection-page, .collection-grid, main');
    // In React, attaching to document body is often safest for global delegation
    document.body.addEventListener('click', handleGlobalClick);

    return () => {
      document.body.removeEventListener('click', handleGlobalClick);
    };
  }, [toast]);

  return null; // Headless component
}
