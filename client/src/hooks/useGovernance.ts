/**
 * useGovernance Hook - Governance/Voting functionality
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useCallback, useEffect } from 'react';
import { GOVERNANCE_CONTRACT, CHAIN_ID } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { savePendingTx } from '@/hooks/usePendingTransactions';
import { parseContractError } from '@/lib/errorParser';

export enum ProposalStatus { Pending = 0, Active = 1, Passed = 2, Failed = 3, Executed = 4, Cancelled = 5 }

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  [ProposalStatus.Pending]: 'Pending', [ProposalStatus.Active]: 'Active', [ProposalStatus.Passed]: 'Passed',
  [ProposalStatus.Failed]: 'Failed', [ProposalStatus.Executed]: 'Executed', [ProposalStatus.Cancelled]: 'Cancelled'
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
  [ProposalStatus.Pending]: 'text-gray-400', [ProposalStatus.Active]: 'text-cyan-400', [ProposalStatus.Passed]: 'text-green-400',
  [ProposalStatus.Failed]: 'text-red-400', [ProposalStatus.Executed]: 'text-purple-400', [ProposalStatus.Cancelled]: 'text-gray-500'
};

export interface Proposal {
  id: bigint; proposer: string; title: string; description: string; category: string;
  startTime: bigint; endTime: bigint; votesFor: bigint; votesAgainst: bigint;
  totalVoters: bigint; executed: boolean; cancelled: boolean; status: ProposalStatus;
}

const GOVERNANCE_ABI = [
  { name: 'proposalCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getProposal', type: 'function', stateMutability: 'view', inputs: [{ name: '_proposalId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'id', type: 'uint256' }, { name: 'proposer', type: 'address' }, { name: 'title', type: 'string' },
      { name: 'description', type: 'string' }, { name: 'category', type: 'string' }, { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' }, { name: 'votesFor', type: 'uint256' }, { name: 'votesAgainst', type: 'uint256' },
      { name: 'totalVoters', type: 'uint256' }, { name: 'executed', type: 'bool' }, { name: 'cancelled', type: 'bool' }, { name: 'status', type: 'uint8' }
    ]}]
  },
  { name: 'getVoteInfo', type: 'function', stateMutability: 'view',
    inputs: [{ name: '_proposalId', type: 'uint256' }, { name: '_voter', type: 'address' }],
    outputs: [{ name: 'voted', type: 'bool' }, { name: 'support', type: 'bool' }, { name: 'power', type: 'uint256' }]
  },
  { name: 'getVotingPower', type: 'function', stateMutability: 'view', inputs: [{ name: '_voter', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'getActiveProposals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256[]' }] },
  { name: 'isVotingActive', type: 'function', stateMutability: 'view', inputs: [{ name: '_proposalId', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'getTimeRemaining', type: 'function', stateMutability: 'view', inputs: [{ name: '_proposalId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'votingPeriod', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'quorumPercentage', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'minNFTsToPropose', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'createProposal', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: '_title', type: 'string' }, { name: '_description', type: 'string' }, { name: '_category', type: 'string' }], outputs: [{ type: 'uint256' }] },
  { name: 'vote', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_proposalId', type: 'uint256' }, { name: '_support', type: 'bool' }], outputs: [] },
  { name: 'finalizeProposal', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_proposalId', type: 'uint256' }], outputs: [] },
  { name: 'cancelProposal', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_proposalId', type: 'uint256' }], outputs: [] }
] as const;

export function useGovernance() {
  const { toast } = useToast();
  const { address, isConnected, chain } = useAccount();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();

  const checkNetwork = (): boolean => {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return false;
    }
    if (chain?.id !== CHAIN_ID) {
      toast({ title: "Wrong Network", description: "Please switch to BasedAI network (Chain ID: 32323)", variant: "destructive" });
      return false;
    }
    return true;
  };
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: proposalCount, refetch: refetchCount } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'proposalCount',
    chainId: CHAIN_ID,
    query: { refetchInterval: 30000 }
  });
  const { data: votingPower } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'getVotingPower', 
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 30000 }
  });
  const { data: minNFTsToPropose } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'minNFTsToPropose',
    chainId: CHAIN_ID 
  });
  const { data: quorumPercentage } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'quorumPercentage',
    chainId: CHAIN_ID 
  });
  const { data: activeProposalIds, refetch: refetchActive } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'getActiveProposals',
    chainId: CHAIN_ID,
    query: { refetchInterval: 30000 }
  });

  useEffect(() => {
    if (txHash && isConfirming && !isSuccess) {
      savePendingTx(txHash, pendingAction === 'vote' ? 'vote' : 'proposal', pendingAction === 'vote' ? 'Submitting vote' : pendingAction === 'createProposal' ? 'Creating proposal' : 'Governance action');
    }
    if (isSuccess && txHash) {
      const messages: Record<string, string> = {
        createProposal: 'Proposal created successfully!',
        vote: 'Vote cast successfully!',
        finalize: 'Proposal finalized!',
        cancel: 'Proposal cancelled!'
      };
      toast({ 
        title: "Success!", 
        description: messages[pendingAction || ''] || 'Transaction confirmed!',
        className: "bg-black border-green-500 text-green-500"
      });
      refetchCount();
      refetchActive();
      setPendingAction(null);
    }
  }, [isSuccess, txHash, pendingAction, toast, refetchCount, refetchActive, isConfirming]);

  useEffect(() => {
    if (writeError) {
      const msg = parseContractError(writeError);
      toast({ title: "Transaction Failed", description: msg, variant: "destructive" });
      setPendingAction(null);
    }
  }, [writeError, toast]);

  const createProposal = useCallback(async (title: string, description: string, category: string) => {
    if (!checkNetwork()) return;
    setPendingAction('createProposal');
    toast({ title: "Creating Proposal", description: "Please confirm in your wallet...", className: "bg-black border-cyan-500 text-cyan-500" });
    writeContract({ address: GOVERNANCE_CONTRACT as `0x${string}`, abi: GOVERNANCE_ABI, functionName: 'createProposal', args: [title, description, category], chainId: CHAIN_ID });
  }, [isConnected, chain, writeContract, toast]);

  const vote = useCallback(async (proposalId: number, support: boolean) => {
    if (!checkNetwork()) return;
    setPendingAction('vote');
    toast({ title: support ? "Voting For" : "Voting Against", description: "Please confirm in your wallet...", className: "bg-black border-cyan-500 text-cyan-500" });
    writeContract({ address: GOVERNANCE_CONTRACT as `0x${string}`, abi: GOVERNANCE_ABI, functionName: 'vote', args: [BigInt(proposalId), support], chainId: CHAIN_ID });
  }, [isConnected, chain, writeContract, toast]);

  const finalizeProposal = useCallback(async (proposalId: number) => {
    if (!checkNetwork()) return;
    setPendingAction('finalize');
    toast({ title: "Finalizing Proposal", description: "Please confirm in your wallet...", className: "bg-black border-cyan-500 text-cyan-500" });
    writeContract({ address: GOVERNANCE_CONTRACT as `0x${string}`, abi: GOVERNANCE_ABI, functionName: 'finalizeProposal', args: [BigInt(proposalId)], chainId: CHAIN_ID });
  }, [isConnected, chain, writeContract, toast]);

  const cancelProposal = useCallback(async (proposalId: number) => {
    if (!checkNetwork()) return;
    setPendingAction('cancel');
    toast({ title: "Cancelling Proposal", description: "Please confirm in your wallet...", className: "bg-black border-cyan-500 text-cyan-500" });
    writeContract({ address: GOVERNANCE_CONTRACT as `0x${string}`, abi: GOVERNANCE_ABI, functionName: 'cancelProposal', args: [BigInt(proposalId)], chainId: CHAIN_ID });
  }, [isConnected, chain, writeContract, toast]);

  const canCreateProposal = isConnected && votingPower !== undefined && minNFTsToPropose !== undefined && votingPower >= minNFTsToPropose;

  return {
    isConnected, address, pendingAction, isPending, isConfirming, isSuccess, txHash, error: writeError, reset,
    proposalCount: proposalCount ? Number(proposalCount) : 0, votingPower: votingPower ? Number(votingPower) : 0,
    minNFTsToPropose: minNFTsToPropose ? Number(minNFTsToPropose) : 1, quorumPercentage: quorumPercentage ? Number(quorumPercentage) : 10,
    activeProposalIds: activeProposalIds || [], canCreateProposal,
    createProposal, vote, finalizeProposal, cancelProposal, refetchCount, refetchActive
  };
}

export function useProposal(proposalId: number | undefined) {
  const { address } = useAccount();
  const { data: proposal, isLoading, refetch } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'getProposal', 
    args: proposalId !== undefined ? [BigInt(proposalId)] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: proposalId !== undefined, refetchInterval: 15000 }
  });
  const { data: voteInfo } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'getVoteInfo', 
    args: proposalId !== undefined && address ? [BigInt(proposalId), address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: proposalId !== undefined && !!address }
  });
  const { data: isActive } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'isVotingActive', 
    args: proposalId !== undefined ? [BigInt(proposalId)] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: proposalId !== undefined, refetchInterval: 15000 }
  });
  const { data: timeRemaining } = useReadContract({ 
    address: GOVERNANCE_CONTRACT as `0x${string}`, 
    abi: GOVERNANCE_ABI, 
    functionName: 'getTimeRemaining', 
    args: proposalId !== undefined ? [BigInt(proposalId)] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: proposalId !== undefined, refetchInterval: 15000 }
  });
  return { proposal: proposal as Proposal | undefined, isLoading, refetch, userVote: voteInfo ? { hasVoted: voteInfo[0], support: voteInfo[1], power: Number(voteInfo[2]) } : null, isActive: isActive ?? false, timeRemaining: timeRemaining ? Number(timeRemaining) : 0 };
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`; if (hours > 0) return `${hours}h ${mins}m left`; return `${mins}m left`;
}

export function calculateVotePercentage(votesFor: bigint, votesAgainst: bigint): { forPercent: number; againstPercent: number; total: number } {
  const forNum = Number(votesFor); const againstNum = Number(votesAgainst); const total = forNum + againstNum;
  if (total === 0) return { forPercent: 0, againstPercent: 0, total: 0 };
  return { forPercent: Math.round((forNum / total) * 100), againstPercent: Math.round((againstNum / total) * 100), total };
}
