import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, ShoppingBag, Plus, RefreshCw, AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { MOCK_ESCROWS, Escrow, MOCK_GUARDIANS } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export function EscrowMarketplace() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("browse");

  // Mock Fetching Escrows
  const { data: escrows } = useQuery({
    queryKey: ['escrows'],
    queryFn: async () => MOCK_ESCROWS,
    initialData: MOCK_ESCROWS
  });

  const handleCreateEscrow = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newEscrow: Escrow = {
      id: Math.floor(Math.random() * 10000),
      seller: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "0xUSER",
      assetName: `Guardian #${formData.get('tokenId')}`,
      assetImage: MOCK_GUARDIANS[0].image, // Placeholder image
      price: parseFloat(formData.get('price') as string),
      currency: formData.get('currency') as any,
      status: 'Open',
      createdAt: new Date().toISOString()
    };

    // Optimistic Update
    queryClient.setQueryData(['escrows'], (old: Escrow[] = []) => [newEscrow, ...old]);
    
    setActiveTab("browse");
    toast({
      title: "Asset Escrowed",
      description: "Your asset is now locked in the smart contract and listed for sale.",
      className: "bg-black border-primary text-primary font-orbitron",
    });
  };

  const handleBuy = (escrow: Escrow) => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    toast({
      title: "Transaction Pending",
      description: `Sending ${escrow.price} ${escrow.currency} to escrow contract...`,
      className: "bg-black border-accent text-accent font-orbitron",
    });

    setTimeout(() => {
      queryClient.setQueryData(['escrows'], (old: Escrow[] = []) => 
        old.map(e => e.id === escrow.id ? { ...e, status: 'Completed' as const } : e)
      );
      
      toast({
        title: "Purchase Successful",
        description: "Funds matched. Asset auto-released to your wallet.",
        className: "bg-black border-green-500 text-green-500 font-orbitron",
      });
    }, 2000);
  };

  return (
    <section id="escrow" className="py-20 bg-black/80 border-t border-white/5 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10">
          <div>
            <Badge variant="outline" className="mb-2 border-primary/50 text-primary font-mono">SECURE EXCHANGE</Badge>
            <h2 className="text-3xl md:text-4xl text-white mb-2">ESCROW <span className="text-primary">MARKET</span></h2>
            <p className="text-muted-foreground font-rajdhani max-w-2xl">
              Trustless P2P trading. Assets are locked in smart contracts until payment thresholds are met.
            </p>
          </div>
          
          <div className="flex gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <ShieldCheck size={14} className="text-green-500" /> Contract Audited
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <RefreshCw size={14} className="text-primary" /> Auto-Release
            </div>
          </div>
        </div>

        <Tabs defaultValue="browse" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-black/50 border border-white/10 mb-8">
            <TabsTrigger value="browse" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-orbitron">
              BROWSE LISTINGS
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent font-orbitron">
              CREATE ESCROW
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {escrows?.map((escrow) => (
                  <motion.div
                    key={escrow.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EscrowCard escrow={escrow} onBuy={() => handleBuy(escrow)} isConnected={isConnected} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {escrows?.length === 0 && (
               <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
                 <p className="text-muted-foreground">No active escrows found.</p>
               </div>
            )}
          </TabsContent>

          <TabsContent value="sell">
            <Card className="max-w-2xl mx-auto p-6 bg-card border-white/10 relative overflow-hidden">
              {!isConnected ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wallet className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-orbitron text-white mb-2">WALLET DISCONNECTED</h3>
                  <p className="text-muted-foreground mb-6">Connect your wallet to access your assets and create an escrow.</p>
                  <Button onClick={openConnectModal} className="bg-primary text-black hover:bg-primary/90">
                    CONNECT WALLET
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateEscrow} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-orbitron text-white mb-1">LIST ASSET</h3>
                    <p className="text-sm text-muted-foreground mb-6">Lock your NFT in the escrow contract. It will be released automatically when the buyer sends the funds.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground">ASSET (TOKEN ID)</label>
                        <Input name="tokenId" placeholder="e.g. 420" className="bg-black/50 border-white/10 text-white" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground">CURRENCY</label>
                        <Select name="currency" defaultValue="ETH">
                          <SelectTrigger className="bg-black/50 border-white/10 text-white">
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ETH">ETH (Base)</SelectItem>
                            <SelectItem value="$BASED">$BASED Token</SelectItem>
                            <SelectItem value="BTC">BTC (Wrapped)</SelectItem>
                            <SelectItem value="XRP">XRP (Pegged)</SelectItem>
                            <SelectItem value="XLM">XLM (Pegged)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">PRICE THRESHOLD</label>
                      <Input name="price" type="number" step="0.000001" placeholder="0.00" className="bg-black/50 border-white/10 text-white font-mono text-lg" required />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-start gap-2 mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-200">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <p>
                        Listing an item requires two transactions: 1. Approve contract to transfer NFT. 2. Deposit NFT into Escrow.
                        <br/>Your asset will be held safely by the contract until sold or cancelled.
                      </p>
                    </div>

                    <Button type="submit" className="w-full bg-accent text-white hover:bg-accent/80 font-orbitron h-12">
                      <Plus className="mr-2 h-4 w-4" /> CREATE ESCROW LISTING
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function EscrowCard({ escrow, onBuy, isConnected }: { escrow: Escrow, onBuy: () => void, isConnected: boolean }) {
  const isCompleted = escrow.status === 'Completed';

  return (
    <Card className={`group relative overflow-hidden bg-card border-white/10 hover:border-primary/50 transition-all duration-300 ${isCompleted ? 'opacity-75' : ''}`}>
      {/* Image Area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-black/50">
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent z-10" />
        <img 
          src={escrow.assetImage} 
          alt={escrow.assetName} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        
        <div className="absolute top-2 right-2 z-20">
          <Badge variant="outline" className={`
            backdrop-blur-md
            ${escrow.status === 'Open' ? 'border-green-500 text-green-500 bg-green-500/10' : ''}
            ${escrow.status === 'Pending' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : ''}
            ${escrow.status === 'Completed' ? 'border-primary text-primary bg-primary/10' : ''}
          `}>
            {escrow.status}
          </Badge>
        </div>

        <div className="absolute bottom-3 left-3 z-20">
          <p className="text-xs text-muted-foreground font-mono">SELLER</p>
          <p className="text-sm text-white font-mono">{escrow.seller}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        <h4 className="text-lg font-orbitron text-white mb-4 truncate">{escrow.assetName}</h4>
        
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-mono mb-1">ASKING PRICE</p>
            <div className="text-2xl font-bold text-white flex items-baseline gap-1">
              {escrow.price.toLocaleString()} <span className="text-xs text-primary font-normal">{escrow.currency}</span>
            </div>
          </div>
        </div>

        {isCompleted ? (
          <Button disabled className="w-full bg-primary/20 text-primary border border-primary/20">
            <CheckCircle2 className="mr-2 h-4 w-4" /> SOLD
          </Button>
        ) : (
          <Button 
            onClick={onBuy} 
            disabled={!isConnected}
            className="w-full bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-primary transition-all font-orbitron"
          >
            {isConnected ? (
              <>
                <ShoppingBag className="mr-2 h-4 w-4" /> BUY NOW
              </>
            ) : "CONNECT TO BUY"}
          </Button>
        )}
      </div>
    </Card>
  );
}
