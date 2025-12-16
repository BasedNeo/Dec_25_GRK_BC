import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, ShieldCheck, Twitter, Github, Heart, Disc, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { NFT_SYMBOL, TWITTER_URL, CHAIN_ID } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

import { useSecurity } from "@/context/SecurityContext";

export function Footer() {
  const { toast } = useToast();
  const { sanitize } = useSecurity();
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    
    const safeFeedback = sanitize(feedback);
    const safeEmail = sanitize(email);

    trackEvent('submit_feedback', 'Engagement', 'Footer Form');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: safeFeedback,
          email: safeEmail || null,
          walletAddress: null,
        }),
      });

      if (response.ok) {
        setFeedback("");
        setEmail("");
        toast({
          title: "Feedback Sent",
          description: "Thank you! Your feedback has been saved and our team will review it.",
          className: "bg-black border-primary text-primary font-orbitron",
        });
      } else {
        const data = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: data.error || `Server returned ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('[Feedback] Error:', error.name, error.message);
      toast({
        title: "Connection Issue",
        description: `${error.name}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
              <Button variant="outline" size="icon" className="border-white/10 hover:border-primary hover:text-primary rounded-full flex items-center justify-center">
                <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full h-full">
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

            <div className="pt-2">
                <a 
                    href="https://www.destinyrescue.org/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors font-mono group"
                >
                    <Heart size={12} className="text-red-500 fill-red-500/20 group-hover:fill-red-500 transition-colors" />
                    <span>Proudly donating 4% of profits to <span className="underline decoration-primary/30 underline-offset-2 group-hover:decoration-primary">Destiny Rescue</span></span>
                </a>
            </div>

            <div className="flex gap-6 text-sm text-muted-foreground font-mono">
              <button 
                onClick={() => setIsTermsOpen(true)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Terms
              </button>
              <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-white transition-colors cursor-pointer">Privacy</button>
              <a 
                href="https://explorer.bf1337.org/address/0xaE51dc5fD1499A129f8654963560f9340773ad59" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                Smart Contracts <span className="text-[10px]">↗</span>
              </a>
            </div>

            
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              ROYALTIES: SPLIT TO COMMUNITY & TEAM
            </p>
          </div>

          {/* Feedback Form */}
          <div className="bg-card/30 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-primary" />
              <h4 className="text-lg font-orbitron text-white">Suggestions?</h4>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea 
                placeholder="Share your thoughts with us... (max 500 words)" 
                className="bg-black/50 border-white/10 text-white min-h-[80px] focus:border-primary/50"
                value={feedback}
                onChange={(e) => {
                  const words = e.target.value.trim().split(/\s+/).filter(w => w.length > 0);
                  if (words.length <= 500) setFeedback(e.target.value);
                }}
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {feedback.trim().split(/\s+/).filter(w => w.length > 0).length}/500 words
              </p>
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
                  className="bg-primary hover:bg-primary/90 font-orbitron min-w-[120px] text-[#34c4c9]"
                >
                  {isSubmitting ? "SENDING..." : (
                    <>SEND <Send size={14} className="ml-2" /></>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="mb-6 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded text-xs text-yellow-500/60 font-mono flex flex-col md:flex-row justify-between items-center gap-2 relative z-10">
           <span className="text-center md:text-left">
             Values are estimates based on community pool; actual market value may differ (e.g., from Aftermint.trade). Not financial advice. © 2025 Based Guardians
           </span>
           <div className="flex items-center">
             <button 
               onClick={() => setIsTermsOpen(true)}
               className="text-white hover:text-primary whitespace-nowrap ml-2 cursor-pointer"
             >
               Terms of Service
             </button>
             <span className="text-white/20 mx-2 hidden md:inline">|</span>
             <button 
               onClick={() => setIsPrivacyOpen(true)}
               className="text-white hover:text-primary whitespace-nowrap ml-2 md:ml-0 cursor-pointer"
             >
               Privacy Policy
             </button>
           </div>
        </div>

        <div className="text-center pt-8 border-t border-white/5 text-xs text-muted-foreground/40 font-mono flex flex-col items-center">
            <div className="flex items-center mb-4">
               <span className="font-orbitron font-bold text-sm tracking-widest text-white">BASED GUARDIANS</span>
            </div>
            <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                OPERATIONAL ON BASED L1 ({CHAIN_ID})
                <span className="mx-2 text-white/20">|</span>
                <span className="text-green-500 font-bold">Data synced from IPFS</span>
            </div>
        </div>
      </div>

      {/* Terms Modal */}
      <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
        <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-4xl max-h-[85dvh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 border-b border-white/10 flex flex-row items-center justify-between">
                <div>
                    <DialogTitle className="text-2xl font-orbitron">TERMS OF SERVICE</DialogTitle>
                    <DialogDescription className="text-muted-foreground">Last Updated: December 12, 2025</DialogDescription>
                </div>
                {/* Close button is automatically added by DialogContent, but we can ensure standard X icon is there or styling matches */}
            </DialogHeader>
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-invert max-w-none space-y-6 text-sm md:text-base text-gray-300">
                    <p>
                        By accessing or using the Based Command App (the “App”), you agree to these Terms of Service. If you do not agree, do not use the App.
                    </p>
                    <p>
                        The App is operated by Based Guardians (the “Company,” “we,” “us,” or “our”). These Terms form a legal agreement between you and the Company.
                    </p>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">1. Nature of the App</h3>
                        <p>
                            The App is a non-custodial, decentralized user interface for interacting with the Based Guardians NFT collection on the BasedAI blockchain. It enables viewing of NFT metadata, community pool tracking, advisory voting, and marketplace features. The App is in beta and provided “as is” and “as available,” with no warranties.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">2. No Financial Advice</h3>
                        <p>
                            Nothing in the App constitutes financial, investment, or legal advice. All displayed values (including “backed by” estimates and emissions) are approximations and may be inaccurate. Cryptocurrency and NFT values are volatile. You may lose all invested value.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">3. Dependency on Third-Party Infrastructure</h3>
                        <p>
                            Certain features (including staking and full emissions) depend on the release and performance of Based Labs infrastructure. We make no guarantees regarding timelines, functionality, or availability of such infrastructure. Delays or changes by Based Labs may affect the App’s features.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">4. Advisory Voting</h3>
                        <p>
                            Voting is advisory only. Results do not bind any decisions. The admin retains full discretion over all project actions.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">5. Risk Acknowledgment</h3>
                        <p>
                            Use of blockchain applications involves significant risk. You are solely responsible for your wallet security, transactions, and compliance with applicable laws. We are not liable for lost funds, hacks, network failures, or regulatory actions.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">6. Limitation of Liability</h3>
                        <p>
                            To the fullest extent permitted by law, the Company, its affiliates, and contributors shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the App. Total liability is limited to $100 USD.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">7. Indemnification</h3>
                        <p>
                            You agree to indemnify and hold harmless the Company from any claims arising from your use of the App or violation of these Terms.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">8. Governing Law</h3>
                        <p>
                            These Terms are governed by the laws of the State of Oregon, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Oregon.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">9. Changes to Terms</h3>
                        <p>
                            We may update these Terms at any time. Continued use constitutes acceptance.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">10. Contact</h3>
                        <p>
                            For questions, contact us via X @based_guardians or Discord.
                        </p>
                    </section>

                    <p className="pt-4 border-t border-white/10 text-muted-foreground italic">
                        By using the App, you acknowledge these risks and agree to these Terms.
                    </p>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Modal */}
      <Dialog open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen}>
        <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-4xl max-h-[85dvh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 border-b border-white/10">
                <DialogTitle className="text-2xl font-orbitron">PRIVACY POLICY</DialogTitle>
                <DialogDescription className="text-muted-foreground">Effective Date: December 12, 2025</DialogDescription>
            </DialogHeader>
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-invert max-w-none space-y-6 text-sm md:text-base text-gray-300">
                    <p>
                        Based Command App (the "App") is a decentralized application (DApp) providing a user interface for interacting with the Based Guardians NFT collection on the BasedAI blockchain. We, Based Guardians (the "Company," "we," "us," or "our"), are committed to protecting your privacy while acknowledging the inherent risks of blockchain technology. This Privacy Policy explains our data practices and is governed by U.S. law (Delaware). By using the App, you consent to these practices.
                    </p>
                    
                    <p>
                        This policy is designed with caution, drawing from industry standards like OpenSea (which emphasizes non-custodial access and no data storage), Blur (focusing on public blockchain queries without personal tracking), and Magic Eden (highlighting wallet-only interactions with clear disclaimers on volatility). Like these platforms, we collect minimal data and disclaim liability for blockchain risks.
                    </p>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">1. Information We Collect</h3>
                        <p>
                            The App is fully non-custodial and does not collect, store, or process any personal data. We access only:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Public Blockchain Data</strong>: Your wallet address and on-chain information (e.g., NFT ownership, balances, transaction history) via public RPC providers (e.g., BasedAI nodes). This data is immutable and visible to anyone on the blockchain.</li>
                            <li><strong>No Personal Information</strong>: No emails, IP addresses, names, device IDs, or identifiable data is collected. No cookies or tracking pixels are used.</li>
                        </ul>
                        <p>
                            If you opt-in to optional features (e.g., Google Analytics via VITE_GA_ID), anonymized usage data (e.g., page views, without wallet association) may be shared with third parties for improvement purposes only.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">2. How We Use Information</h3>
                        <p>Public on-chain data is used solely to:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Display your NFT holdings, traits, rarity, and estimated values.</li>
                            <li>Enable voting, marketplace listings, and pool tracking.</li>
                            <li>Provide on-chain functionality (e.g., minting via Aftermint.trade links, offers, trades).</li>
                        </ul>
                        <p>
                            We do not use data for marketing, profiling, or sale. All interactions are read-only or wallet-signed; we never hold funds or keys. Like Blur's policy, we disclaim any responsibility for on-chain actions.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">3. Third-Party Services</h3>
                        <p>The App relies on external providers for core functionality:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Wallet Providers (e.g., MetaMask, Rabby, Trust): Their policies govern connections. We access only public data.</li>
                            <li>Blockchain Networks (BasedAI, ETH for subnet): Public explorers (e.g., explorer.bf1337.org, Etherscan) display all data.</li>
                            <li>Optional Analytics (Google Analytics): Anonymized aggregate data (no IP or wallet tracking) to optimize UX. You can opt-out via browser settings.</li>
                            <li>Embedding Services (Vimeo for videos): Their policies apply; we embed without tracking.</li>
                        </ul>
                        <p>
                            We do not share data with advertisers. If Based Labs infrastructure changes, features may be affected, but we disclaim liability for external dependencies (as in OpenSea's policy).
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">4. Data Security & Retention</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Security Measures</strong>: The App uses HTTPS, input sanitization (DOMPurify), and read-only blockchain queries. No data is stored on our servers.</li>
                            <li><strong>Retention</strong>: Public blockchain data is permanent; we retain no copies. Analytics data (if enabled) is aggregated and deleted after 14 months.</li>
                            <li><strong>Risks</strong>: Blockchain is public and irreversible. You are solely responsible for wallet security. We disclaim liability for hacks, losses, or third-party failures (e.g., RPC downtime).</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">5. Children's Privacy</h3>
                        <p>
                            The App is not intended for individuals under 18. We do not knowingly collect data from children. If we discover such data, it will be deleted immediately.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">6. Changes to This Policy</h3>
                        <p>
                            We may update this Privacy Policy. Continued use constitutes acceptance.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-white font-bold text-lg">7. Contact Us</h3>
                        <p>
                            For questions, contact us via X @based_guardians or Discord.
                        </p>
                    </section>

                    <p className="pt-4 border-t border-white/10 text-muted-foreground italic">
                        By using the App, you acknowledge these risks and agree to this Policy. We err on caution: No guarantees, no liability for blockchain volatility or external dependencies.
                    </p>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
