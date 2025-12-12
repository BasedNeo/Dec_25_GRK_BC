import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

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
            <h1 className="text-lg font-orbitron text-white">TERMS OF SERVICE</h1>
        </div>
      </div>

      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-white font-orbitron">TERMS OF SERVICE</h2>
                <p className="text-sm text-muted-foreground">Last Updated: December 12, 2025</p>
            </div>

            <div className="prose prose-invert max-w-none space-y-6 text-sm md:text-base text-gray-300">
                <p>
                    By accessing or using the Based Command App (the “App”), you agree to these Terms of Service. If you do not agree, do not use the App.
                </p>

                <section className="space-y-2">
                    <h3 className="text-white font-bold text-lg">1. Nature of the App</h3>
                    <p>
                        The App is a user interface for interacting with the Based Guardians NFT collection on the BasedAI blockchain. It provides viewing of NFT metadata, community pool tracking, advisory voting, and marketplace features. The App is in beta and provided “as is” and “as available.”
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
                        These Terms are governed by the laws of Delaware, without regard to conflict of law principles.
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
      </main>

      <Footer />
    </div>
  );
}
