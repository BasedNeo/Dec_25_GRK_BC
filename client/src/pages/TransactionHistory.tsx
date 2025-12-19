import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Download, ExternalLink, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface Transaction {
  id: number;
  walletAddress: string;
  transactionType: string;
  transactionHash: string;
  tokenId: number | null;
  amount: string | null;
  gasUsed: string | null;
  gasPrice: string | null;
  blockNumber: number | null;
  status: string;
  fromAddress: string | null;
  toAddress: string | null;
  platformFee: string | null;
  royaltyFee: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export default function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (address) {
      fetch(`/api/transactions/history/${address}`)
        .then(res => res.json())
        .then(data => { 
          setHistory(data.history || []); 
          setLoading(false); 
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [address]);
  
  const downloadCSV = () => {
    if (address) {
      window.open(`/api/transactions/export/${address}/csv`, '_blank');
    }
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mint': return 'bg-green-500/20 text-green-400';
      case 'buy': return 'bg-cyan-500/20 text-cyan-400';
      case 'sell': return 'bg-purple-500/20 text-purple-400';
      case 'list': return 'bg-blue-500/20 text-blue-400';
      case 'delist': return 'bg-gray-500/20 text-gray-400';
      case 'offer': return 'bg-yellow-500/20 text-yellow-400';
      case 'accept_offer': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <div className="text-white text-xl mb-2">Connect Your Wallet</div>
          <div className="text-gray-400">Connect your wallet to view your transaction history</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-white font-orbitron" data-testid="text-page-title">
              Transaction History
            </h1>
          </div>
          <Button 
            onClick={downloadCSV} 
            variant="outline" 
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
            data-testid="button-export-csv"
          >
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center text-white py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading transactions...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 border border-white/10 rounded-lg">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <div className="text-gray-400 text-lg">No transactions yet</div>
            <div className="text-gray-500 text-sm mt-2">Your transaction history will appear here after minting, buying, or selling NFTs.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-transactions">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-normal text-sm">Date</th>
                  <th className="text-left p-4 text-gray-400 font-normal text-sm">Type</th>
                  <th className="text-left p-4 text-gray-400 font-normal text-sm">Token ID</th>
                  <th className="text-left p-4 text-gray-400 font-normal text-sm">Amount</th>
                  <th className="text-left p-4 text-gray-400 font-normal text-sm">Status</th>
                  <th className="text-left p-4 text-gray-400 font-normal text-sm">TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`row-transaction-${tx.id}`}>
                    <td className="p-4 text-white text-sm">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(tx.transactionType)}`}>
                        {tx.transactionType.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-white text-sm">
                      {tx.tokenId ? `#${tx.tokenId}` : '-'}
                    </td>
                    <td className="p-4 text-white text-sm">
                      {tx.amount ? `${Number(tx.amount).toLocaleString()} $BASED` : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <a 
                        href={`https://explorer.bf1337.org/tx/${tx.transactionHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm"
                        data-testid={`link-tx-${tx.id}`}
                      >
                        {tx.transactionHash.slice(0, 10)}...
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-white font-semibold mb-2">About Transaction History</h3>
          <p className="text-gray-400 text-sm">
            This page shows all your on-chain transactions with Based Guardians. 
            You can export your complete transaction history as a CSV file for tax reporting or record-keeping purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
