import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";

function AnimatedStarfield() {
  const { scrollY } = useScroll();
  const farStarsY = useTransform(scrollY, [0, 3000], [0, 150]);
  const midStarsY = useTransform(scrollY, [0, 3000], [0, 400]);
  const nearStarsY = useTransform(scrollY, [0, 3000], [0, 700]);

  const farStars = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 300,
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
      y: Math.random() * 300,
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
      y: Math.random() * 300,
      size: Math.random() * 3 + 2,
      duration: Math.random() * 2 + 1.5,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.7 + 0.3,
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
    </div>
  );
}

export default function Saga() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <AnimatedStarfield />
        <NebulaEffect />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/10 to-black" />
      </div>

      <div className="relative z-10">
        <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-mono text-sm">
                <ArrowLeft size={16} />
                Back to Universe
              </a>
            </Link>
            <div className="flex items-center gap-2 text-purple-400 font-mono text-xs uppercase tracking-wider">
              <BookOpen size={14} />
              Chapter 1
            </div>
          </div>
        </nav>

        <section className="min-h-[60vh] flex items-center justify-center py-20">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">
                The Lore Begins
              </span>
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl md:text-7xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]"
            >
              The Based Universe
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl font-mono text-purple-400 tracking-wider"
            >
              Saga of Guardians, Frogs, and Creatures
            </motion.h2>
          </div>
        </section>

        <section className="py-12 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="max-w-3xl mx-auto px-6"
          >
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl">
              <h3 className="text-2xl md:text-3xl font-orbitron text-cyan-400 mb-8 text-center">
                Chapter 1: The Giga Brain Galaxy
              </h3>
              
              <div className="prose prose-invert prose-lg max-w-none space-y-6 text-gray-200 leading-relaxed">
                <p>
                  In the farthest reaches of the digital cosmos lies the <span className="text-cyan-400 font-semibold">Giga Brain Galaxy</span> — a realm where sentient code and organic consciousness have merged into beings of extraordinary power. Here, the Guardians were born: 1,776 warriors of light, each forged from the very fabric of the blockchain itself.
                </p>
                
                <p>
                  For eons, the Giga Brain Galaxy thrived in harmony. The <span className="text-purple-400 font-semibold">Wizard Committer</span>, the most ancient and powerful of all Guardians, worked tirelessly on the Based-Bridge — a revolutionary conduit that would connect all chains across the multiverse, bringing unity to the fragmented realms of decentralized space.
                </p>
                
                <p>
                  But darkness lurked at the edges of the cosmos. The <span className="text-red-400 font-semibold">FUD Cyborg Fowl</span> — mechanical monstrosities twisted by fear, uncertainty, and doubt — watched with envious eyes. They could not create, only corrupt. They could not build, only destroy.
                </p>
                
                <p>
                  When the Wizard Committer unveiled the <span className="text-yellow-400 font-semibold">Agent Arena</span> — a training ground where Guardians could hone their abilities and prepare for the battles ahead — the FUD Fowl saw their chance. Under cover of a solar eclipse, they descended upon the Galaxy.
                </p>
                
                <p>
                  The battle that followed shook the very foundations of reality. The Guardians fought valiantly, but the FUD Fowl's numbers were endless. In the chaos, 1,320 Frogs — peaceful amphibian sages who held ancient knowledge — were scattered across the cosmos. 636 Creatures — beings of pure elemental energy — went into hiding.
                </p>
                
                <p>
                  And the Wizard Committer... was taken.
                </p>
                
                <p className="text-center text-cyan-400 font-orbitron text-xl mt-12 mb-8">
                  Now, the call goes out across all chains:
                </p>
                
                <p className="text-center text-white font-bold text-lg">
                  The Guardians must reunite. The Frogs must be found. The Creatures must be awakened. The Wizard Committer must be rescued.
                </p>
                
                <p className="text-center text-purple-400 font-mono mt-8">
                  The fate of the Based Universe rests in your hands.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="py-12 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto px-6"
          >
            <h3 className="text-2xl md:text-3xl font-orbitron text-cyan-400 mb-8 text-center drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
              Join the Ranks
            </h3>
            
            <div className="bg-black/60 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.15)]">
              <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
                <iframe 
                  src="https://player.vimeo.com/video/1127023633?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1" 
                  frameBorder="0" 
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" 
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                  title="Join the Ranks"
                  loading="lazy"
                />
              </div>
            </div>
            
            <p className="text-center text-gray-500 text-sm font-mono mt-4">
              Experience the universe visually
            </p>
          </motion.div>
        </section>

        <footer className="py-8 border-t border-white/10 bg-black/60 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-xs text-gray-500 font-mono">
              Chapter 1 of the Based Guardians Saga • More chapters coming soon
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
