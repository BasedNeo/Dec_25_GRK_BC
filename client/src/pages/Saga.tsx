import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Sparkles, Send, CheckCircle, Compass, Wallet } from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

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

function ChooseYourAdventure() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [previousVote, setPreviousVote] = useState<number | null>(null);

  // Check if wallet has already voted
  useEffect(() => {
    if (address) {
      const votesData = localStorage.getItem('saga_votes');
      if (votesData) {
        const votes = JSON.parse(votesData);
        if (votes[address.toLowerCase()]) {
          setHasVoted(true);
          setPreviousVote(votes[address.toLowerCase()]);
        } else {
          setHasVoted(false);
          setPreviousVote(null);
        }
      }
    } else {
      setHasVoted(false);
      setPreviousVote(null);
    }
  }, [address]);

  const adventureOptions = [
    {
      id: 1,
      title: "Rally the Scattered Frogs",
      description: "Seek out the amphibian sages across the cosmos and unite their ancient wisdom.",
      icon: "🐸",
    },
    {
      id: 2,
      title: "Storm the FUD Fortress",
      description: "Lead a direct assault on the Cyborg Fowl's stronghold to rescue the Wizard Committer.",
      icon: "⚔️",
    },
    {
      id: 3,
      title: "Awaken the Elemental Creatures",
      description: "Journey to the hidden realms and call forth the beings of pure energy.",
      icon: "✨",
    },
    {
      id: 4,
      title: "Forge the Alliance of Chains",
      description: "Complete the Based-Bridge and unite all blockchain realms against the darkness.",
      icon: "🔗",
    },
  ];

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }
    if (selectedOption === null || hasVoted) return;
    
    setIsSubmitting(true);
    
    const selectedChoice = adventureOptions.find(o => o.id === selectedOption);
    const maxRetries = 3;
    let submitted = false;
    
    for (let attempt = 1; attempt <= maxRetries && !submitted; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Saga Vote: ${selectedChoice?.title || 'Unknown'}`,
            content: `${selectedChoice?.icon} ${selectedChoice?.description || ''}\n\nVoted by wallet: ${address}`,
            walletAddress: address,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          submitted = true;
        } else {
          throw new Error('Server error');
        }
      } catch {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    
    // Save vote to localStorage even if backend failed (optimistic)
    const votesData = localStorage.getItem('saga_votes');
    const votes = votesData ? JSON.parse(votesData) : {};
    votes[address.toLowerCase()] = selectedOption;
    localStorage.setItem('saga_votes', JSON.stringify(votes));
    
    localStorage.setItem('storySubmitted', 'true');
    
    setHasVoted(true);
    setPreviousVote(selectedOption);
    setShowSuccess(true);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setShowSuccess(false);
    setSelectedOption(null);
  };

  return (
    <section className="py-16 relative">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto px-6"
      >
        <div className="bg-gradient-to-b from-purple-950/30 to-black/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8 md:p-10 shadow-[0_0_40px_rgba(139,92,246,0.15)]">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Compass className="w-6 h-6 text-purple-400" />
            <h3 className="text-2xl md:text-3xl font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              Shape the Saga
            </h3>
            <Compass className="w-6 h-6 text-cyan-400" />
          </div>
          
          <p className="text-center text-gray-300 mb-4 font-mono text-sm">
            What should the Guardians do next? Cast your vote and help write the next chapter.
          </p>
          
          {hasVoted && previousVote && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-6 text-center">
              <p className="text-green-400 text-sm font-mono flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                You voted for: {adventureOptions.find(o => o.id === previousVote)?.title}
              </p>
            </div>
          )}
          
          {!isConnected && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-6 text-center">
              <p className="text-purple-400 text-sm font-mono flex items-center justify-center gap-2">
                <Wallet className="w-4 h-4" />
                Connect your wallet to cast your vote
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {adventureOptions.map((option) => (
              <motion.button
                key={option.id}
                onClick={() => !hasVoted && setSelectedOption(option.id)}
                whileHover={!hasVoted ? { scale: 1.02 } : {}}
                whileTap={!hasVoted ? { scale: 0.98 } : {}}
                disabled={hasVoted}
                className={`p-4 rounded-xl border text-left transition-all duration-300 relative ${
                  previousVote === option.id
                    ? "bg-green-500/20 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                    : selectedOption === option.id
                    ? "bg-purple-500/20 border-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    : hasVoted
                    ? "bg-black/20 border-white/5 opacity-50 cursor-not-allowed"
                    : "bg-black/40 border-white/10 hover:border-purple-500/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <h4 className={`font-orbitron text-sm mb-1 ${
                      previousVote === option.id ? "text-green-300" :
                      selectedOption === option.id ? "text-purple-300" : "text-white"
                    }`}>
                      {option.title}
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
                {previousVote === option.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                )}
                {selectedOption === option.id && !hasVoted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-3 h-3 bg-purple-400 rounded-full"
                  />
                )}
              </motion.button>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={(isConnected && (selectedOption === null || isSubmitting || hasVoted))}
            className={`w-full font-orbitron py-6 text-lg shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed ${
              hasVoted 
                ? "bg-gradient-to-r from-green-600 to-green-700 cursor-not-allowed"
                : !isConnected
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500"
                : "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500"
            } text-white`}
          >
            {!isConnected ? (
              <span className="flex items-center justify-center gap-2">
                <Wallet className="w-5 h-5" />
                Connect Wallet to Vote
              </span>
            ) : hasVoted ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Vote Recorded
              </span>
            ) : isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Send className="w-5 h-5" />
                </motion.div>
                Transmitting to the Cosmos...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="w-5 h-5" />
                Submit Your Choice
              </span>
            )}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-purple-950/90 to-black/95 border border-purple-500/50 rounded-2xl p-8 md:p-10 max-w-md text-center shadow-[0_0_60px_rgba(139,92,246,0.3)]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>

              <h3 className="text-2xl font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
                Voice Received
              </h3>

              <p className="text-gray-300 mb-6 leading-relaxed">
                Your choice echoes through the cosmos. The Guardians have heard your call.
              </p>

              <div className="bg-black/50 border border-cyan-500/30 rounded-xl p-6 mb-6">
                <p className="text-cyan-300 italic font-mono text-sm leading-relaxed">
                  "Active Guardians are the most noble and righteous. Keep up the spirit and you will inherit the stars."
                </p>
                <p className="text-purple-400 text-xs mt-4 font-orbitron">
                  — Kyle, Based Guardian 1420
                </p>
              </div>

              <Button
                onClick={handleClose}
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 font-orbitron"
              >
                Continue the Journey
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function Saga() {
  useEffect(() => {
    const visited = JSON.parse(localStorage.getItem('pagesVisited') || '[]');
    if (!visited.includes('saga')) {
      visited.push('saga');
      localStorage.setItem('pagesVisited', JSON.stringify(visited));
    }
  }, []);

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
            <Link href="/" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-mono text-sm">
              <ArrowLeft size={16} />
              Back to Universe
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
                  The Guardians must reunite. The Based Frogs prepare. The Creatures are awakened. The Wizard Committer must be rescued.
                </p>
                
                <p className="text-center text-purple-400 font-mono mt-8">
                  The fate of the Based Universe rests in your hands.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <ChooseYourAdventure />

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
