import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const visited = JSON.parse(localStorage.getItem('pagesVisited') || '[]');
    if (!visited.includes('privacy')) {
      visited.push('privacy');
      localStorage.setItem('pagesVisited', JSON.stringify(visited));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono selection:bg-primary selection:text-black">
      {/* Simple Header for this static page */}
      <div className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/")}
                className="text-muted-foreground hover:text-white mr-4"
            >
                <ArrowLeft size={16} className="mr-2" /> Back to App
            </Button>
            <h1 className="text-lg font-orbitron text-white">PRIVACY POLICY</h1>
        </div>
      </div>

      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-white font-orbitron">PRIVACY POLICY</h2>
                <p className="text-sm text-muted-foreground">Effective Date: December 12, 2025</p>
            </div>

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
                        For privacy questions, contact us via X @based_guardians or Discord.
                    </p>
                </section>

                <p className="pt-4 border-t border-white/10 text-muted-foreground italic">
                    By using the App, you acknowledge these risks and agree to this Policy. We err on caution: No guarantees, no liability for blockchain volatility or external dependencies.
                </p>
            </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
