import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOCK_PROPOSALS, Proposal } from "@/lib/mockData";
import { Vote, Clock, Check, X, PlusCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useGuardians } from "@/hooks/useGuardians";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface VotingDAOProps {
  isConnected: boolean; // Legacy
  onConnect: () => void; // Legacy
}

export function VotingDAO({ isConnected: _isConnected, onConnect: _onConnect }: VotingDAOProps) {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [showProposalForm, setShowProposalForm] = useState(false);
  const { toast } = useToast();
  const { data: guardians } = useGuardians();
  const queryClient = useQueryClient();

  const votePower = guardians?.length || 0;

  // Real Admin Check
  const adminWallet = import.meta.env.VITE_ADMIN_WALLET;
  const isAdmin = isConnected && address && adminWallet && address.toLowerCase() === adminWallet.toLowerCase();

  // Mock Proposal Fetching with React Query
  const { data: proposals } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      // In a real app, this would fetch from backend/contract
      return MOCK_PROPOSALS;
    },
    initialData: MOCK_PROPOSALS
  });

  const handlePropose = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newProposal: Proposal = {
      id: (proposals?.length || 0) + 1,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as 'binary' | 'multiple',
      options: formData.get('type') === 'binary' 
        ? [
            { id: 'yes', label: 'For', votes: 0 },
            { id: 'no', label: 'Against', votes: 0 },
            { id: 'abstain', label: 'Abstain', votes: 0 }
          ]
        : [
            { id: 'a', label: formData.get('optionA') as string, votes: 0 },
            { id: 'b', label: formData.get('optionB') as string, votes: 0 },
            { id: 'c', label: formData.get('optionC') as string, votes: 0 },
            { id: 'd', label: formData.get('optionD') as string, votes: 0 },
          ].filter(o => o.label), // Filter out empty options
      status: 'Active',
      endTime: new Date(formData.get('endTime') as string).toISOString(),
      totalVotes: 0
    };

    // Update Cache (Optimistic)
    queryClient.setQueryData(['proposals'], (old: Proposal[] = []) => [newProposal, ...old]);

    setShowProposalForm(false);
    toast({
      title: "Proposal Created",
      description: "Your initiative is now live for voting.",
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
          
          {isAdmin && !showProposalForm && (
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
                 <Input name="title" placeholder="Enter proposal title..." className="bg-black/50 border-white/10 text-white" required />
               </div>
               <div>
                 <label className="text-xs font-mono text-muted-foreground mb-1 block">DESCRIPTION</label>
                 <Textarea name="description" placeholder="Describe the initiative and funding required..." className="bg-black/50 border-white/10 text-white min-h-[100px]" required />
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-mono text-muted-foreground mb-1 block">TYPE</label>
                   <Select name="type" defaultValue="binary">
                     <SelectTrigger className="bg-black/50 border-white/10 text-white">
                       <SelectValue placeholder="Select Type" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="binary">Yes/No/Abstain</SelectItem>
                       <SelectItem value="multiple">Multiple Choice (A/B/C/D)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div>
                   <label className="text-xs font-mono text-muted-foreground mb-1 block">END TIME</label>
                   <Input name="endTime" type="datetime-local" className="bg-black/50 border-white/10 text-white" required />
                 </div>
               </div>

               {/* Conditional Options inputs could go here for Multiple Choice, simplifying for prototype */}
               
               <div className="flex gap-4 pt-4">
                 <Button type="submit" className="bg-primary text-black hover:bg-primary/90">SUBMIT ON-CHAIN</Button>
                 <Button type="button" variant="ghost" onClick={() => setShowProposalForm(false)} className="text-muted-foreground">CANCEL</Button>
               </div>
             </form>
           </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {proposals?.map((proposal) => (
              <ProposalCard 
                key={proposal.id} 
                proposal={proposal} 
                isConnected={isConnected} 
                onConnect={openConnectModal}
                votePower={votePower}
              />
            ))}
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-card border-white/10">
              <h3 className="font-orbitron text-lg text-white mb-4">YOUR VOTING POWER</h3>
              {isConnected ? (
                <div className="text-center py-8">
                  <div className="text-5xl font-black text-primary mb-2 text-glow">{votePower}</div>
                  <div className="text-sm text-muted-foreground">VOTES AVAILABLE</div>
                  <p className="text-xs text-muted-foreground mt-2">(1 Guardian = 1 Vote)</p>
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

function ProposalCard({ proposal, isConnected, onConnect, votePower }: { proposal: Proposal, isConnected: boolean, onConnect: (() => void) | undefined, votePower: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(proposal.endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft("EXPIRED");
        clearInterval(timer);
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(`${days}d ${hours}h left`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [proposal.endTime]);

  const handleVote = (optionId: string) => {
    if (votePower === 0) {
      toast({
        title: "No Voting Power",
        description: "You need to own at least one Guardian to vote.",
        variant: "destructive"
      });
      return;
    }

    // Optimistic Update
    queryClient.setQueryData(['proposals'], (old: Proposal[] = []) => {
      return old.map(p => {
        if (p.id === proposal.id) {
          const newOptions = p.options.map(o => 
            o.id === optionId ? { ...o, votes: o.votes + votePower } : o
          );
          return {
            ...p,
            options: newOptions,
            totalVotes: p.totalVotes + votePower
          };
        }
        return p;
      });
    });

    toast({
      title: "Vote Cast Successfully",
      description: `You cast ${votePower} votes for option: ${proposal.options.find(o => o.id === optionId)?.label}`,
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
          <Clock size={12} className="mr-1" /> 
          {timeLeft || "Calculating..."}
        </div>
      </div>

      <h3 className="text-xl font-orbitron text-white mb-2">{proposal.title}</h3>
      <p className="text-muted-foreground mb-6 text-sm">{proposal.description}</p>

      <div className="space-y-4 mb-6">
        {proposal.options.map(option => {
          const percentage = proposal.totalVotes > 0 ? (option.votes / proposal.totalVotes) * 100 : 0;
          return (
            <div key={option.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white">{option.label}</span>
                <span className="text-white">{Math.round(percentage)}% ({option.votes})</span>
              </div>
              <Progress value={percentage} className="h-1 bg-white/10" />
            </div>
          );
        })}
      </div>

      {proposal.status === 'Active' && timeLeft !== "EXPIRED" && (
        <div className="grid grid-cols-2 gap-3">
          {isConnected ? (
            proposal.options.map(option => (
              <Button 
                key={option.id}
                onClick={() => handleVote(option.id)} 
                size="sm" 
                variant="outline"
                className="border-white/10 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                {option.label}
              </Button>
            ))
          ) : (
            <Button onClick={onConnect} variant="outline" size="sm" className="col-span-2 w-full">
              Connect to Vote
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
