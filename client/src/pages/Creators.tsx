import { motion } from "framer-motion";
import { ArrowLeft, Heart, Sparkles, Users, Palette } from "lucide-react";

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
      <path d="M4 3 L7 10 L4 10 Z" />
      <path d="M20 3 L17 10 L20 10 Z" />
      <ellipse cx="12" cy="14" rx="8" ry="7" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 15 L10.5 17 L13.5 17 Z" fill="currentColor" />
      <line x1="12" y1="17" x2="12" y2="19" />
    </svg>
  );
}
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect } from "react";
import conceptArt from "@assets/Studio-Project_1765831611867.png";
import foxArt from "@assets/Physicalk_Fox1.png_1765831628596.webp";

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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.03),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-orange-200"
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

export default function Creators() {
  useEffect(() => {
    window.scrollTo(0, 0);
    const visited = JSON.parse(localStorage.getItem('pagesVisited') || '[]');
    if (!visited.includes('creators')) {
      visited.push('creators');
      localStorage.setItem('pagesVisited', JSON.stringify(visited));
    }
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
              className="bg-black/70 backdrop-blur-sm border border-orange-500/30 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 active:bg-orange-500/20 touch-manipulation text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-2"
              data-testid="button-back-creators"
            >
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Back</span>
            </Button>
          </Link>
        </div>

        {/* Hero Image Section */}
        <section className="pt-16 sm:pt-24 pb-6 sm:pb-8 px-3 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="relative"
            >
              <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-orange-500/15 to-amber-500/15 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl" />
              <div className="relative rounded-lg sm:rounded-xl overflow-hidden border border-orange-500/30 shadow-[0_0_30px_rgba(251,146,60,0.15)] sm:shadow-[0_0_50px_rgba(251,146,60,0.15)]">
                <img 
                  src={foxArt} 
                  alt="Based Guardian Fox" 
                  className="w-full h-auto"
                  loading="eager"
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
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full mb-6">
                <FoxIcon className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-mono text-orange-400 uppercase tracking-widest">Creator Archive</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-orbitron text-white mb-4 leading-tight">
                Meet the Creators Behind{" "}
                <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400">
                  Based Guardians
                </span>
              </h1>
              
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto mt-6" />
            </motion.div>

            {/* Section 1: Humble Beginning */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <Users className="w-5 h-5 text-orange-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-orbitron text-orange-400">
                  A Humble Beginning in July 2023
                </h2>
              </div>
              <div className="bg-gradient-to-br from-orange-950/30 to-slate-950/50 border border-orange-500/20 rounded-xl p-6 sm:p-8">
                <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-rajdhani">
                  In July 2023, a humble father-daughter team began weaving the Based Guardians project with care and dedication. Together, they've crafted 3,731 unique NFTs—1,776 fox-like Guardians, 1,319 Base Frog Warriors, and 636 Creatures, ranging from Common to Extremely Rare. Set for a 2025 release, these NFTs spark an everliving saga in the Giga Brain Galaxy, where Guardians, Frogs, and Creatures quietly stand against FUD cyborg fowl—symbols of fear—to safeguard the BasedAI network. It's a modest story, inviting you to join a world of simple bravery.
                </p>
              </div>
            </motion.div>

            {/* Section 2: Family-Driven Vision */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/30">
                  <Heart className="w-5 h-5 text-pink-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-orbitron text-pink-400">
                  A Family-Driven Vision
                </h2>
              </div>
              <div className="bg-gradient-to-br from-pink-950/30 to-slate-950/50 border border-pink-500/20 rounded-xl p-6 sm:p-8">
                <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-rajdhani">
                  Rooted in family spirit, we're proud to support Pepecoin and BasedAI, using a Brain secured late last year to nurture our vision. Our hope is to create NFTs that find a place in the BasedAI ecosystem, offering $BASED rewards through Brain emissions and staking. This season, we'd be honored if you'd join us, connect with our community, and help grow the network and Based Universe at your own pace.
                </p>
              </div>
            </motion.div>

            {/* Section 3: Creator Story */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <Palette className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-orbitron text-amber-400">
                  Creator Story
                </h2>
              </div>
              <div className="bg-gradient-to-br from-amber-950/30 to-slate-950/50 border border-amber-500/20 rounded-xl p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Concept Art Image */}
                  <div className="flex-shrink-0 w-full sm:w-56 mx-auto lg:mx-0">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg blur-md" />
                      <div className="relative rounded-lg overflow-hidden border border-amber-500/40 shadow-lg">
                        <img 
                          src={conceptArt} 
                          alt="Concept Art #1" 
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-amber-400/70 text-center mt-3 font-mono tracking-wide">EARLY CONCEPT ART</p>
                  </div>
                  
                  {/* Story Text */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <h3 className="text-lg font-orbitron text-amber-400">Bartholomew: A Quiet Creative Soul</h3>
                    </div>
                    <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-rajdhani">
                      Leading this effort is Bartholomew, a father who blends technology and art with a quiet passion. With skills in drawing, videography, and music, he's spent years exploring how digital and physical worlds can meet, now bringing that to blockchain. Growing up in the 1980s, he draws from childhood joys like Star Fox games and his two fox-like corgis. For Based Guardians, he uses a soft digital style with layered effects, echoing hand-drawn sketches and a gentle synth-wave touch from his '80s memories. With his daughter's heart alongside his, they invite you to share in this humble journey.
                    </p>
                  </div>
                </div>
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
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent mx-auto mb-8" />
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/30 rounded-full">
                <FoxIcon className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-mono text-orange-400 tracking-wide">CREATOR ARCHIVE UNLOCKED</span>
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
