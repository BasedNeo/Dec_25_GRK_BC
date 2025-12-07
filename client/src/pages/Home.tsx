import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { NFTGallery } from "@/components/NFTGallery";
import { ValueEstimation } from "@/components/ValueEstimation";
import { VotingDAO } from "@/components/VotingDAO";
import { PoolTracker } from "@/components/PoolTracker";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true);
      toast({
        title: "Wallet Connected",
        description: "Welcome back, Commander.",
        className: "bg-black border-primary text-primary font-orbitron",
      });
    }, 500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    toast({
      title: "Wallet Disconnected",
      description: "Session terminated.",
      className: "bg-black border-destructive text-destructive font-orbitron",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <Navbar 
        isConnected={isConnected} 
        onConnect={handleConnect} 
        onDisconnect={handleDisconnect} 
      />
      
      <main>
        <Hero />
        <ValueEstimation ownedCount={isConnected ? 4 : 0} />
        <NFTGallery isConnected={isConnected} onConnect={handleConnect} />
        <PoolTracker />
        <VotingDAO isConnected={isConnected} onConnect={handleConnect} />
      </main>

      <Footer />
    </div>
  );
}
