import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, ShieldCheck, Twitter, Github } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ROYALTY_WALLET, NFT_SYMBOL, TWITTER_URL, CHAIN_ID } from "@/lib/constants";

export function Footer() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    
    // Track feedback submission event
    trackEvent('submit_feedback', 'Engagement', 'Footer Form');

    setTimeout(() => {
      setIsSubmitting(false);
      setFeedback("");
      setEmail("");
      toast({
        title: "Feedback Received",
        description: "Thank you for helping us improve the Based Guardians ecosystem.",
        className: "bg-black border-primary text-primary font-orbitron",
      });
    }, 1500);
  };

  return (
    <footer className="bg-black border-t border-white/10 pt-16 pb-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          
          {/* Brand & Links */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-orbitron text-white mb-2">BASED GUARDIANS</h3>
              <p className="text-muted-foreground font-rajdhani max-w-md">
                A community-governed NFT ecosystem on the BasedAI blockchain. 
                Mint, trade, and vote to shape the future of the Guardians.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="border-white/10 hover:border-primary hover:text-primary rounded-full">
                <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer">
                    <Twitter size={18} />
                </a>
              </Button>
              <Button variant="outline" size="icon" className="border-white/10 hover:border-primary hover:text-primary rounded-full">
                <Github size={18} />
              </Button>
              <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck size={12} className="text-green-500" />
                Audited & Secure
              </div>
            </div>

            <div className="flex gap-6 text-sm text-muted-foreground font-mono">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Smart Contracts</a>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              ROYALTIES: SPLIT TO COMMUNITY & TEAM ({ROYALTY_WALLET})
            </p>
          </div>

          {/* Feedback Form */}
          <div className="bg-card/30 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-primary" />
              <h4 className="text-lg font-orbitron text-white">SYSTEM FEEDBACK</h4>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea 
                placeholder="Report bugs or suggest features..." 
                className="bg-black/50 border-white/10 text-white min-h-[80px] focus:border-primary/50"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              />
              <div className="flex gap-4">
                <Input 
                  type="email" 
                  placeholder="Email (optional)" 
                  className="bg-black/50 border-white/10 text-white focus:border-primary/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !feedback.trim()}
                  className="bg-primary text-black hover:bg-primary/90 font-orbitron min-w-[120px]"
                >
                  {isSubmitting ? "SENDING..." : (
                    <>SEND <Send size={14} className="ml-2" /></>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center pt-8 border-t border-white/5 text-xs text-muted-foreground/40 font-mono flex flex-col items-center">
            <div className="mb-2">© 2025 BASED GUARDIANS. BUILT ON BASED AI.</div>
            <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                OPERATIONAL ON BASEDAI MAINNET ({CHAIN_ID})
            </div>
        </div>
      </div>
    </footer>
  );
}
