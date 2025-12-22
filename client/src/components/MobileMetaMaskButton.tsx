import { useConnect } from 'wagmi';

interface MobileMetaMaskButtonProps {
  onClose?: () => void;
  className?: string;
}

export function MobileMetaMaskButton({ onClose, className }: MobileMetaMaskButtonProps) {
  const { connect, connectors } = useConnect();
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const handleMetaMaskClick = () => {
    console.log('MetaMask button clicked');
    
    const injectedConnector = connectors.find(c => c.id === 'injected' || c.id === 'metaMask');
    
    if (injectedConnector && (window as any).ethereum?.isMetaMask) {
      console.log('Using injected MetaMask');
      connect({ connector: injectedConnector });
      onClose?.();
      return;
    }
    
    if (isMobile) {
      console.log('Opening MetaMask via deep link');
      const currentUrl = window.location.href.replace(/^https?:\/\//, '');
      const metaMaskDeepLink = `https://metamask.app.link/dapp/${currentUrl}`;
      
      window.location.href = metaMaskDeepLink;
      
      setTimeout(() => {
        console.log('Deep link timeout, trying WalletConnect');
        const wcConnector = connectors.find(c => c.id === 'walletConnect');
        if (wcConnector) {
          connect({ connector: wcConnector });
        }
      }, 2000);
    } else {
      const wcConnector = connectors.find(c => c.id === 'walletConnect');
      if (wcConnector) {
        connect({ connector: wcConnector });
      }
    }
    
    onClose?.();
  };
  
  if (!isMobile) return null;
  
  return (
    <button
      onClick={handleMetaMaskClick}
      className={className}
      data-testid="button-metamask-mobile"
      style={{
        width: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, #f6851b 0%, #e2761b 100%)',
        border: 'none',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 600,
        color: 'white',
        marginBottom: '12px',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 212 189" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g>
          <polygon fill="#CDBDB2" points="60.75,173.25 88.313,180.563 88.313,171 90.563,168.75 106.313,168.75 106.313,180 106.313,187.875 89.438,187.875 68.625,178.875"/>
          <polygon fill="#CDBDB2" points="105.75,173.25 132.75,180.563 132.75,171 135,168.75 150.75,168.75 150.75,180 150.75,187.875 133.875,187.875 113.063,178.875"/>
          <polygon fill="#393939" points="90.563,152.438 88.313,171 91.125,168.75 120.375,168.75 123.75,171 121.5,152.438 117,149.625 94.5,150.188"/>
          <polygon fill="#F89C35" points="75.375,27 88.875,58.5 95.063,150.188 117,150.188 123.75,58.5 136.125,27"/>
          <polygon fill="#F89D35" points="16.313,96.188 0.563,141.75 39.938,139.5 65.25,139.5 65.25,119.813 64.125,79.313 58.5,83.813"/>
          <polygon fill="#D87C30" points="46.125,101.25 92.25,102.375 87.188,126 65.25,120.375"/>
          <polygon fill="#EA8D3A" points="46.125,101.813 65.25,119.813 65.25,137.813"/>
          <polygon fill="#F89D35" points="65.25,120.375 87.75,126 95.063,150.188 90,153 65.25,138.375"/>
          <polygon fill="#EB8F35" points="65.25,138.375 60.75,173.25 90.563,152.438"/>
          <polygon fill="#EA8E3A" points="92.25,102.375 95.063,150.188 86.625,125.719"/>
          <polygon fill="#D87C30" points="39.375,138.938 65.25,138.375 60.75,173.25"/>
          <polygon fill="#EB8F35" points="12.938,188.438 60.75,173.25 39.375,138.938 0.563,141.75"/>
          <polygon fill="#E8821E" points="88.875,58.5 64.688,78.75 46.125,101.25 92.25,102.938"/>
          <polygon fill="#DFCEC3" points="60.75,173.25 90.563,152.438 88.313,170.438 88.313,180.563 68.063,176.625"/>
          <polygon fill="#DFCEC3" points="121.5,173.25 150.75,152.438 148.5,170.438 148.5,180.563 128.25,176.625" transform="matrix(-1 0 0 1 272.25 0)"/>
          <polygon fill="#393939" points="70.313,112.5 64.125,125.438 86.063,119.813" transform="matrix(-1 0 0 1 150.188 0)"/>
          <polygon fill="#E88F35" points="12.375,0.563 88.875,58.5 75.938,27"/>
          <path fill="#8E5A30" d="M12.375,0.563 L2.25,31.5 L7.875,65.25 L3.938,67.5 L9.563,72.563 L5.063,76.5 L11.25,82.125 L7.313,85.5 L16.313,96.188 L58.5,83.813 C79.125,67.313 89.188,58.875 88.875,58.5 C88.563,58.125 63.375,38.813 12.375,0.563 Z"/>
          <polygon fill="#F89D35" points="195.188,96.188 211.5,141.75 172.125,139.5 146.813,139.5 146.813,119.813 147.938,79.313 153.563,83.813" transform="matrix(-1 0 0 1 407.688 0)"/>
          <polygon fill="#D87C30" points="165.938,101.25 119.813,102.375 124.875,126 146.813,120.375" transform="matrix(-1 0 0 1 285.75 0)"/>
          <polygon fill="#EA8D3A" points="165.938,101.813 146.813,119.813 146.813,137.813" transform="matrix(-1 0 0 1 312.75 0)"/>
          <polygon fill="#F89D35" points="146.813,120.375 124.313,126 117,150.188 122.063,153 146.813,138.375" transform="matrix(-1 0 0 1 263.813 0)"/>
          <polygon fill="#EB8F35" points="146.813,138.375 151.313,173.25 121.5,152.438" transform="matrix(-1 0 0 1 272.625 0)"/>
          <polygon fill="#EA8E3A" points="119.813,102.375 117,150.188 125.438,125.719" transform="matrix(-1 0 0 1 242.25 0)"/>
          <polygon fill="#D87C30" points="172.688,138.938 146.813,138.375 151.313,173.25" transform="matrix(-1 0 0 1 324 0)"/>
          <polygon fill="#EB8F35" points="199.125,188.438 151.313,173.25 172.688,138.938 211.5,141.75" transform="matrix(-1 0 0 1 362.625 0)"/>
          <polygon fill="#E8821E" points="123.188,58.5 147.375,78.75 165.938,101.25 119.813,102.938" transform="matrix(-1 0 0 1 283.125 0)"/>
          <polygon fill="#393939" points="141.75,112.5 147.938,125.438 126,119.813" transform="matrix(-1 0 0 1 273.938 0)"/>
          <polygon fill="#E88F35" points="199.688,0.563 123.188,58.5 136.125,27" transform="matrix(-1 0 0 1 322.875 0)"/>
          <path fill="#8E5A30" d="M199.688,0.563 L209.813,31.5 L204.188,65.25 L208.125,67.5 L202.5,72.563 L207,76.5 L200.813,82.125 L204.75,85.5 L195.75,96.188 L153.563,83.813 C132.938,67.313 122.875,58.875 123.188,58.5 C123.5,58.125 148.688,38.813 199.688,0.563 Z" transform="matrix(-1 0 0 1 407.688 0)"/>
        </g>
      </svg>
      Open in MetaMask
    </button>
  );
}

