/**
 * Governance Component - DAO Voting System
 * Off-chain proposal system with admin creation, review workflow, and multi-choice voting
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
import { 
  Vote, Plus, Clock, CheckCircle2, XCircle, Users, Zap, 
  ChevronDown, ChevronUp, Loader2, AlertCircle, Shield, Eye, Trash2, Check
} from 'lucide-react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useToast } from '@/hooks/use-toast';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Security } from '@/lib/security';
import { useGovernance, formatTimeRemaining } from '@/hooks/useGovernance';
import { useProposals, useProposalVotes, useProposalMutations, OffchainProposal } from '@/hooks/useProposals';

const CATEGORIES = ['Community', 'Treasury', 'Roadmap', 'Partnership', 'Other'];

export function Governance() {
  const { toast } = useToast();
  const { openConnectModal } = useConnectModal();
  const governance = useGovernance();
  const { checkRateLimit } = useRateLimit({ minInterval: 3000, message: 'Please wait before submitting again' });
  const { isAdmin, createProposal, updateStatus, deleteProposal, castVote } = useProposalMutations();
  
  const { data: activeProposals, isLoading: loadingActive } = useProposals('active');
  const { data: reviewProposals, isLoading: loadingReview } = useProposals('review');
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Community');
  const [newDescription, setNewDescription] = useState('');
  const [newExpirationDays, setNewExpirationDays] = useState('7');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');

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

    if (!optionA.trim() || !optionB.trim()) {
      toast({ title: 'Missing Options', description: 'At least Option A and Option B are required', variant: 'destructive' });
      return;
    }
    
    const sanitizedTitle = Security.sanitizeProposalInput(newTitle);
    const sanitizedDesc = Security.sanitizeProposalInput(newDescription);
    
    createProposal.mutate({
      title: sanitizedTitle,
      description: sanitizedDesc,
      category: newCategory,
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim() || null,
      optionD: optionD.trim() || null,
      expirationDays: parseInt(newExpirationDays),
    }, {
      onSuccess: () => {
        setNewTitle('');
        setNewDescription('');
        setOptionA('');
        setOptionB('');
        setOptionC('');
        setOptionD('');
        setShowCreateForm(false);
      }
    });
  };

  const handleApprove = (id: string) => {
    updateStatus.mutate({ id, status: 'active' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this proposal?')) {
      deleteProposal.mutate(id);
    }
  };

  const handleCloseProposal = (id: string) => {
    updateStatus.mutate({ id, status: 'closed' });
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
          <StatCard icon={<Vote className="w-5 h-5 text-white" />} label="Active Proposals" value={activeProposals?.length || 0} />
          <StatCard icon={<Eye className="w-5 h-5 text-white" />} label="In Review" value={reviewProposals?.length || 0} />
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
                      New Proposal (Off-Chain)
                    </h3>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Create a gasless proposal. It will go to review first before becoming active.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">TITLE</Label>
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
                      <Label className="text-xs text-muted-foreground font-mono">DESCRIPTION</Label>
                      <Textarea 
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Describe your proposal..."
                        className="bg-black/50 border-white/10 min-h-[100px] text-base"
                        data-testid="proposal-description-input"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">OPTION A (Required)</Label>
                        <Input 
                          value={optionA} 
                          onChange={(e) => setOptionA(e.target.value)}
                          placeholder="e.g., Yes / Approve / Option 1"
                          className="bg-black/50 border-white/10 text-base h-12 border-green-500/30"
                          data-testid="proposal-option-a"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">OPTION B (Required)</Label>
                        <Input 
                          value={optionB} 
                          onChange={(e) => setOptionB(e.target.value)}
                          placeholder="e.g., No / Reject / Option 2"
                          className="bg-black/50 border-white/10 text-base h-12 border-red-500/30"
                          data-testid="proposal-option-b"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">OPTION C (Optional)</Label>
                        <Input 
                          value={optionC} 
                          onChange={(e) => setOptionC(e.target.value)}
                          placeholder="e.g., Abstain / Alternative"
                          className="bg-black/50 border-white/10 text-base h-12 border-yellow-500/30"
                          data-testid="proposal-option-c"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">OPTION D (Optional)</Label>
                        <Input 
                          value={optionD} 
                          onChange={(e) => setOptionD(e.target.value)}
                          placeholder="e.g., Defer / Other"
                          className="bg-black/50 border-white/10 text-base h-12 border-purple-500/30"
                          data-testid="proposal-option-d"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">VOTING PERIOD</Label>
                      <Select value={newExpirationDays} onValueChange={setNewExpirationDays}>
                        <SelectTrigger className="bg-black/50 border-white/10 text-white h-12" data-testid="proposal-expiration-select">
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
                        disabled={createProposal.isPending}
                        className="bg-cyan-500 text-white hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.5)] h-12"
                        data-testid="submit-proposal-btn"
                      >
                        {createProposal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit for Review
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateForm(false)} className="border-white/20 text-white hover:text-white/80 h-12">
                        Cancel
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {isAdmin && reviewProposals && reviewProposals.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white font-orbitron flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-yellow-400" /> PENDING REVIEW
                  <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400 ml-2">
                    {reviewProposals.length} Proposals
                  </Badge>
                </h2>
                <div className="space-y-3">
                  {reviewProposals.map(proposal => (
                    <Card key={proposal.id} className="p-4 bg-yellow-500/5 border-yellow-500/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs border-white/20">{proposal.category}</Badge>
                            <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">Review</Badge>
                          </div>
                          <h3 className="font-bold text-white mb-1">{proposal.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{proposal.description}</p>
                          <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="text-green-400">A: {proposal.optionA}</span>
                            <span className="text-red-400">B: {proposal.optionB}</span>
                            {proposal.optionC && <span className="text-yellow-400">C: {proposal.optionC}</span>}
                            {proposal.optionD && <span className="text-purple-400">D: {proposal.optionD}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(proposal.id)}
                            disabled={updateStatus.isPending}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`approve-${proposal.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDelete(proposal.id)}
                            disabled={deleteProposal.isPending}
                            data-testid={`delete-${proposal.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white font-orbitron flex items-center gap-2">
                <Vote className="w-5 h-5 text-cyan-400" /> ACTIVE PROPOSALS
                <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400 ml-2">
                  Off-Chain Voting
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground -mt-2 mb-4">
                Vote on community proposals. Your vote is weighted by your NFT holdings (1 NFT = 1 vote).
              </p>
              
              {loadingActive ? (
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
              ) : activeProposals && activeProposals.length > 0 ? (
                activeProposals.map(proposal => (
                  <OffchainProposalCard 
                    key={proposal.id}
                    proposal={proposal}
                    isExpanded={expandedProposal === proposal.id}
                    onToggle={() => setExpandedProposal(expandedProposal === proposal.id ? null : proposal.id)}
                    votingPower={governance.votingPower}
                    isAdmin={isAdmin}
                    onClose={() => handleCloseProposal(proposal.id)}
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

interface OffchainProposalCardProps {
  proposal: OffchainProposal;
  isExpanded: boolean;
  onToggle: () => void;
  votingPower: number;
  isAdmin: boolean;
  onClose: () => void;
}

function OffchainProposalCard({ proposal, isExpanded, onToggle, votingPower, isAdmin, onClose }: OffchainProposalCardProps) {
  const { toast } = useToast();
  const { address } = useGovernance();
  const { data: votesData, isLoading: loadingVotes } = useProposalVotes(proposal.id, address);
  const { castVote } = useProposalMutations();

  const userVote = votesData?.userVote;
  const tallies = votesData?.tallies || [];
  
  const options = [
    { key: 'A', label: proposal.optionA, color: 'green' },
    { key: 'B', label: proposal.optionB, color: 'red' },
    ...(proposal.optionC ? [{ key: 'C', label: proposal.optionC, color: 'yellow' }] : []),
    ...(proposal.optionD ? [{ key: 'D', label: proposal.optionD, color: 'purple' }] : []),
  ];

  const totalPower = tallies.reduce((sum, t) => sum + t.power, 0);
  const totalVoters = tallies.reduce((sum, t) => sum + t.votes, 0);

  const getVotePower = (optionKey: string) => {
    const tally = tallies.find(t => t.option === optionKey);
    return tally?.power || 0;
  };

  const getPercentage = (optionKey: string) => {
    if (totalPower === 0) return 0;
    return Math.round((getVotePower(optionKey) / totalPower) * 100);
  };

  const handleVote = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (!address) {
      toast({ title: 'Connect Wallet', description: 'Please connect your wallet to vote', variant: 'destructive' });
      return;
    }
    if (votingPower < 1) {
      toast({ title: 'No Voting Power', description: 'You need at least 1 NFT to vote', variant: 'destructive' });
      return;
    }
    
    castVote.mutate({
      proposalId: proposal.id,
      selectedOption: optionKey,
      votingPower: Math.max(1, votingPower),
    });
  };

  const colorMap: Record<string, string> = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  };

  const borderColorMap: Record<string, string> = {
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    purple: 'border-purple-500',
  };

  const publishedDate = proposal.publishedAt ? new Date(proposal.publishedAt) : null;
  const expiresAt = publishedDate 
    ? new Date(publishedDate.getTime() + proposal.expirationDays * 24 * 60 * 60 * 1000)
    : null;
  const timeRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 0;
  const isVotingActive = timeRemaining > 0;

  return (
    <motion.div layout>
      <Card className="bg-white/5 border-white/10 overflow-hidden" data-testid={`offchain-proposal-${proposal.id}`}>
        <div className="p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={onToggle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold font-mono text-sm">
                #{proposal.id.slice(0, 4)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs border-white/20">{proposal.category}</Badge>
                  <Badge variant="outline" className={`text-xs ${isVotingActive ? 'border-cyan-500/50 text-cyan-400' : 'border-gray-500/50 text-gray-400'}`}>
                    {isVotingActive ? 'Active' : 'Ended'}
                  </Badge>
                </div>
                <h3 className="font-bold text-white">{proposal.title}</h3>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{totalVoters} voters • {totalPower} votes</span>
                </div>
                {isVotingActive && (
                  <div className="flex items-center gap-1 text-xs text-cyan-400">
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
                
                <div className="space-y-3">
                  {options.map((option) => {
                    const pct = getPercentage(option.key);
                    const power = getVotePower(option.key);
                    const isUserChoice = userVote?.selectedOption === option.key;
                    
                    return (
                      <div 
                        key={option.key} 
                        className={`relative overflow-hidden rounded-lg border ${isUserChoice ? borderColorMap[option.color] : 'border-white/10'}`}
                      >
                        <div className="absolute inset-0 bg-white/5" />
                        <div 
                          className={`absolute left-0 top-0 h-full ${colorMap[option.color]} opacity-30 transition-all`} 
                          style={{ width: `${pct}%` }} 
                        />
                        <div className="relative p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${colorMap[option.color]} text-white`}>
                              {option.key}
                            </span>
                            {isUserChoice && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                            <span className="font-medium text-white">{option.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{power} votes</span>
                            <span className="font-bold text-white w-12 text-right">{pct}%</span>
                            {isVotingActive && !userVote && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); handleVote(option.key as 'A' | 'B' | 'C' | 'D'); }}
                                disabled={castVote.isPending || votingPower < 1}
                                className={`${borderColorMap[option.color]} border-opacity-50 hover:bg-white/10`}
                                data-testid={`vote-${proposal.id}-${option.key}`}
                              >
                                {castVote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Vote'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {userVote && (
                  <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/30 text-center">
                    <span className="text-sm text-cyan-400">
                      You voted for Option {userVote.selectedOption} with {userVote.votingPower} voting power
                    </span>
                  </div>
                )}

                {!isVotingActive && (
                  <div className="p-3 rounded bg-white/5 border border-white/10 text-center text-sm text-muted-foreground">
                    Voting has ended for this proposal
                  </div>
                )}

                {isAdmin && isVotingActive && (
                  <div className="pt-2 border-t border-white/10">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => { e.stopPropagation(); onClose(); }}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Close Voting
                    </Button>
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
