import { motion } from "framer-motion";
import { Cat, ArrowLeft, Heart, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import conceptArt from "@assets/Studio-Project_1765831611867.png";
import foxArt from "@assets/Physicalk_Fox1.png_1765831628596.webp";

export default function Creators() {
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

        {/* Main Content */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="relative w-full max-w-2xl mx-auto"
            >
              <div className="relative rounded-xl overflow-hidden border border-orange-500/30 shadow-[0_0_40px_rgba(251,146,60,0.2)]">
                <img 
                  src={foxArt} 
                  alt="Based Guardian Fox Concept Art" 
                  className="w-full h-auto"
                />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <Cat className="w-8 h-8 text-orange-400" />
                <span className="text-xs font-mono text-orange-400/60 uppercase tracking-widest">Creator Archive</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-orbitron text-white mb-4 leading-tight">
                Meet the Creators Behind{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                  Based Guardians
                </span>
              </h1>
              <p className="text-xl text-orange-400 font-rajdhani">A Humble Beginning Last July</p>
            </motion.div>

            {/* First Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/20 rounded-2xl p-8"
            >
              <p className="text-lg text-gray-200 leading-relaxed font-rajdhani">
                Last July, a humble father-daughter team began weaving the Based Guardians project with care and dedication. Together, they've crafted 3,731 unique NFTs—1,776 fox-like Guardians, 1,319 Base Frog Warriors, and 636 Creatures, ranging from Common to Extremely Rare. Set for a 2025 release, these NFTs spark a gentle 14-chapter saga in the Giga Brain Galaxy, where Guardians, Frogs, and Creatures quietly stand against FUD cyborg fowl—symbols of fear—to safeguard the BasedAI network. It's a modest story, inviting you to join a world of simple bravery.
              </p>
            </motion.div>

            {/* Second Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-pink-400" />
                <h2 className="text-2xl md:text-3xl font-orbitron text-orange-400">
                  A Family-Driven Vision
                </h2>
              </div>
              <div className="bg-gradient-to-br from-pink-500/5 to-orange-500/5 border border-pink-500/20 rounded-2xl p-8">
                <p className="text-lg text-gray-200 leading-relaxed font-rajdhani">
                  Rooted in family spirit, we're proud to support Pepecoin and BasedAI, using a Brain secured late last year to nurture our vision. Our hope is to create NFTs that find a place in the BasedAI ecosystem, offering $BASED rewards through Brain emissions and staking. This season, we'd be honored if you'd join us, connect with our community, and help grow the network and Based Universe at your own pace.
                </p>
              </div>
            </motion.div>

            {/* Creator Story Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <h2 className="text-2xl md:text-3xl font-orbitron text-orange-400">
                  Creator Story
                </h2>
              </div>
              <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-2xl p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-shrink-0 w-full md:w-48">
                    <div className="rounded-lg overflow-hidden border border-amber-500/30 shadow-[0_0_20px_rgba(251,146,60,0.15)]">
                      <img 
                        src={conceptArt} 
                        alt="Concept Art #1" 
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-xs text-amber-400/60 text-center mt-2 font-mono">Early Concept Art</p>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-orbitron text-amber-400 mb-4">Bartholomew: A Quiet Creative Soul</h3>
                    <p className="text-lg text-gray-200 leading-relaxed font-rajdhani">
                      Leading this effort is Bartholomew, a father who blends technology and art with a quiet passion. With skills in drawing, videography, and music, he's spent years exploring how digital and physical worlds can meet, now bringing that to blockchain. Growing up in the 1980s, he draws from childhood joys like Star Fox games and his two fox-like corgis. For Based Guardians, he uses a soft digital style with layered effects, echoing hand-drawn sketches and a gentle synth-wave touch from his '80s memories. With his daughter's heart alongside his, they invite you to share in this humble journey.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Footer decoration */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="text-center pt-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full">
                <Cat className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-mono text-orange-400">CREATOR ARCHIVE UNLOCKED</span>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
