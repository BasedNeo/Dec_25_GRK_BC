import { motion } from "framer-motion";
import { Cpu, ArrowLeft, Shield, Gem, Heart, Rocket } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect } from "react";

function StarField() {
  const stars = useMemo(() => 
    [...Array(80)].map((_, i) => ({
      id: i,
      width: Math.random() * 2.5 + 0.5,
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: Math.random() * 0.6 + 0.2,
      duration: Math.random() * 4 + 4,
      delay: Math.random() * 3,
    })), []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.04),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-cyan-200"
          style={{
            width: star.width,
            height: star.width,
            left: `${star.left}%`,
            top: `${star.top}%`,
          }}
          animate={{
            opacity: [star.opacity * 0.3, star.opacity, star.opacity * 0.3],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: star.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function Odyssey() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <StarField />

      <div className="relative z-10">
        {/* Fixed Back Button */}
        <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50">
          <Link href="/">
            <Button 
              variant="ghost" 
              className="bg-black/70 backdrop-blur-sm border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:bg-cyan-500/20 touch-manipulation text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-2"
              data-testid="button-back-odyssey"
            >
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Back</span>
            </Button>
          </Link>
        </div>

        {/* Video Section */}
        <section className="pt-16 sm:pt-24 pb-6 sm:pb-8 px-3 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl sm:rounded-2xl blur-xl" />
              <div className="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-cyan-500/40 shadow-[0_0_30px_rgba(0,255,255,0.15)] sm:shadow-[0_0_40px_rgba(0,255,255,0.15)]">
                <iframe
                  src="https://player.vimeo.com/video/1145979392?title=0&byline=0&portrait=0&badge=0&autopause=0&dnt=1&playsinline=1&loop=1"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  allowFullScreen
                  loading="lazy"
                  title="Based Guardians Odyssey"
                  className="bg-black"
                  style={{ WebkitTransform: 'translateZ(0)' }}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-6 sm:py-8 px-3 sm:px-6">
          <div className="max-w-3xl mx-auto space-y-10 sm:space-y-16">
            {/* Title Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-6">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Hidden Archive</span>
              </div>
              
              <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black font-orbitron text-white mb-4 leading-tight">
                Ignite Your Odyssey in the{" "}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400">
                  Based Guardians Realm
                </span>
              </h1>
              
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mt-6" />
            </motion.div>

            {/* Section 1: A Tapestry */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                  <Rocket className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-orbitron text-cyan-400">
                  A Tapestry of Possibilities Unfolds
                </h2>
              </div>
              <div className="bg-gradient-to-br from-cyan-950/30 to-slate-950/50 border border-cyan-500/20 rounded-xl p-6 sm:p-8">
                <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-rajdhani">
                  Step boldly into the Based Guardians Realm, where 3,731 NFTs—1,776 Guardians, 1,319 Based Frogs, and 636 Based Creatures—emerge from the forge of 69,420 $BASED L1 tokens. These are no mere collectibles; they are living relics, etched with on-chain metadata that whispers your identity and rarity into the Giga Brain Galaxy's ledger. Crafted by smart contracts, each token is a key to a cosmos brimming with untapped potential, awaiting your touch to awaken its secrets.
                </p>
              </div>
            </motion.div>

            {/* Section 2: Rewards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <Gem className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-orbitron text-purple-400">
                  Rewards Woven into the Fabric of Valor
                </h2>
              </div>
              <div className="bg-gradient-to-br from-purple-950/30 to-slate-950/50 border border-purple-500/20 rounded-xl p-6 sm:p-8">
                <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-rajdhani">
                  Hold your NFT as a beacon in the community pool, where its ERC-721 essence is validated by custom contracts, unlocking a cascade of compounding emissions rewards. The rarer your guardian—be it a Legendary Sentinel or a Common Scout—the richer the bounty, tailored to your place in this saga. Beyond this, your ownership grants passage to Houtos Labs' cryptic unveilings—beta realms and exclusive lore, secured by secondary contracts that hint at mysteries yet to unfold. The beauty of these smart contracts lies in their ability to evolve in countless ways, delivering value tomorrow that we cannot yet foresee, promising holders unforeseen benefits down the road.
                </p>
              </div>
            </motion.div>

            {/* Section 3: Quest with Heart */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <Heart className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-orbitron text-emerald-400">
                  A Quest with Heart and Heritage
                </h2>
              </div>
              <div className="bg-gradient-to-br from-emerald-950/30 to-slate-950/50 border border-emerald-500/20 rounded-xl p-6 sm:p-8">
                <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-rajdhani">
                  This is more than a journey—it's a crusade of strategy, where your NFT fuels epic gameplay and forges bonds within our fellowship. With every stake, you contribute to a humanitarian ember, igniting hope beyond the stars. Here, your involvement shapes a legacy, resilient and enduring, no matter the tides of time.
                </p>
              </div>
            </motion.div>

            {/* Footer Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center py-8"
            >
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mx-auto mb-8" />
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/30 rounded-full">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-mono text-cyan-400 tracking-wide">HIDDEN ARCHIVE UNLOCKED</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bottom Gradient */}
        <div className="h-24 bg-gradient-to-t from-black to-transparent" />
      </div>
    </div>
  );
}
