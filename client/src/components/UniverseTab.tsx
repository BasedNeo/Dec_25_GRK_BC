import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Heart, BookOpen, Orbit, ArrowRightLeft, Loader2, Sparkles, Zap, Globe, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

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
            3,732 Guardians · BasedAI Chain · Emissions · Advisory Governance
          </motion.h2>

          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base md:text-lg text-gray-200 leading-relaxed max-w-2xl mx-auto font-sans text-shadow-sm"
          >
            Deep in the Giga Brain Galaxy, where digital rivers carve paths through infinite darkness, the Based Guardians rise as cunning wardens of code's sacred flame. Born from neon tempests, these 1,776 heroic Guardians, 1,319 resilient Frogs, and 636 fierce Creatures battle FUD pirates across 1,024 Brain-Planets. Stake your Guardian to a BasedAI Brain for $BASED emissions — Legendary rarities unlock higher yields and Race-to-Base privileges. From a father-daughter vision blending 100% on-chain mechanics with cyberpunk lore, the Universe awaits your command.
          </motion.p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
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

      {/* Timeline Section */}
      <section className="py-20 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
            <h3 className="text-2xl font-orbitron text-white mb-12 text-center">MISSION TIMELINE</h3>
            <div className="relative">
                {/* Horizontal Line (Desktop) */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent -translate-y-1/2" />
                
                {/* Vertical Line (Mobile) */}
                <div className="md:hidden absolute top-0 bottom-0 left-6 w-0.5 bg-gradient-to-b from-cyan-500/20 via-cyan-500/50 to-cyan-500/20" />

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {[
                        { title: "Mint Phase", date: "Live now", active: true },
                        { title: "Emissions Halving", date: "Dec 31, 2025", active: false },
                        { title: "Staking Launch", date: "Q1 2026", active: false },
                        { title: "Race-to-Base", date: "Jan 2026 (Monthly)", active: false },
                        { title: "Marketplace", date: "Q1 2026", active: false },
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
                                <p className="font-mono text-xs text-gray-500 mt-1">{item.date}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
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

      {/* Footer */}
      <footer className="py-4 border-t border-cyan-500/30 bg-black text-center">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-cyan-500/60">
            <p>© 2025 Based Guardians · Twitter @based_guardians · Powered by BasedAI</p>
            <div className="flex items-center gap-6">
                <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                        <button onClick={openConnectModal} className="hover:text-cyan-400 transition-colors">Connect Wallet</button>
                    )}
                </ConnectButton.Custom>
                <button onClick={onMintClick} className="hover:text-cyan-400 transition-colors">Mint Now</button>
            </div>
        </div>
      </footer>
    </div>
  );
}
