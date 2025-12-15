/**
 * Governance Component - DAO Voting System
 */

import { useState, useEffect } from 'react';
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
  ChevronDown, ChevronUp, Loader2, AlertCircle, Shield
} from 'lucide-react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { PROPOSAL_CREATOR_WALLETS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Security } from '@/lib/security';
import {
  useGovernance,
  useProposal,
  ProposalStatus,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_COLORS,
  formatTimeRemaining,
  calculateVotePercentage,
  Proposal
} from '@/hooks/useGovernance';
import { MOCK_PROPOSALS } from '@/lib/mockData';

const CATEGORIES = ['Community', 'Treasury', 'Roadmap', 'Partnership', 'Other'];

export function Governance() {
  const { toast } = useToast();
  const { openConnectModal } = useConnectModal();
  const governance = useGovernance();
  const { checkRateLimit, isRateLimited } = useRateLimit({ minInterval: 3000, message: 'Please wait before submitting again' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Community');
  const [newDescription, setNewDescription] = useState('');
  const [newExpirationDays, setNewExpirationDays] = useState('7');
  const [expandedProposal, setExpandedProposal] = useState<number | null>(null);

  const isAllowedCreator = governance.isConnected && governance.address && 
    PROPOSAL_CREATOR_WALLETS.some(wallet => wallet.toLowerCase() === governance.address?.toLowerCase());

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
    
    try {
      await governance.createProposal(sanitizedTitle, sanitizedDesc, newCategory);
      toast({ title: 'Proposal Submitted', description: 'Your proposal is being created on-chain' });
      setNewTitle('');
      setNewDescription('');
      setShowCreateForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (governance.isSuccess) {
      governance.refetchCount();
      governance.refetchActive();
      governance.reset();
      toast({ title: 'Success', description: 'Transaction confirmed!' });
    }
  }, [governance.isSuccess]);

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
          <StatCard icon={<Vote className="w-5 h-5 text-white" />} label="Total Proposals" value={governance.proposalCount} />
          <StatCard icon={<Shield className="w-5 h-5 text-white" />} label="Min NFTs to Propose" value={governance.minNFTsToPropose} />
          <StatCard icon={<Users className="w-5 h-5 text-white" />} label="Quorum Required" value={`${governance.quorumPercentage}%`} />
          <StatCard icon={<Zap className="w-5 h-5 text-white" />} label="Your NFTs" value={governance.votingPower} />
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
            {isAllowedCreator && (
              <div className="mb-8">
                <Button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  disabled={!governance.canCreateProposal}
                  className="bg-primary text-black hover:bg-primary/90 font-orbitron"
                  data-testid="create-proposal-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  CREATE PROPOSAL
                </Button>
                {!governance.canCreateProposal && governance.isConnected && (
                  <p className="text-xs text-muted-foreground mt-2">
                    You need at least {governance.minNFTsToPropose} NFT(s) to create a proposal
                  </p>
                )}
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
                    <h3 className="text-lg font-bold text-white font-orbitron">New Proposal</h3>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">TITLE</Label>
                      <Input 
                        value={newTitle} 
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Enter proposal title..."
                        className="bg-black/50 border-white/10"
                        data-testid="proposal-title-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">CATEGORY</Label>
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger className="bg-black/50 border-white/10" data-testid="proposal-category-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/95 border-white/10">
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">DESCRIPTION</Label>
                      <Textarea 
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Describe your proposal..."
                        className="bg-black/50 border-white/10 min-h-[120px]"
                        data-testid="proposal-description-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">EXPIRATION PERIOD</Label>
                      <Select value={newExpirationDays} onValueChange={setNewExpirationDays}>
                        <SelectTrigger className="bg-black/50 border-white/10 text-white" data-testid="proposal-expiration-select">
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
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleCreateProposal}
                        disabled={governance.isPending || governance.isConfirming}
                        className="bg-primary text-black hover:bg-primary/90"
                        data-testid="submit-proposal-btn"
                      >
                        {(governance.isPending || governance.isConfirming) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Proposal
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateForm(false)} className="border-white/20 text-white hover:text-white/80">
                        Cancel
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white font-orbitron flex items-center gap-2">
                <Vote className="w-5 h-5 text-primary" /> PROPOSALS
              </h2>
              {MOCK_PROPOSALS.length === 0 ? (
                <Card className="p-8 bg-white/5 border-white/10 text-center">
                  <Vote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No proposals yet. Be the first to create one!</p>
                </Card>
              ) : (
                MOCK_PROPOSALS.map(proposal => (
                  <MockProposalCard 
                    key={proposal.id}
                    proposal={proposal}
                    isExpanded={expandedProposal === proposal.id}
                    onToggle={() => setExpandedProposal(expandedProposal === proposal.id ? null : proposal.id)}
                    onVote={governance.vote}
                    isPending={governance.isPending}
                    isConfirming={governance.isConfirming}
                    quorumPercentage={governance.quorumPercentage}
                  />
                ))
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
  proposalId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onVote: (id: number, support: boolean) => void;
  isPending: boolean;
  isConfirming: boolean;
  quorumPercentage: number;
}

function ProposalCard({ proposalId, isExpanded, onToggle, onVote, isPending, isConfirming, quorumPercentage }: ProposalCardProps) {
  const { proposal, isLoading, userVote, isActive, timeRemaining } = useProposal(proposalId);

  if (isLoading || !proposal) {
    return (
      <Card className="p-4 bg-white/5 border-white/10">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </Card>
    );
  }

  const voteStats = calculateVotePercentage(proposal.votesFor, proposal.votesAgainst);
  const status = proposal.status as ProposalStatus;

  return (
    <motion.div layout>
      <Card className="bg-white/5 border-white/10 overflow-hidden" data-testid={`proposal-card-${proposalId}`}>
        <div 
          className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold font-mono">
                #{proposalId}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs border-white/20">{proposal.category}</Badge>
                  <Badge variant="outline" className={`text-xs ${PROPOSAL_STATUS_COLORS[status]}`}>
                    {PROPOSAL_STATUS_LABELS[status]}
                  </Badge>
                </div>
                <h3 className="font-bold text-white">{proposal.title}</h3>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{Number(proposal.totalVoters)} voters</span>
                </div>
                {isActive && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeRemaining(timeRemaining)}</span>
                  </div>
                )}
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">{proposal.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> For: {voteStats.forPercent}%
                    </span>
                    <span className="text-red-400 flex items-center gap-1">
                      Against: {voteStats.againstPercent}% <XCircle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-green-500 transition-all"
                      style={{ width: `${voteStats.forPercent}%` }}
                    />
                    <div 
                      className="absolute right-0 top-0 h-full bg-red-500 transition-all"
                      style={{ width: `${voteStats.againstPercent}%` }}
                    />
                  </div>
                  <div className="text-xs text-center text-muted-foreground">
                    Total Votes: {voteStats.total}
                  </div>
                </div>

                {/* QUORUM PROGRESS INDICATOR */}
                {(() => {
                  const totalVotes = Number(proposal.votesFor) + Number(proposal.votesAgainst);
                  const MAX_SUPPLY = 3732;
                  const requiredVotes = Math.ceil(MAX_SUPPLY * (quorumPercentage / 100));
                  const quorumProgress = Math.min(100, (totalVotes / requiredVotes) * 100);
                  const quorumMet = totalVotes >= requiredVotes;
                  
                  return (
                    <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Quorum Progress
                        </span>
                        <span className={quorumMet ? 'text-green-400' : 'text-yellow-400'}>
                          {totalVotes} / {requiredVotes} votes ({quorumPercentage}% required)
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full ${quorumMet ? 'bg-green-500' : 'bg-yellow-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${quorumProgress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      {quorumMet ? (
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Quorum reached! Result will be binding.
                        </p>
                      ) : isActive && (
                        <p className="text-xs text-yellow-400 mt-1">
                          ⚠️ {requiredVotes - totalVotes} more votes needed to reach quorum
                        </p>
                      )}
                    </div>
                  );
                })()}

                {userVote?.hasVoted ? (
                  <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                    <span className="text-sm text-muted-foreground">
                      You voted <span className={userVote.support ? 'text-green-400' : 'text-red-400'}>
                        {userVote.support ? 'FOR' : 'AGAINST'}
                      </span> with {userVote.power} vote{userVote.power > 1 ? 's' : ''}
                    </span>
                  </div>
                ) : isActive ? (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => onVote(proposalId, true)}
                      disabled={isPending || isConfirming}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      data-testid={`vote-for-${proposalId}`}
                    >
                      {(isPending || isConfirming) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <CheckCircle2 className="w-4 h-4 mr-2" /> VOTE FOR
                    </Button>
                    <Button 
                      onClick={() => onVote(proposalId, false)}
                      disabled={isPending || isConfirming}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      data-testid={`vote-against-${proposalId}`}
                    >
                      {(isPending || isConfirming) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <XCircle className="w-4 h-4 mr-2" /> VOTE AGAINST
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-white/5 border border-white/10 text-center text-sm text-muted-foreground">
                    Voting has ended for this proposal
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// Mock Proposal Card for displaying MOCK_PROPOSALS
interface MockProposalCardProps {
  proposal: typeof MOCK_PROPOSALS[0];
  isExpanded: boolean;
  onToggle: () => void;
  onVote: (id: number, support: boolean) => void;
  isPending: boolean;
  isConfirming: boolean;
  quorumPercentage: number;
}

function MockProposalCard({ proposal, isExpanded, onToggle, onVote, isPending, isConfirming, quorumPercentage }: MockProposalCardProps) {
  const isActive = proposal.status === 'Active';
  const endTime = new Date(proposal.endTime);
  const now = new Date();
  const timeRemainingMs = endTime.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeRemainingMs / (1000 * 60 * 60 * 24)));
  
  // Calculate vote percentages
  const forVotes = proposal.options.find(o => o.id === 'yes' || o.id === 'spacecraft')?.votes || 0;
  const againstVotes = proposal.options.find(o => o.id === 'no' || o.id === 'planet')?.votes || 0;
  const totalVotes = proposal.totalVotes || (forVotes + againstVotes);
  const forPercent = totalVotes > 0 ? Math.round((forVotes / totalVotes) * 100) : 50;
  const againstPercent = totalVotes > 0 ? Math.round((againstVotes / totalVotes) * 100) : 50;

  const statusColors: Record<string, string> = {
    'Active': 'border-green-500 text-green-400',
    'Passed': 'border-blue-500 text-blue-400',
    'Rejected': 'border-red-500 text-red-400',
    'Executed': 'border-purple-500 text-purple-400'
  };

  return (
    <motion.div layout>
      <Card className="bg-white/5 border-white/10 overflow-hidden" data-testid={`proposal-card-${proposal.id}`}>
        <div 
          className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold font-mono">
                #{proposal.id}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs border-white/20">
                    {proposal.type === 'binary' ? 'Binary Vote' : 'Multiple Choice'}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${statusColors[proposal.status]}`}>
                    {proposal.status}
                  </Badge>
                </div>
                <h3 className="font-bold text-white text-sm md:text-base">{proposal.title}</h3>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{totalVotes} votes</span>
                </div>
                {isActive && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <Clock className="w-3 h-3" />
                    <span>{daysRemaining} days left</span>
                  </div>
                )}
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">{proposal.description}</p>
                
                {/* Vote Options */}
                <div className="space-y-2">
                  {proposal.options.map(option => {
                    const optionPercent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                    return (
                      <div key={option.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-white">{option.label}</span>
                          <span className="text-muted-foreground">{option.votes} votes ({optionPercent}%)</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${optionPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isActive ? (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => onVote(proposal.id, true)}
                      disabled={isPending || isConfirming}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      data-testid={`vote-for-${proposal.id}`}
                    >
                      {(isPending || isConfirming) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <CheckCircle2 className="w-4 h-4 mr-2" /> VOTE FOR
                    </Button>
                    <Button 
                      onClick={() => onVote(proposal.id, false)}
                      disabled={isPending || isConfirming}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      data-testid={`vote-against-${proposal.id}`}
                    >
                      {(isPending || isConfirming) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <XCircle className="w-4 h-4 mr-2" /> VOTE AGAINST
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-white/5 border border-white/10 text-center text-sm text-muted-foreground">
                    Voting has ended for this proposal
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default Governance;
