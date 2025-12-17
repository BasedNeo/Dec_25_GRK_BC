import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { PROPOSAL_CREATOR_WALLETS } from '@/lib/constants';

export interface OffchainProposal {
  id: string;
  title: string;
  description: string;
  category: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  status: 'review' | 'active' | 'closed';
  createdBy: string;
  expirationDays: number;
  createdAt: string;
  publishedAt: string | null;
  votes?: { option: string; votes: number; power: number }[];
}

export interface VoteTally {
  option: string;
  votes: number;
  power: number;
}

export function useProposals(status?: string) {
  const url = status ? `/api/proposals?status=${status}` : '/api/proposals';
  
  return useQuery<OffchainProposal[]>({
    queryKey: ['proposals', status],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch proposals');
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useProposalDetail(id: string | undefined) {
  return useQuery<OffchainProposal & { votes: VoteTally[] }>({
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

export function useProposalVotes(proposalId: string | undefined, walletAddress?: string) {
  return useQuery({
    queryKey: ['proposalVotes', proposalId, walletAddress],
    queryFn: async () => {
      if (!proposalId) throw new Error('No proposal ID');
      const url = walletAddress 
        ? `/api/proposals/${proposalId}/votes?wallet=${walletAddress}`
        : `/api/proposals/${proposalId}/votes`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch votes');
      return res.json();
    },
    enabled: !!proposalId,
    refetchInterval: 10000,
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
      category: string;
      optionA: string;
      optionB: string;
      optionC?: string | null;
      optionD?: string | null;
      expirationDays: number;
    }) => {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, createdBy: address }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create proposal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposal Created', description: 'Your proposal is now in review', className: 'bg-black border-cyan-500 text-cyan-500' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'review' | 'active' | 'closed' }) => {
      const res = await fetch(`/api/proposals/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, walletAddress: address }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', variables.id] });
      const msg = variables.status === 'active' ? 'Proposal is now active' : 'Status updated';
      toast({ title: 'Success', description: msg, className: 'bg-black border-green-500 text-green-500' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/proposals/${id}?wallet=${address}`, {
        method: 'DELETE',
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
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const castVote = useMutation({
    mutationFn: async ({ proposalId, selectedOption, votingPower }: { proposalId: string; selectedOption: 'A' | 'B' | 'C' | 'D'; votingPower: number }) => {
      const res = await fetch(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, selectedOption, votingPower }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cast vote');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposalVotes', variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', variables.proposalId] });
      toast({ title: 'Vote Cast', description: 'Your vote has been recorded', className: 'bg-black border-primary text-primary' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    isAdmin,
    createProposal,
    updateStatus,
    deleteProposal,
    castVote,
  };
}
