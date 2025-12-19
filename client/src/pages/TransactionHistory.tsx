import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

interface Transaction {
  id: number;
  transactionType: string;
  transactionHash: string;
  status: string;
  amount?: string;
  tokenId?: number;
  quantity?: number;
  platformFee?: string;
  royaltyFee?: string;
  netAmount?: string;
  gasUsed?: string;
  gasCostInBase?: string;
  blockNumber?: number;
  createdAt: string;
  confirmedAt?: string;
  metadata?: string;
}

export default function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mint' | 'buy' | 'sell' | 'list'>('all');
  
  useEffect(() => {
    if (!address) return;
    
    fetchTransactions();
  }, [address]);
  
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/history/${address}`);
      const data = await res.json();
      setTransactions(data.history || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const exportCSV = () => {
    window.open(`/api/transactions/export/${address}/csv`, '_blank');
  };
  
  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.transactionType === filter);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mint': return '🎨';
      case 'buy': return '🛒';
      case 'sell': return '💰';
      case 'list': return '📋';
      case 'delist': return '❌';
      case 'offer_made': return '💵';
      case 'offer_accepted': return '🤝';
      case 'offer_cancelled': return '🚫';
      case 'vote': return '🗳️';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mint': return 'bg-green-500/20 text-green-400';
      case 'buy': return 'bg-cyan-500/20 text-cyan-400';
      case 'sell': return 'bg-purple-500/20 text-purple-400';
      case 'list': return 'bg-blue-500/20 text-blue-400';
      case 'delist': return 'bg-gray-500/20 text-gray-400';
      case 'offer_made': return 'bg-yellow-500/20 text-yellow-400';
      case 'offer_accepted': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black pt-24 pb-12 px-4" data-testid="page-transaction-history">
        <Card className="max-w-md mx-auto p-12 text-center bg-black/60 border-purple-500/30">
          <h2 className="text-2xl font-bold mb-4 text-white">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view transaction history</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black pt-24 pb-12 px-4" data-testid="page-transaction-history">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-orbitron" data-testid="text-page-title">
              Transaction History
            </h1>
          </div>
          <Button onClick={exportCSV} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700" data-testid="button-export-csv">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
        
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'mint', 'buy', 'sell', 'list'] as const).map(f => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              className={filter === f ? 'bg-cyan-600' : 'border-gray-600 text-gray-400'}
              data-testid={`button-filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        
        {loading ? (
          <Card className="p-12 text-center bg-black/60 border-purple-500/30">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-xl text-white">Loading transactions...</div>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card className="p-12 text-center bg-black/60 border-purple-500/30">
            <div className="text-xl text-gray-400">No transactions found</div>
            <p className="text-gray-500 mt-2">Your transaction history will appear here after minting, buying, or selling NFTs.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-testid={`row-transaction-${tx.id}`}
              >
                <Card className="p-6 bg-black/60 border-purple-500/30 hover:border-purple-500/60 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getTypeIcon(tx.transactionType)}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(tx.transactionType)}`}>
                            {tx.transactionType.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(tx.status)}`}>
                      {tx.status.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {tx.amount && (
                      <div>
                        <div className="text-xs text-gray-400">Amount</div>
                        <div className="font-bold text-white">{parseFloat(tx.amount).toLocaleString()} $BASED</div>
                      </div>
                    )}
                    {tx.tokenId && (
                      <div>
                        <div className="text-xs text-gray-400">Token ID</div>
                        <div className="font-bold text-white">#{tx.tokenId}</div>
                      </div>
                    )}
                    {tx.platformFee && parseFloat(tx.platformFee) > 0 && (
                      <div>
                        <div className="text-xs text-gray-400">Platform Fee</div>
                        <div className="font-bold text-purple-400">{parseFloat(tx.platformFee).toLocaleString()} $BASED</div>
                      </div>
                    )}
                    {tx.royaltyFee && parseFloat(tx.royaltyFee) > 0 && (
                      <div>
                        <div className="text-xs text-gray-400">Royalty Fee</div>
                        <div className="font-bold text-blue-400">{parseFloat(tx.royaltyFee).toLocaleString()} $BASED</div>
                      </div>
                    )}
                    {tx.gasCostInBase && (
                      <div>
                        <div className="text-xs text-gray-400">Gas Cost</div>
                        <div className="font-bold text-orange-400">{(parseFloat(tx.gasCostInBase) / 1e18).toFixed(6)} $BASED</div>
                      </div>
                    )}
                    {tx.netAmount && (
                      <div>
                        <div className="text-xs text-gray-400">Net Amount</div>
                        <div className="font-bold text-green-400">{parseFloat(tx.netAmount).toLocaleString()} $BASED</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm border-t border-white/10 pt-4">
                    <div className="text-gray-400 font-mono truncate max-w-md">
                      {tx.transactionHash}
                    </div>
                    <a
                      href={`https://explorer.bf1337.org/tx/${tx.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                      data-testid={`link-tx-${tx.id}`}
                    >
                      View on Explorer
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        
        <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-white font-semibold mb-2">About Transaction History</h3>
          <p className="text-gray-400 text-sm">
            This page shows all your on-chain transactions with Based Guardians. 
            You can export your complete transaction history as a CSV file for tax reporting or record-keeping purposes.
            The CSV includes detailed breakdowns of amounts, fees, gas costs, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
