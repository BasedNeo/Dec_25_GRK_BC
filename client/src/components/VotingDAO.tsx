import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { MOCK_PROPOSALS, Proposal } from "@/lib/mockData";
import { Vote, Clock, Check, X, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

interface VotingDAOProps {
  isConnected: boolean; // Legacy
  onConnect: () => void; // Legacy
}

export function VotingDAO({ isConnected: _isConnected, onConnect: _onConnect }: VotingDAOProps) {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [showProposalForm, setShowProposalForm] = useState(false);
  const { toast } = useToast();

  // Mock Admin Check (In real app, check owner() on contract)
  // For demo, we treat specific address or just anyone connected as "admin" if enabled
  const isAdmin = true; 

  const handlePropose = (e: React.FormEvent) => {
    e.preventDefault();
    setShowProposalForm(false);
    toast({
      title: "Proposal Submitted",
      description: "Your initiative has been broadcast to the DAO for review.",
      className: "bg-black border-primary text-primary font-orbitron",
    });
  };

  return (
    <section id="voting" className="py-20 bg-black relative">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end">
          <div>
            <Badge variant="outline" className="mb-2 border-accent/50 text-accent font-mono">GOVERNANCE</Badge>
            <h2 className="text-3xl md:text-4xl text-white mb-4">COUNCIL <span className="text-accent">DECISIONS</span></h2>
            <p className="text-muted-foreground font-rajdhani max-w-2xl">
              Shape the future of the Based Guardians. 1 NFT = 1 Vote. Proposals are binding.
            </p>
          </div>
          
          {isConnected && isAdmin && !showProposalForm && (
            <Button 
              onClick={() => setShowProposalForm(true)}
              className="mt-4 md:mt-0 bg-accent text-white hover:bg-accent/80 font-orbitron"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> NEW PROPOSAL
            </Button>
          )}
        </div>

        {showProposalForm && (
           <Card className="mb-12 p-6 bg-card border-accent/50 animate-in fade-in slide-in-from-top-4">
             <h3 className="text-xl font-orbitron text-white mb-6">NEW INITIATIVE</h3>
             <form onSubmit={handlePropose} className="space-y-4">
               <div>
                 <label className="text-xs font-mono text-muted-foreground mb-1 block">TITLE</label>
                 <Input placeholder="Enter proposal title..." className="bg-black/50 border-white/10 text-white" required />
               </div>
               <div>
                 <label className="text-xs font-mono text-muted-foreground mb-1 block">DESCRIPTION</label>
                 <Textarea placeholder="Describe the initiative and funding required..." className="bg-black/50 border-white/10 text-white min-h-[100px]" required />
               </div>
               <div className="flex gap-4 pt-2">
                 <Button type="submit" className="bg-primary text-black hover:bg-primary/90">SUBMIT ON-CHAIN</Button>
                 <Button type="button" variant="ghost" onClick={() => setShowProposalForm(false)} className="text-muted-foreground">CANCEL</Button>
               </div>
             </form>
           </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {MOCK_PROPOSALS.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} isConnected={isConnected} onConnect={openConnectModal} />
            ))}
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-card border-white/10">
              <h3 className="font-orbitron text-lg text-white mb-4">YOUR VOTING POWER</h3>
              {isConnected ? (
                <div className="text-center py-8">
                  <div className="text-5xl font-black text-primary mb-2 text-glow">4</div>
                  <div className="text-sm text-muted-foreground">VOTES AVAILABLE</div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Button onClick={openConnectModal} variant="outline" className="border-white/20 hover:border-primary text-white">
                    Connect to Check
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-6 bg-card border-white/10 bg-gradient-to-br from-card to-accent/5">
              <h3 className="font-orbitron text-lg text-white mb-4">DELEGATION</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Delegate your voting power to a community representative if you cannot participate directly.
              </p>
              <Button disabled={!isConnected} variant="outline" className="w-full border-white/10 text-muted-foreground hover:text-white hover:border-white/30">
                MANAGE DELEGATES
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProposalCard({ proposal, isConnected, onConnect }: { proposal: Proposal, isConnected: boolean, onConnect: (() => void) | undefined }) {
  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const percentFor = (proposal.votesFor / totalVotes) * 100;
  const percentAgainst = (proposal.votesAgainst / totalVotes) * 100;
  const { toast } = useToast();

  const handleVote = (type: 'For' | 'Against') => {
    toast({
      title: "Vote Cast",
      description: `You successfully voted ${type} on Proposal #${proposal.id}`,
      className: "bg-black border-accent text-accent font-orbitron",
    });
  };

  return (
    <Card className="p-6 bg-card border-white/10 hover:border-accent/30 transition-all">
      <div className="flex justify-between items-start mb-4">
        <Badge variant="outline" className={`
          ${proposal.status === 'Active' ? 'border-green-500 text-green-500' : ''}
          ${proposal.status === 'Passed' ? 'border-primary text-primary' : ''}
          ${proposal.status === 'Rejected' ? 'border-red-500 text-red-500' : ''}
        `}>
          {proposal.status}
        </Badge>
        <div className="text-xs text-muted-foreground flex items-center">
          <Clock size={12} className="mr-1" /> Ends {new Date(proposal.endTime).toLocaleDateString()}
        </div>
      </div>

      <h3 className="text-xl font-orbitron text-white mb-2">{proposal.title}</h3>
      <p className="text-muted-foreground mb-6 text-sm">{proposal.description}</p>

      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white">For</span>
            <span className="text-white">{Math.round(percentFor)}%</span>
          </div>
          <Progress value={percentFor} className="h-1 bg-white/10" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white">Against</span>
            <span className="text-white">{Math.round(percentAgainst)}%</span>
          </div>
          <Progress value={percentAgainst} className="h-1 bg-white/10" /> 
        </div>
      </div>

      {proposal.status === 'Active' && (
        <div className="flex gap-3">
          {isConnected ? (
            <>
              <Button onClick={() => handleVote('For')} size="sm" className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/50">
                <Check size={16} className="mr-2" /> VOTE FOR
              </Button>
              <Button onClick={() => handleVote('Against')} size="sm" className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50">
                <X size={16} className="mr-2" /> VOTE AGAINST
              </Button>
            </>
          ) : (
            <Button onClick={onConnect} variant="outline" size="sm" className="w-full">
              Connect to Vote
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
