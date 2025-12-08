import { Twitter, Disc } from "lucide-react";
import { ROYALTY_WALLET, NFT_SYMBOL, TWITTER_URL, CHAIN_ID } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <span className="font-orbitron text-xl font-bold text-white tracking-widest">
              BASED <span className="text-primary">GUARDIANS ({NFT_SYMBOL})</span>
            </span>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              © 2025 ALL RIGHTS RESERVED. ON-CHAIN.<br/>
              ROYALTIES: SPLIT TO COMMUNITY & TEAM ({ROYALTY_WALLET})
            </p>
            <p className="text-xs text-muted-foreground mt-2 font-rajdhani max-w-sm">
               The Guardians of Flare: 1776 Guardians, 1319 Frogs, 636 Creatures. Protecting the BasedAI Chain.
            </p>
          </div>

          <div className="flex space-x-6">
            <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Disc size={20} /> {/* Discord icon workaround if needed, otherwise Disc is CD. Using Disc as generic */}
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-center md:justify-between items-center text-xs text-muted-foreground font-mono">
          <div className="flex space-x-4 mb-4 md:mb-0">
            <a href="#" className="hover:text-white">TERMS</a>
            <a href="#" className="hover:text-white">PRIVACY</a>
            <a href="#" className="hover:text-white">SMART CONTRACT</a>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            OPERATIONAL ON BASEDAI MAINNET ({CHAIN_ID})
          </div>
        </div>
      </div>
    </footer>
  );
}
