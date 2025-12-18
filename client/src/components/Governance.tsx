import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, Clock, Trash2, PlusCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { CreateProposalModal } from './CreateProposalModal';
import { useToast } from '@/hooks/use-toast';
import { ADMIN_WALLETS } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  startDate: string;
  endDate: string;
  category: string;
  requiredQuorum: number;
}

export function Governance() {
  const { address, isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmCount, setDeleteConfirmCount] = useState(0);
  const { toast } = useToast();

  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());

  const fetchProposals = async () => {
    try {
      const res = await fetch('/api/proposals');
      const data = await res.json();
      setProposals(data);

      if (address) {
        for (const proposal of data) {
          const voteRes = await fetch(`/api/proposals/${proposal.id}/vote/${address}`);
          const voteData = await voteRes.json();
          if (voteData.vote) {
            setUserVotes(prev => ({ ...prev, [proposal.id]: voteData.vote }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [address]);

  const handleVote = async (proposalId: number, vote: 'for' | 'against') => {
    if (!address || !isConnected) {
      toast({ title: 'Connect Wallet', description: 'Please connect your wallet to vote', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter: address, vote }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast({ title: 'Vote Cast!', description: `You voted ${vote} on this proposal` });
      setUserVotes(prev => ({ ...prev, [proposalId]: vote }));
      fetchProposals();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to vote';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async (proposalId: number) => {
    if (deletingId !== proposalId) {
      setDeletingId(proposalId);
      setDeleteConfirmCount(1);
      toast({ title: 'Confirm Delete', description: 'Click delete 2 more times to confirm' });
      return;
    }

    if (deleteConfirmCount < 2) {
      setDeleteConfirmCount(prev => prev + 1);
      toast({ title: `Confirm ${3 - deleteConfirmCount} more time(s)`, description: 'Click delete again to confirm' });
      return;
    }

    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, confirmations: 3 }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete proposal');
      }

      toast({ title: 'Proposal Deleted', description: 'The proposal has been removed' });
      setDeletingId(null);
      setDeleteConfirmCount(0);
      fetchProposals();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff < 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  return (
    <section className="py-6 sm:py-12 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-orbitron font-bold text-white mb-1 sm:mb-2">Governance</h2>
            <p className="text-sm sm:text-base text-gray-400">Vote on proposals to shape the future</p>
          </div>

          {isAdmin && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-purple-500 text-black min-h-[44px] touch-manipulation"
              data-testid="create-proposal-btn"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Proposal
            </Button>
          )}
        </div>

        {!isConnected && (
          <Card className="bg-yellow-500/10 border-yellow-500/50 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-start sm:items-center gap-3">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <div className="text-yellow-400 font-bold text-sm sm:text-base">Connect Wallet to Vote</div>
                <div className="text-yellow-200 text-xs sm:text-sm">Connect your wallet to participate in governance</div>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading proposals...</div>
        ) : proposals.length === 0 ? (
          <Card className="bg-black/60 border-white/10 p-8 sm:p-12 text-center">
            <div className="text-gray-500 mb-4">No active proposals</div>
            {isAdmin && (
              <Button 
                onClick={() => setShowCreateModal(true)} 
                variant="outline"
                className="min-h-[44px] touch-manipulation"
              >
                Create First Proposal
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <AnimatePresence>
              {proposals.map((proposal, index) => {
                const totalVotes = proposal.votesFor + proposal.votesAgainst;
                const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes * 100).toFixed(1) : 50;
                const againstPercentage = totalVotes > 0 ? (proposal.votesAgainst / totalVotes * 100).toFixed(1) : 50;
                const userVote = userVotes[proposal.id];
                const isEnded = new Date() > new Date(proposal.endDate);

                return (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-black/60 border-cyan-500/30 p-4 sm:p-6 hover:border-cyan-500/50 transition-colors">
                      <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-base sm:text-xl font-orbitron font-bold text-white break-words">{proposal.title}</h3>
                            <Badge className="capitalize text-xs">{proposal.category}</Badge>
                            {isEnded && <Badge variant="destructive" className="text-xs">Ended</Badge>}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400">
                            By {proposal.proposer?.slice(0, 6)}...{proposal.proposer?.slice(-4)}
                          </div>
                        </div>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(proposal.id)}
                            className={`text-red-400 hover:text-red-300 min-h-[44px] min-w-[44px] touch-manipulation ${deletingId === proposal.id && deleteConfirmCount > 0 ? 'animate-pulse bg-red-500/20' : ''}`}
                            data-testid={`delete-proposal-${proposal.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            {deletingId === proposal.id && deleteConfirmCount > 0 && (
                              <span className="ml-1 text-xs">({3 - deleteConfirmCount})</span>
                            )}
                          </Button>
                        )}
                      </div>

                      <p className="text-gray-300 text-xs sm:text-sm mb-4 sm:mb-6 whitespace-pre-wrap line-clamp-3">{proposal.description}</p>

                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <div className="flex flex-col sm:flex-row justify-between text-xs sm:text-sm mb-2 gap-1">
                            <span className="text-green-400">For: {proposal.votesFor} ({forPercentage}%)</span>
                            <span className="text-red-400">Against: {proposal.votesAgainst} ({againstPercentage}%)</span>
                          </div>
                          <div className="h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden flex">
                            <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${forPercentage}%` }} />
                            <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${againstPercentage}%` }} />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            {getTimeRemaining(proposal.endDate)}
                          </div>

                          {!isEnded && isConnected ? (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <Button
                                size="sm"
                                onClick={() => handleVote(proposal.id, 'for')}
                                disabled={userVote === 'for'}
                                className={`flex-1 sm:flex-initial min-h-[44px] touch-manipulation ${userVote === 'for' ? 'bg-green-500' : 'bg-green-500/20 hover:bg-green-500/40'}`}
                                data-testid={`vote-for-${proposal.id}`}
                              >
                                <ThumbsUp className="w-4 h-4 mr-2" />
                                Vote For
                                {userVote === 'for' && <CheckCircle className="w-4 h-4 ml-2" />}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleVote(proposal.id, 'against')}
                                disabled={userVote === 'against'}
                                className={`flex-1 sm:flex-initial min-h-[44px] touch-manipulation ${userVote === 'against' ? 'bg-red-500' : 'bg-red-500/20 hover:bg-red-500/40'}`}
                                data-testid={`vote-against-${proposal.id}`}
                              >
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                Vote Against
                                {userVote === 'against' && <CheckCircle className="w-4 h-4 ml-2" />}
                              </Button>
                            </div>
                          ) : isEnded ? (
                            <div className="text-xs sm:text-sm text-gray-500">Voting ended</div>
                          ) : null}
                        </div>

                        <div className="text-xs text-gray-500">
                          Quorum: {totalVotes}/{proposal.requiredQuorum} votes needed
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isAdmin && (
        <CreateProposalModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          walletAddress={address || ''}
        />
      )}
    </section>
  );
}
