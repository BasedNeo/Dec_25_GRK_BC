import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Guardian } from "@/lib/mockData";
import { MarketItem } from "@/lib/marketplaceData";
import { X } from "lucide-react";
import DOMPurify from 'dompurify';
import { useState, useEffect } from "react";
import './NFTGallery.css';

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: Guardian | MarketItem | null;
}

interface Attribute {
  trait_type: string;
  value: string;
}

export function NFTDetailModal({ isOpen, onClose, nft }: NFTDetailModalProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  useEffect(() => {
    if (nft && isOpen) {
      const fetchAttributes = async () => {
        setLoadingAttributes(true);
        try {
          // If the NFT already has traits (from mock data), use them first as fallback
          if (nft.traits && nft.traits.length > 0) {
            setAttributes(nft.traits.map((t: any) => ({ trait_type: t.type, value: t.value })));
          }

          // Fetch full metadata from IPFS
          const ipfsHash = 'bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y';
          const primaryUrl = `https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/${ipfsHash}/${nft.id}.json`;
          
          try {
            const response = await fetch(primaryUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const metadata = await response.json();
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
              setAttributes(metadata.attributes);
            }
          } catch (primaryError) {
            console.warn("Primary IPFS gateway failed, trying fallback...", primaryError);
            
            // Fallback to public gateway
            const fallbackUrl = `https://ipfs.io/ipfs/${ipfsHash}/${nft.id}.json`;
            const response = await fetch(fallbackUrl);
            
            if (response.ok) {
                const metadata = await response.json();
                if (metadata.attributes && Array.isArray(metadata.attributes)) {
                  setAttributes(metadata.attributes);
                }
            }
          }
        } catch (error) {
          console.error("Error fetching metadata:", error);
          // Fallback to mock traits if fetch fails and we haven't set them yet
          if ((!attributes || attributes.length === 0) && nft.traits) {
             setAttributes(nft.traits.map((t: any) => ({ trait_type: t.type, value: t.value })));
          }
        } finally {
          setLoadingAttributes(false);
        }
      };

      fetchAttributes();
    } else {
      setAttributes([]);
    }
  }, [nft, isOpen]);
  
  if (!nft) return null;

  // Safe Sanitize Helper
  const safeSanitize = (content: string | undefined | null) => {
    if (typeof content !== 'string') return '';
    return DOMPurify.sanitize(content);
  };

  const owner = "0x1234...5678"; // Mock owner for now, as it's not always in the Guardian type
  const price = "69,420 $BASED"; // Mock price

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[900px] w-full p-0 gap-0 border-none bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">Guardian #{nft.id} Details</DialogTitle>
        <DialogDescription className="sr-only">Details for Guardian #{nft.id}</DialogDescription>
        
        <div className="nft-modal-content">
            <button className="modal-close" onClick={onClose} style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                &times;
            </button>

            <div className="modal-image">
                <img id="modalImage" src={nft.image} alt={nft.name} />
            </div>
            
            <div className="modal-details">
                <h2 id="modalTitle">{safeSanitize(nft.name)}</h2>
                <p id="modalSubtitle" className="modal-subtitle">Token ID: {nft.id}</p>
                
                <div className="modal-section">
                <h4>Owner</h4>
                <a id="modalOwner" href="#" target="_blank" className="owner-link">{owner}</a>
                </div>
                
                <div className="modal-section">
                <h4>Price</h4>
                <p id="modalPrice" className="price-display">{price}</p>
                </div>
                
                <div className="modal-section">
                <h4>Attributes {loadingAttributes && <span className="text-xs text-muted-foreground animate-pulse">(Loading...)</span>}</h4>
                <div id="modalAttributes" className="attributes-grid">
                    {attributes && attributes.length > 0 ? (
                        attributes.map((attr, index) => {
                            const isRarity = attr.trait_type === 'Rarity Level';
                            return (
                                <div key={index} className={`attribute-item ${isRarity ? 'attribute-rarity' : ''}`}>
                                    <div className="attribute-type">{safeSanitize(attr.trait_type)}</div>
                                    <div className="attribute-value">{safeSanitize(attr.value)}</div>
                                </div>
                            );
                        })
                    ) : (
                        <p style={{color:'#666', gridColumn: 'span 2'}}>
                            {loadingAttributes ? 'Loading attributes...' : 'No attributes available'}
                        </p>
                    )}
                </div>
                </div>
                
                <div className="modal-actions">
                <button className="btn-offer-large" onClick={() => alert('Make Offer coming soon')}>Make Offer</button>
                <button className="btn-buy-large" onClick={() => alert('Buy Now coming soon')}>Buy Now</button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
