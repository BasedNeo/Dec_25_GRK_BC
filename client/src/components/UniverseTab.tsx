import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Heart, BookOpen, Orbit, ArrowRightLeft, Loader2, Sparkles, Zap, Globe, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Footer } from "./Footer";

interface UniverseTabProps {
  onMintClick: () => void;
}

export function UniverseTab({ onMintClick }: UniverseTabProps) {
  const [loading, setLoading] = useState(true);
  const { isConnected } = useAccount();

  useEffect(() => {
    // Simulate loading for "rich, lore-driven overview"
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-white/10">
        {/* Parallax Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black" />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?q=80&w=3272&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-screen"
            style={{ 
               transform: "translateZ(-1px) scale(1.5)" // Simple CSS parallax simulation
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          >
            The Based Universe
          </motion.h1>
          
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl font-mono text-purple-400 tracking-wider uppercase"
          >
            A Saga of Guardians, Frogs, and Creatures
          </motion.h2>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-6 text-base md:text-lg text-gray-200 leading-relaxed max-w-3xl mx-auto font-sans text-shadow-sm text-left md:text-center"
          >
            <p>
              Step into the Based Guardians Universe, a space crafted with care for those who cherish crypto trading and NFT collecting. Here, $BASED L1 tokens mint 3,732 unique NFTs—1,776 Guardians, 1,320 Frog Wranglers, and 636 Creatures—blending creativity with opportunity. As Guardians stand against the shadows of FUD, your NFTs become part of a privacy-focused cosmos where holding unlocks simple, meaningful rewards. Join us in building a legacy that whispers among the stars.
            </p>
            
            <h3 className="text-xl font-orbitron text-cyan-400 pt-4">The Heartbeat of an Ancient World</h3>
            <p>
              Beneath the galaxy’s canopy, the FUD cyborg fowl—mechanical harbingers with ember-like eyes—cast shadows over the Brain Network, their origins a riddle lost to time. These foes challenge the stalwart Guardians, whose 32 lineages trace their lineage to celestial battles, and the Based Frogs, whose 7 clans guard secrets of bio-engineered symbiosis with the 7 broods of fearless Creatures. Wizard Committer, a sage of silver beard and star-threaded staff, once mapped the Based-Bridge, his ancient code now serving as the backbone of our defense.
            </p>

            <h3 className="text-xl font-orbitron text-cyan-400 pt-4">A Legacy Secured by Vision</h3>
            <p>
              Rooted in a secured subnet, our realm leverages the potential of Based Labs’ infrastructure when ready, yet stands independent of its fate. For years to come, this project will thrive on-chain as our sole beacon of activity if need be—we own its destiny. As NFTs powered by smart contracts, these Guardians, Frogs, and Creatures hold the promise of evolving in myriad unforeseen ways, their long-term value blossoming with the creativity of their holders. Joining our community today means planting a seed in a garden designed to outlast the seasons of hype.
            </p>

            <h3 className="text-xl font-orbitron text-cyan-400 pt-4">A Gentle Note of Understanding</h3>
            <p>
              As you step into the Based Guardians Realm, we invite you with open hearts to explore this father-daughter crafted universe. Please know that our journey relies on the evolving infrastructure of Based Labs, which may shape our timeline with grace and patience. Should delays or changes arise, we hold the freedom to adapt our plans thoughtfully, ensuring the Guardians’ legacy endures. This project thrives on-chain as a testament to community spirit, independent of external paths, and we welcome you to walk this road with us.
            </p>

            {/* Video Integration */}
            <div className="pt-8 pb-4">
               <h3 className="text-xl font-orbitron text-cyan-400 mb-4 text-center">Join the Ranks</h3>
               <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                   <iframe 
                       src="https://player.vimeo.com/video/1146652270?title=0&byline=0&portrait=0&badge=0&autopause=0&dnt=1" 
                       width="100%" 
                       height="100%" 
                       frameBorder="0" 
                       allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" 
                       allowFullScreen
                       loading="lazy"
                       title="Based Guardians"
                       style={{ background: '#000' }}
                   ></iframe>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gradient-to-b from-black to-indigo-950/20">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { icon: Heart, title: "Humanitarian Horizon", sub: "Missions Beyond the Chain", desc: "Real-world impact initiatives and community-driven giving to build a better future." },
                    { icon: BookOpen, title: "Galactic Storytelling", sub: "Co-Create the Epic", desc: "Evolving lore and holder-driven narratives that shape the destiny of the Based Universe." },
                    { icon: Globe, title: "Infinite Possibilities", sub: "Evolve with the Cosmos", desc: "Future upgrades, expansions, and endless growth potential for every Guardian." },
                    { icon: ArrowRightLeft, title: "Guardian Exchange", sub: "Trade Legends", desc: "Secure marketplace for trading Guardians with a 1% fee contributing to the community pool." },
                ].map((feature, idx) => (
                    <motion.div 
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="bg-black/40 border border-cyan-500/20 p-6 rounded-xl hover:border-cyan-500/60 transition-colors group"
                    >
                        <div className="w-12 h-12 rounded-full bg-cyan-900/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                            <feature.icon className="w-6 h-6 text-cyan-400 group-hover:text-cyan-200" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1 font-orbitron">{feature.title}</h4>
                        <p className="text-xs font-mono text-cyan-400 mb-3 uppercase tracking-wider">{feature.sub}</p>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            {feature.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
            <h3 className="text-2xl font-orbitron text-white mb-12 text-center">MISSION TIMELINE</h3>
            <div className="relative mb-16">
                {/* Horizontal Line (Desktop) */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent -translate-y-1/2" />
                
                {/* Vertical Line (Mobile) */}
                <div className="md:hidden absolute top-0 bottom-0 left-6 w-0.5 bg-gradient-to-b from-cyan-500/20 via-cyan-500/50 to-cyan-500/20" />

                <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
                    {[
                        { title: "Mint Phase", date: "Live now", active: true },
                        { title: "Emissions Halving", date: "Est. Dec 31, 2025", active: false },
                        { title: "Brain Staking", date: "Based Labs Infra 2026", active: false },
                        { title: "Race-to-Base", date: "Post Infra Release", active: false },
                        { title: "NFT Marketplace", date: "Q3 2026", active: false },
                        { title: "Ecosystem P2E", date: "Ongoing", active: false },
                    ].map((item, index) => (
                        <motion.div 
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative flex md:flex-col items-center md:text-center pl-16 md:pl-0"
                        >
                            {/* Dot */}
                            <div className={`absolute left-4 md:left-1/2 top-1/2 md:top-1/2 -translate-x-1 md:-translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${item.active ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-black border-cyan-500/30'}`} />
                            
                            <div className="md:mt-8 md:pt-4">
                                <p className={`font-orbitron text-sm ${item.active ? 'text-cyan-400' : 'text-gray-400'}`}>{item.title}</p>
                                <p className="font-mono text-[10px] text-gray-500 mt-1">{item.date}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
                 <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200"></div>
                    <div className="relative">
                        <ConnectButton.Custom>
                            {({ openConnectModal, mounted }) => (
                                <Button 
                                    onClick={openConnectModal}
                                    disabled={!mounted || isConnected}
                                    className="bg-black hover:bg-gray-900 text-cyan-400 border border-cyan-500/50 font-orbitron tracking-widest px-8 py-6 text-lg min-w-[200px]"
                                >
                                    {isConnected ? "CONNECTED" : "CONNECT WALLET"}
                                </Button>
                            )}
                        </ConnectButton.Custom>
                    </div>
                 </div>

                 <Button 
                    onClick={onMintClick}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-black font-orbitron tracking-widest px-8 py-6 text-lg min-w-[200px] shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all"
                 >
                    MINT NOW
                 </Button>
            </motion.div>
        </div>
      </section>

      {/* Universe-specific tagline */}
      <div className="py-4 border-t border-cyan-500/30 bg-black text-center">
        <p className="text-xs font-mono text-cyan-500/60 max-w-4xl mx-auto px-4">
          A hopeful bond that grows with every passing star.
        </p>
      </div>

      {/* Main Footer */}
      <Footer />
    </div>
  );
}
