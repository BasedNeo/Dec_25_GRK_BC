import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { NFTGallery } from "@/components/NFTGallery";
import { ValueEstimation } from "@/components/ValueEstimation";
import { VotingDAO } from "@/components/VotingDAO";
import { PoolTracker } from "@/components/PoolTracker";
import { Footer } from "@/components/Footer";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <Navbar isConnected={isConnected} />
      
      <main>
        <Hero />
        <ValueEstimation ownedCount={isConnected ? 4 : 0} />
        <NFTGallery isConnected={isConnected} onConnect={() => {}} />
        <PoolTracker />
        <VotingDAO isConnected={isConnected} onConnect={() => {}} />
      </main>

      <Footer />
    </div>
  );
}
