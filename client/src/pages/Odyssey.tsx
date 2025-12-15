import { motion } from "framer-motion";
import { Cpu, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Odyssey() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Parallax Stars Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.03),transparent_70%)]" />
        {[...Array(100)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.8 + 0.2,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 1, 0.2],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Back Button */}
        <div className="absolute top-6 left-6">
          <Link href="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Universe
            </Button>
          </Link>
        </div>

        {/* Video Section */}
        <section className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative w-full aspect-video rounded-xl overflow-hidden border border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]"
            >
              <iframe
                src="https://player.vimeo.com/video/1145979392?title=0&byline=0&portrait=0&badge=0&autopause=0&dnt=1"
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                loading="lazy"
                title="Based Guardians Odyssey"
                style={{ background: '#000' }}
              ></iframe>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-6">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <Cpu className="w-8 h-8 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-400/60 uppercase tracking-widest">Hidden Archive</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-orbitron text-white mb-4 leading-tight">
                Ignite Your Odyssey in the{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  Based Guardians Realm
                </span>
              </h1>
              <p className="text-xl text-cyan-400 font-rajdhani">A Tapestry of Possibilities Unfolds</p>
            </motion.div>

            {/* First Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-2xl p-8"
            >
              <p className="text-lg text-gray-200 leading-relaxed font-rajdhani">
                Step boldly into the Based Guardians Realm, where 3,731 NFTs—1,776 Guardians, 1,319 Based Frogs, and 636 Based Creatures—emerge from the forge of 69,420 $BASED L1 tokens. These are no mere collectibles; they are living relics, etched with on-chain metadata that whispers your identity and rarity into the Giga Brain Galaxy's ledger. Crafted by smart contracts, each token is a key to a cosmos brimming with untapped potential, awaiting your touch to awaken its secrets.
              </p>
            </motion.div>

            {/* Second Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-2xl md:text-3xl font-orbitron text-cyan-400">
                Rewards Woven into the Fabric of Valor
              </h2>
              <div className="bg-gradient-to-br from-purple-500/5 to-cyan-500/5 border border-purple-500/20 rounded-2xl p-8">
                <p className="text-lg text-gray-200 leading-relaxed font-rajdhani">
                  Hold your NFT as a beacon in the community pool, where its ERC-721 essence is validated by custom contracts, unlocking a cascade of compounding emissions rewards. The rarer your guardian—be it a Legendary Sentinel or a Common Scout—the richer the bounty, tailored to your place in this saga. Beyond this, your ownership grants passage to Houtos Labs' cryptic unveilings—beta realms and exclusive lore, secured by secondary contracts that hint at mysteries yet to unfold. The beauty of these smart contracts lies in their ability to evolve in countless ways, delivering value tomorrow that we cannot yet foresee, promising holders unforeseen benefits down the road.
                </p>
              </div>
            </motion.div>

            {/* Third Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="space-y-6"
            >
              <h2 className="text-2xl md:text-3xl font-orbitron text-cyan-400">
                A Quest with Heart and Heritage
              </h2>
              <div className="bg-gradient-to-br from-green-500/5 to-cyan-500/5 border border-green-500/20 rounded-2xl p-8">
                <p className="text-lg text-gray-200 leading-relaxed font-rajdhani">
                  This is more than a journey—it's a crusade of strategy, where your NFT fuels epic gameplay and forges bonds within our fellowship. With every stake, you contribute to a humanitarian ember, igniting hope beyond the stars. Here, your involvement shapes a legacy, resilient and enduring, no matter the tides of time.
                </p>
              </div>
            </motion.div>

            {/* Footer decoration */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className="text-center pt-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-400">HIDDEN ARCHIVE UNLOCKED</span>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
