import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Heart, BookOpen, ArrowRightLeft, Loader2, Globe, Cpu, Sparkles } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { Footer } from "./Footer";
import { Link } from "wouter";
import { LoreExplorer } from "./LoreExplorer";

function AnimatedStarfield() {
  const { scrollY } = useScroll();
  
  const farStarsY = useTransform(scrollY, [0, 3000], [0, 150]);
  const midStarsY = useTransform(scrollY, [0, 3000], [0, 400]);
  const nearStarsY = useTransform(scrollY, [0, 3000], [0, 700]);

  const farStars = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 200,
      size: Math.random() * 1.5 + 0.5,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.4 + 0.2,
    })), []
  );

  const midStars = useMemo(() => 
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 200,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.3,
    })), []
  );

  const nearStars = useMemo(() => 
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 200,
      size: Math.random() * 3 + 2,
      duration: Math.random() * 2 + 1.5,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.7 + 0.3,
    })), []
  );

  const shootingStars = useMemo(() => 
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      delay: i * 4 + Math.random() * 2,
      duration: 1.5 + Math.random(),
      startX: Math.random() * 80 + 10,
      startY: Math.random() * 30,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div style={{ y: farStarsY }} className="absolute inset-0">
        {farStars.map((star) => (
          <motion.div
            key={`far-${star.id}`}
            className="absolute rounded-full bg-white/60"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.4, star.opacity],
            }}
            transition={{
              duration: star.duration,
              delay: star.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      <motion.div style={{ y: midStarsY }} className="absolute inset-0">
        {midStars.map((star) => (
          <motion.div
            key={`mid-${star.id}`}
            className="absolute rounded-full bg-white/80"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.3, star.opacity],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: star.duration,
              delay: star.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      <motion.div style={{ y: nearStarsY }} className="absolute inset-0">
        {nearStars.map((star) => (
          <motion.div
            key={`near-${star.id}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.5)`,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.2, star.opacity],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: star.duration,
              delay: star.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      {shootingStars.map((star) => (
        <motion.div
          key={`shooting-${star.id}`}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
            boxShadow: "0 0 6px 2px rgba(255,255,255,0.8), -30px 0 20px 2px rgba(255,255,255,0.4)",
          }}
          animate={{
            x: [0, 200],
            y: [0, 150],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            repeatDelay: 8 + Math.random() * 4,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      color: i % 3 === 0 ? "cyan" : i % 3 === 1 ? "purple" : "indigo",
    })), []
  );

  const colorMap = {
    cyan: "bg-cyan-500/30",
    purple: "bg-purple-500/30",
    indigo: "bg-indigo-500/30",
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${colorMap[particle.color as keyof typeof colorMap]} blur-sm`}
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: ["110vh", "-10vh"],
            x: [0, Math.sin(particle.id) * 50, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function NebulaEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.3) 0%, rgba(34,211,238,0) 70%)",
          left: "-20%",
          top: "10%",
          filter: "blur(60px)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0) 70%)",
          right: "-10%",
          top: "30%",
          filter: "blur(80px)",
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -40, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(236,72,153,0) 70%)",
          left: "30%",
          bottom: "-10%",
          filter: "blur(70px)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, 360],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

function GlowingOrbs() {
  const orbs = useMemo(() => [
    { x: 15, y: 20, size: 120, color: "cyan", delay: 0 },
    { x: 80, y: 15, size: 80, color: "purple", delay: 2 },
    { x: 60, y: 70, size: 100, color: "indigo", delay: 4 },
    { x: 25, y: 80, size: 60, color: "pink", delay: 6 },
    { x: 90, y: 60, size: 90, color: "cyan", delay: 3 },
  ], []);

  const colorStyles = {
    cyan: "rgba(34,211,238,0.15)",
    purple: "rgba(139,92,246,0.15)",
    indigo: "rgba(99,102,241,0.15)",
    pink: "rgba(236,72,153,0.12)",
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${colorStyles[orb.color as keyof typeof colorStyles]} 0%, transparent 70%)`,
            filter: "blur(30px)",
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function FoxIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Sharp pointed ears */}
      <path d="M4 3 L7 10 L4 10 Z" />
      <path d="M20 3 L17 10 L20 10 Z" />
      {/* Face outline */}
      <ellipse cx="12" cy="14" rx="8" ry="7" />
      {/* Eyes */}
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      {/* Nose */}
      <path d="M12 15 L10.5 17 L13.5 17 Z" fill="currentColor" />
      {/* Snout line */}
      <line x1="12" y1="17" x2="12" y2="19" />
    </svg>
  );
}

interface UniverseTabProps {
  onMintClick: () => void;
}

export function UniverseTab({ onMintClick }: UniverseTabProps) {
  const [loading, setLoading] = useState(true);
  const [contentReady, setContentReady] = useState(false);
  const { isConnected } = useAccount();
  
  const { scrollYProgress } = useScroll();
  
  const backgroundY = useTransform(scrollYProgress, [0, 0.5, 1], ["0%", "10%", "20%"]);
  const featuresY = useTransform(scrollYProgress, [0.2, 0.6], ["0%", "-5%"]);
  const timelineY = useTransform(scrollYProgress, [0.4, 0.8], ["0%", "-8%"]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setContentReady(true), 100);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-cyan-500/10 blur-xl animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-mono text-white/40 tracking-[0.3em] uppercase">Entering</span>
            <span className="text-lg font-orbitron text-cyan-400 tracking-[0.2em]">THE UNIVERSE</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Optimized Background - CSS Gradients Only */}
      <div className="fixed inset-0 z-0 will-change-auto">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-black to-black" />
        <AnimatedStarfield />
        <NebulaEffect />
        <GlowingOrbs />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Optimized Background - Pure CSS */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(99,102,241,0.12)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_60%,rgba(139,92,246,0.08)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_30%_80%,rgba(34,211,238,0.06)_0%,transparent_40%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="space-y-6"
          >
            <p className="text-xs font-mono text-cyan-400/50 tracking-[0.4em] uppercase">
              Welcome to
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-orbitron leading-[0.9]">
              <span className="block bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                The Based
              </span>
              <span 
                className="block bg-clip-text text-transparent mt-2"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #22d3ee, #ffffff, #a78bfa, #ffffff, #22d3ee)',
                  backgroundSize: '200% 100%',
                  animation: 'gradientShift 8s ease-in-out infinite',
                }}
              >
                Universe
              </span>
            </h1>
            <style>{`
              @keyframes gradientShift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }
            `}</style>
            
            <p className="text-sm md:text-base font-mono text-white/30 tracking-[0.2em] uppercase pt-4">
              A Saga of Guardians, Frogs & Creatures
            </p>

            <div className="pt-6">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono text-white/40 tracking-wider">3,732 Unique NFTs on BasedAI L1</span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Scroll Indicator - Chevron arrows */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-[10px] font-mono text-white/20 tracking-widest uppercase mb-1">Explore</span>
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex flex-col items-center"
          >
            <svg className="w-5 h-5 text-cyan-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
            <svg className="w-5 h-5 text-cyan-400/20 -mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* Story Content */}
      <section className="relative z-10 py-20">
        <div className="max-w-3xl mx-auto px-6 space-y-12">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-lg md:text-xl text-white/60 leading-relaxed text-center font-light"
          >
            Step into the Based Guardians Universe, a space crafted with care for those who cherish crypto trading and NFT collecting. Here, $BASED L1 tokens mint 3,732 unique NFTs.
          </motion.p>

          {/* Story Sections with Premium Styling */}
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative pl-6"
            >
              <div className="absolute left-0 top-0 w-px h-full bg-gradient-to-b from-cyan-500/40 via-purple-500/20 to-transparent" />
              <h3 className="text-lg md:text-xl font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-3">
                The Heartbeat of an Ancient World
              </h3>
              <p className="text-sm md:text-base text-white/40 leading-relaxed">
                Beneath the galaxy's canopy, the FUD cyborg fowl cast shadows over the Brain Network. These foes challenge the stalwart Guardians, whose 32 lineages trace their lineage to celestial battles, and the Based Frogs, whose 7 clans guard secrets of bio-engineered symbiosis with the 7 broods of fearless Creatures.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative pl-6"
            >
              <div className="absolute left-0 top-0 w-px h-full bg-gradient-to-b from-purple-500/40 via-cyan-500/20 to-transparent" />
              <h3 className="text-lg md:text-xl font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-3">
                A Legacy Secured by Vision
              </h3>
              <p className="text-sm md:text-base text-white/40 leading-relaxed">
                Rooted in a secured subnet, our realm leverages the potential of Based Labs' infrastructure when ready, yet stands independent of its fate. As NFTs powered by smart contracts, these Guardians, Frogs, and Creatures hold the promise of evolving in myriad unforeseen ways.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative pl-6"
            >
              <div className="absolute left-0 top-0 w-px h-full bg-gradient-to-b from-cyan-500/40 via-indigo-500/20 to-transparent" />
              <h3 className="text-lg md:text-xl font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 mb-3">
                A Gentle Note of Understanding
              </h3>
              <p className="text-sm md:text-base text-white/40 leading-relaxed">
                As you step into the Based Guardians Realm, we invite you with open hearts to explore this father-daughter crafted universe. This project thrives on-chain as a testament to community spirit.
              </p>
            </motion.div>
          </div>

          {/* Video Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="pt-8"
          >
            <div className="text-center mb-6">
              <p className="text-xs font-mono text-cyan-400/40 tracking-[0.3em] uppercase mb-1">Experience</p>
              <h3 className="text-xl font-orbitron text-white/90">Join the Ranks</h3>
            </div>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.4)] bg-black">
              <iframe 
                src="https://player.vimeo.com/video/1146652270?title=0&byline=0&portrait=0&badge=0&autopause=0&dnt=1&loop=1" 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" 
                allowFullScreen
                loading="lazy"
                title="Based Guardians"
                className="absolute inset-0"
                style={{ background: '#000' }}
              ></iframe>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Parallax Container for content below video */}
      <div className="relative overflow-hidden">
        {/* Floating parallax background elements */}
        <motion.div 
          style={{ y: backgroundY }}
          className="absolute inset-0 pointer-events-none z-0"
        >
          <div className="absolute top-20 left-10 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        </motion.div>

        {/* Features Grid with Parallax */}
        <motion.section 
          style={{ y: featuresY }}
          className="py-20 bg-gradient-to-b from-black to-indigo-950/20 relative z-10"
        >
          <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                      { icon: Heart, title: "Humanitarian Horizon", sub: "Missions Beyond the Chain", desc: "Real-world impact initiatives and community-driven giving to build a better future.", link: "https://www.destinyrescue.org/", tab: null },
                      { icon: BookOpen, title: "Galactic Storytelling", sub: "Co-Create the Epic", desc: "Evolving lore and holder-driven narratives that shape the destiny of the Based Universe.", link: "/saga", tab: null },
                      { icon: Globe, title: "Infinite Possibilities", sub: "Evolve with the Cosmos", desc: "Future upgrades, expansions, and endless growth potential for every Guardian.", link: null, tab: null },
                      { icon: ArrowRightLeft, title: "Guardian Exchange", sub: "Trade Legends", desc: "Secure marketplace for trading Guardians with a 1% fee contributing to the community pool.", link: null, tab: "escrow" },
                  ].map((feature, idx) => {
                      const content = (
                          <>
                              <div className="w-12 h-12 rounded-full bg-cyan-900/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                                  <feature.icon className="w-6 h-6 text-cyan-400 group-hover:text-cyan-200" />
                              </div>
                              <h4 className="text-lg font-bold text-white mb-1 font-orbitron">{feature.title}</h4>
                              <p className="text-xs font-mono text-cyan-400 mb-3 uppercase tracking-wider">{feature.sub}</p>
                              <p className="text-sm text-gray-400 leading-relaxed">
                                  {feature.desc}
                              </p>
                          </>
                      );

                      if (feature.link) {
                          const isExternal = feature.link.startsWith('http');
                          if (isExternal) {
                              return (
                                  <motion.a 
                                      key={idx}
                                      href={feature.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      whileHover={{ y: -5, scale: 1.02 }}
                                      whileInView={{ opacity: 1, y: 0 }}
                                      initial={{ opacity: 0, y: 30 }}
                                      transition={{ delay: idx * 0.1, duration: 0.5 }}
                                      viewport={{ once: true }}
                                      className="bg-black/40 border border-cyan-500/20 p-6 rounded-xl hover:border-cyan-500/60 transition-colors group backdrop-blur-sm cursor-pointer block"
                                  >
                                      {content}
                                  </motion.a>
                              );
                          }
                          return (
                              <motion.a 
                                  key={idx}
                                  href={feature.link}
                                  whileHover={{ y: -5, scale: 1.02 }}
                                  whileInView={{ opacity: 1, y: 0 }}
                                  initial={{ opacity: 0, y: 30 }}
                                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                                  viewport={{ once: true }}
                                  className="bg-black/40 border border-cyan-500/20 p-6 rounded-xl hover:border-cyan-500/60 transition-colors group backdrop-blur-sm cursor-pointer block"
                              >
                                  {content}
                              </motion.a>
                          );
                      }
                      
                      if (feature.tab) {
                          return (
                              <motion.button 
                                  key={idx}
                                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: feature.tab }))}
                                  whileHover={{ y: -5, scale: 1.02 }}
                                  whileInView={{ opacity: 1, y: 0 }}
                                  initial={{ opacity: 0, y: 30 }}
                                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                                  viewport={{ once: true }}
                                  className="bg-black/40 border border-cyan-500/20 p-6 rounded-xl hover:border-cyan-500/60 transition-colors group backdrop-blur-sm cursor-pointer text-left"
                              >
                                  {content}
                              </motion.button>
                          );
                      }
                      
                      return (
                          <motion.div 
                              key={idx}
                              whileHover={{ y: -5, scale: 1.02 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              initial={{ opacity: 0, y: 30 }}
                              transition={{ delay: idx * 0.1, duration: 0.5 }}
                              viewport={{ once: true }}
                              className="bg-black/40 border border-cyan-500/20 p-6 rounded-xl hover:border-cyan-500/60 transition-colors group backdrop-blur-sm"
                          >
                              {content}
                          </motion.div>
                      );
                  })}
              </div>
          </div>
        </motion.section>

        {/* Interactive Lore Explorer Section */}
        <motion.section 
          className="py-20 bg-gradient-to-b from-indigo-950/10 to-black relative z-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono text-purple-400 uppercase tracking-wider">Interactive Experience</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-orbitron text-white mb-4">
                Explore the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Deep Lore</span>
              </h3>
              <p className="text-white/50 max-w-2xl mx-auto">
                Discover hidden stories, unlock character backstories, and uncover the secrets of the Based Universe. 
                Click on locked entries to reveal their mysteries.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
            >
              <LoreExplorer />
            </motion.div>
          </div>
        </motion.section>

        {/* Timeline Section with Parallax */}
        <motion.section 
          style={{ y: timelineY }}
          className="py-20 border-b border-white/10 bg-black/80 backdrop-blur-sm relative z-10"
        >
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
                            <div className={`absolute left-6 md:left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${item.active ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-black border-cyan-500/30'}`} />
                            
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
        </motion.section>
      </div>

      {/* Universe-specific tagline */}
      <div className="py-4 border-t border-cyan-500/30 bg-black text-center">
        <p className="text-xs font-mono text-cyan-500/60 max-w-4xl mx-auto px-4">
          A hopeful bond that grows with every passing star.
        </p>
        
        {/* Easter Egg Icons */}
        <div className="flex items-center justify-center gap-8 mt-6 sm:opacity-40 opacity-60 hover:opacity-100 transition-opacity duration-500">
          <Link href="/odyssey">
            <button 
              className="p-3 rounded-full hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors group touch-manipulation"
              title="Discover more..."
              aria-label="Discover the Odyssey"
            >
              <Cpu className="w-7 h-7 sm:w-6 sm:h-6 text-cyan-500/60 group-hover:text-cyan-400 group-active:text-cyan-400 transition-colors" />
            </button>
          </Link>
          <Link href="/creators">
            <button 
              className="p-3 rounded-full hover:bg-orange-500/10 active:bg-orange-500/20 transition-colors group touch-manipulation"
              title="Meet the creators..."
              aria-label="Meet the creators"
            >
              <FoxIcon className="w-7 h-7 sm:w-6 sm:h-6 text-orange-500/60 group-hover:text-orange-400 group-active:text-orange-400 transition-colors" />
            </button>
          </Link>
        </div>
      </div>

      {/* Main Footer */}
      <Footer />
    </div>
  );
}
