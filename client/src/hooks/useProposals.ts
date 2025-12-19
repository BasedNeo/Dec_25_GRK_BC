import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { PROPOSAL_CREATOR_WALLETS } from '@/lib/constants';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  startDate: string;
  endDate: string;
  category: string | null;
  requiredQuorum: number | null;
  createdAt: string;
  updatedAt: string;
}

export function useProposals() {
  return useQuery<Proposal[]>({
    queryKey: ['proposals'],
    queryFn: async () => {
      const res = await fetch('/api/proposals');
      if (!res.ok) throw new Error('Failed to fetch proposals');
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useProposalDetail(id: string | undefined) {
  return useQuery<Proposal>({
    queryKey: ['proposal', id],
    queryFn: async () => {
      if (!id) throw new Error('No proposal ID');
      const res = await fetch(`/api/proposals/${id}`);
      if (!res.ok) throw new Error('Failed to fetch proposal');
      return res.json();
    },
    enabled: !!id,
    refetchInterval: 15000,
  });
}

export function useUserVote(proposalId: string | undefined, voter: string | undefined) {
  return useQuery<{ vote: string | null }>({
    queryKey: ['userVote', proposalId, voter],
    queryFn: async () => {
      if (!proposalId || !voter) throw new Error('Missing params');
      const res = await fetch(`/api/proposals/${proposalId}/vote/${voter}`);
      if (!res.ok) throw new Error('Failed to fetch vote');
      return res.json();
    },
    enabled: !!proposalId && !!voter,
    refetchInterval: 30000,
  });
}

export function useProposalMutations() {
  const { toast } = useToast();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const isAdmin = address && PROPOSAL_CREATOR_WALLETS.some(
    w => w.toLowerCase() === address.toLowerCase()
  );

  const createProposal = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      durationDays: number;
      category?: string;
      requiredQuorum?: number;
    }) => {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, proposer: address }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create proposal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposal Created', description: 'Your proposal is now active', className: 'bg-black border-cyan-500 text-cyan-500' });
    },
    onError: () => {
      toast({ title: 'Unable to Create', description: 'Could not create proposal. Please try again.', variant: 'destructive' });
    },
  });

  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, confirmations: 3 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete proposal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Deleted', description: 'Proposal has been removed', className: 'bg-black border-red-500 text-red-500' });
    },
    onError: () => {
      toast({ title: 'Unable to Delete', description: 'Could not delete proposal. Please try again.', variant: 'destructive' });
    },
  });

  const castVote = useMutation({
    mutationFn: async ({ proposalId, vote, votingPower }: { proposalId: string; vote: 'for' | 'against'; votingPower: number }) => {
      const res = await fetch(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter: address, vote, votingPower }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cast vote');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userVote', variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Vote Cast', description: 'Your vote has been recorded', className: 'bg-black border-primary text-primary' });
    },
    onError: () => {
      toast({ title: 'Vote Failed', description: 'Could not submit your vote. Please try again.', variant: 'destructive' });
    },
  });

  return {
    isAdmin,
    createProposal,
    deleteProposal,
    castVote,
  };
}
