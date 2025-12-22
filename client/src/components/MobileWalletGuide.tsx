import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function MobileWalletGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const wasDismissed = sessionStorage.getItem('mobileWalletGuideDismissed');
    
    if (isMobile && !wasDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem('mobileWalletGuideDismissed', 'true');
  };
  
  if (!isVisible || isDismissed) return null;
  
  return (
    <div 
      data-testid="mobile-wallet-guide"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '16px',
        fontSize: '14px',
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(6, 182, 212, 0.3)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>
          Mobile Tip
        </strong>
        <span style={{ opacity: 0.95, lineHeight: 1.4, display: 'block' }}>
          For the best experience, open this page in your wallet's built-in browser (MetaMask, Trust Wallet, etc.)
        </span>
      </div>
      <button
        onClick={handleDismiss}
        data-testid="button-dismiss-mobile-guide"
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          minWidth: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <X size={16} color="white" />
      </button>
    </div>
  );
}
