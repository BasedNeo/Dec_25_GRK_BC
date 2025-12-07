import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { NFTGallery } from "@/components/NFTGallery";
import { ValueEstimation } from "@/components/ValueEstimation";
import { VotingDAO } from "@/components/VotingDAO";
import { PoolTracker } from "@/components/PoolTracker";
import { EscrowMarketplace } from "@/components/EscrowMarketplace";
import { Footer } from "@/components/Footer";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <Navbar isConnected={isConnected} />
      
      <main>
        <Hero />
        <ValueEstimation />
        <NFTGallery isConnected={isConnected} onConnect={() => {}} />
        <EscrowMarketplace />
        <PoolTracker />
        <VotingDAO isConnected={isConnected} onConnect={() => {}} />
      </main>

      <Footer />
    </div>
  );
}
