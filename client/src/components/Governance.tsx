/**
 * Governance Component - DAO Voting System
 * Binary for/against voting with admin proposal creation
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Vote, Plus, Clock, CheckCircle2, XCircle, Users, Zap, 
  Loader2, AlertCircle, Shield, Trash2, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useToast } from '@/hooks/use-toast';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Security } from '@/lib/security';
import { useGovernance } from '@/hooks/useGovernance';
import { useProposals, useUserVote, useProposalMutations, Proposal } from '@/hooks/useProposals';

const CATEGORIES = ['Community', 'Treasury', 'Roadmap', 'Partnership', 'General'];

export function Governance() {
  const { toast } = useToast();
  const { openConnectModal } = useConnectModal();
  const governance = useGovernance();
  const { checkRateLimit } = useRateLimit({ minInterval: 3000, message: 'Please wait before submitting again' });
  const { isAdmin, createProposal, deleteProposal, castVote } = useProposalMutations();
  
  const { data: proposals, isLoading: loadingProposals } = useProposals();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newDescription, setNewDescription] = useState('');
  const [newDurationDays, setNewDurationDays] = useState('7');
  const [newQuorum, setNewQuorum] = useState('10');
  
  const [deleteConfirmState, setDeleteConfirmState] = useState<{ id: string; step: number } | null>(null);

  const handleCreateProposal = async () => {
    if (!checkRateLimit()) return;
    
    const titleValidation = Security.validateProposalTitle(newTitle);
    if (!titleValidation.valid) {
      toast({ title: 'Invalid Title', description: titleValidation.error, variant: 'destructive' });
      return;
    }
    
    const descValidation = Security.validateProposalDescription(newDescription);
    if (!descValidation.valid) {
      toast({ title: 'Invalid Description', description: descValidation.error, variant: 'destructive' });
      return;
    }
    
    const sanitizedTitle = Security.sanitizeProposalInput(newTitle);
    const sanitizedDesc = Security.sanitizeProposalInput(newDescription);
    
    createProposal.mutate({
      title: sanitizedTitle,
      description: sanitizedDesc,
      category: newCategory,
      durationDays: parseInt(newDurationDays),
      requiredQuorum: parseInt(newQuorum),
    }, {
      onSuccess: () => {
        setNewTitle('');
        setNewDescription('');
        setNewDurationDays('7');
        setNewQuorum('10');
        setShowCreateForm(false);
      }
    });
  };

  const handleDeleteClick = (id: string) => {
    if (!deleteConfirmState || deleteConfirmState.id !== id) {
      setDeleteConfirmState({ id, step: 1 });
    } else if (deleteConfirmState.step === 1) {
      setDeleteConfirmState({ id, step: 2 });
    } else if (deleteConfirmState.step === 2) {
      setDeleteConfirmState({ id, step: 3 });
    } else if (deleteConfirmState.step === 3) {
      deleteProposal.mutate(id, {
        onSuccess: () => setDeleteConfirmState(null),
      });
    }
  };

  const getDeleteButtonText = (id: string) => {
    if (deleteConfirmState?.id === id) {
      switch (deleteConfirmState.step) {
        case 1: return 'Confirm?';
        case 2: return 'Really?';
        case 3: return 'DELETE';
        default: return 'Delete';
      }
    }
    return 'Delete';
  };

  const getDeleteButtonClass = (id: string) => {
    if (deleteConfirmState?.id === id) {
      switch (deleteConfirmState.step) {
        case 1: return 'bg-orange-600 hover:bg-orange-700';
        case 2: return 'bg-red-600 hover:bg-red-700 animate-pulse';
        case 3: return 'bg-red-700 hover:bg-red-800 shadow-[0_0_15px_rgba(255,0,0,0.5)]';
        default: return '';
      }
    }
    return '';
  };

  return (
    <section className="py-8 min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white font-orbitron">GUARDIAN GOVERNANCE</h1>
              <p className="text-sm text-muted-foreground font-mono">
                1 NFT = 1 Vote • Shape the future of Based Guardians
              </p>
            </div>
          </div>
          {governance.isConnected && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono text-white">Voting Power: <span className="text-primary font-bold">{governance.votingPower}</span></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Vote className="w-5 h-5 text-white" />} label="Active Proposals" value={proposals?.length || 0} />
          <StatCard icon={<Users className="w-5 h-5 text-white" />} label="Quorum Required" value={`${governance.quorumPercentage}%`} />
          <StatCard icon={<Zap className="w-5 h-5 text-white" />} label="Your NFTs" value={governance.votingPower} />
          <StatCard icon={<CheckCircle2 className="w-5 h-5 text-white" />} label="Status" value={governance.isConnected ? 'Active' : 'Connect'} />
        </div>

        {!governance.isConnected ? (
          <Card className="p-8 bg-white/5 border-white/10 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Connect your wallet to participate in governance</p>
            <Button onClick={openConnectModal} className="bg-primary hover:bg-primary/90 font-orbitron text-[#35bdb2]">
              CONNECT WALLET
            </Button>
          </Card>
        ) : (
          <>
            {isAdmin && (
              <div className="mb-8">
                <Button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-cyan-500 text-white hover:bg-cyan-400 font-orbitron shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                  data-testid="create-proposal-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  CREATE PROPOSAL
                </Button>
              </div>
            )}

            <AnimatePresence>
              {showCreateForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-8"
                >
                  <Card className="p-6 bg-white/5 border-white/10 space-y-4">
                    <h3 className="text-lg font-bold text-white font-orbitron flex items-center gap-2">
                      <Plus className="w-5 h-5 text-cyan-400" />
                      New Proposal
                    </h3>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Create a binary (For/Against) proposal for the community to vote on.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">TITLE (min 10 chars)</Label>
                        <Input 
                          value={newTitle} 
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Enter proposal title..."
                          className="bg-black/50 border-white/10 text-base h-12"
                          data-testid="proposal-title-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">CATEGORY</Label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger className="bg-black/50 border-white/10 h-12" data-testid="proposal-category-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/95 border-white/10">
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">DESCRIPTION (min 50 chars)</Label>
                      <Textarea 
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Describe your proposal in detail..."
                        className="bg-black/50 border-white/10 min-h-[120px] text-base"
                        data-testid="proposal-description-input"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">VOTING PERIOD (days)</Label>
                        <Select value={newDurationDays} onValueChange={setNewDurationDays}>
                          <SelectTrigger className="bg-black/50 border-white/10 text-white h-12" data-testid="proposal-duration-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/95 border-white/10">
                            <SelectItem value="3">3 Days</SelectItem>
                            <SelectItem value="7">7 Days</SelectItem>
                            <SelectItem value="14">14 Days</SelectItem>
                            <SelectItem value="21">21 Days</SelectItem>
                            <SelectItem value="30">30 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">QUORUM (%)</Label>
                        <Select value={newQuorum} onValueChange={setNewQuorum}>
                          <SelectTrigger className="bg-black/50 border-white/10 text-white h-12" data-testid="proposal-quorum-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/95 border-white/10">
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="15">15%</SelectItem>
                            <SelectItem value="20">20%</SelectItem>
                            <SelectItem value="25">25%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleCreateProposal}
                        disabled={createProposal.isPending}
                        className="bg-cyan-500 text-white hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.5)] h-12"
                        data-testid="submit-proposal-btn"
                      >
                        {createProposal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Proposal
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateForm(false)} className="border-white/20 text-white hover:text-white/80 h-12">
                        Cancel
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white font-orbitron flex items-center gap-2">
                <Vote className="w-5 h-5 text-cyan-400" /> ACTIVE PROPOSALS
                <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400 ml-2">
                  For / Against Voting
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground -mt-2 mb-4">
                Vote on community proposals. Your vote is weighted by your NFT holdings (1 NFT = 1 vote).
              </p>
              
              {loadingProposals ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Card key={i} className="p-4 bg-white/5 border-white/10">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : proposals && proposals.length > 0 ? (
                proposals.map(proposal => (
                  <ProposalCard 
                    key={proposal.id}
                    proposal={proposal}
                    isExpanded={expandedProposal === proposal.id}
                    onToggle={() => setExpandedProposal(expandedProposal === proposal.id ? null : proposal.id)}
                    votingPower={governance.votingPower}
                    isAdmin={isAdmin ?? false}
                    onDelete={() => handleDeleteClick(proposal.id)}
                    deleteButtonText={getDeleteButtonText(proposal.id)}
                    deleteButtonClass={getDeleteButtonClass(proposal.id)}
                    isDeleting={deleteProposal.isPending}
                  />
                ))
              ) : (
                <Card className="p-8 bg-white/5 border-white/10 text-center">
                  <Vote className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No active proposals at the moment</p>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Create a new proposal to get started
                    </p>
                  )}
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground font-mono uppercase">{label}</span>
      </div>
      <div className="text-2xl font-bold font-orbitron text-white">{value}</div>
    </Card>
  );
}

interface ProposalCardProps {
  proposal: Proposal;
  isExpanded: boolean;
  onToggle: () => void;
  votingPower: number;
  isAdmin: boolean;
  onDelete: () => void;
  deleteButtonText: string;
  deleteButtonClass: string;
  isDeleting: boolean;
}

function ProposalCard({ proposal, isExpanded, onToggle, votingPower, isAdmin, onDelete, deleteButtonText, deleteButtonClass, isDeleting }: ProposalCardProps) {
  const { toast } = useToast();
  const governance = useGovernance();
  const walletAddress = governance.address;
  const { data: userVoteData } = useUserVote(proposal.id, walletAddress);
  const { castVote } = useProposalMutations();

  const userVote = userVoteData?.vote;
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? Math.round((proposal.votesFor / totalVotes) * 100) : 50;
  const againstPercentage = totalVotes > 0 ? Math.round((proposal.votesAgainst / totalVotes) * 100) : 50;

  const endDate = new Date(proposal.endDate);
  const now = new Date();
  const isExpired = now > endDate;
  const timeRemaining = formatTimeRemaining(endDate);

  const handleVote = (vote: 'for' | 'against') => {
    if (!walletAddress) {
      toast({ title: 'Connect Wallet', description: 'Please connect your wallet to vote', variant: 'destructive' });
      return;
    }
    if (votingPower < 1) {
      toast({ title: 'No Voting Power', description: 'You need at least 1 NFT to vote', variant: 'destructive' });
      return;
    }
    
    castVote.mutate({
      proposalId: proposal.id,
      vote,
      votingPower: Math.max(1, votingPower),
    });
  };

  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={onToggle}
        data-testid={`proposal-card-${proposal.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs border-white/20">{proposal.category || 'General'}</Badge>
              {isExpired ? (
                <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">Ended</Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">Active</Badge>
              )}
              {userVote && (
                <Badge variant="outline" className={`text-xs ${userVote === 'for' ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}`}>
                  Voted {userVote === 'for' ? 'For' : 'Against'}
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-white mb-1">{proposal.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{proposal.description}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="flex items-center gap-1 justify-end mb-1">
              <Clock className="w-3 h-3" />
              <span>{timeRemaining}</span>
            </div>
            <div>{totalVotes} votes</div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-green-400">For: {proposal.votesFor} ({forPercentage}%)</span>
            <span className="text-red-400">Against: {proposal.votesAgainst} ({againstPercentage}%)</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500 transition-all duration-500" 
              style={{ width: `${forPercentage}%` }}
            />
            <div 
              className="bg-red-500 transition-all duration-500" 
              style={{ width: `${againstPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">{proposal.description}</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span>Proposer: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</span>
                  <span>Quorum: {proposal.requiredQuorum || 10}%</span>
                  <span>Created: {new Date(proposal.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {!isExpired && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleVote('for')}
                    disabled={castVote.isPending || votingPower < 1}
                    className={`flex-1 h-12 ${userVote === 'for' ? 'bg-green-600' : 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30'}`}
                    data-testid={`vote-for-${proposal.id}`}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Vote For
                    {votingPower > 0 && <span className="ml-2 text-xs opacity-70">(+{votingPower})</span>}
                  </Button>
                  <Button
                    onClick={() => handleVote('against')}
                    disabled={castVote.isPending || votingPower < 1}
                    className={`flex-1 h-12 ${userVote === 'against' ? 'bg-red-600' : 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'}`}
                    data-testid={`vote-against-${proposal.id}`}
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Vote Against
                    {votingPower > 0 && <span className="ml-2 text-xs opacity-70">(+{votingPower})</span>}
                  </Button>
                </div>
              )}

              {isAdmin && (
                <div className="pt-2 border-t border-white/10">
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={onDelete}
                    disabled={isDeleting}
                    className={deleteButtonClass}
                    data-testid={`delete-${proposal.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {deleteButtonText}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function formatTimeRemaining(endDate: Date): string {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
}
