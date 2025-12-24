import { useLocation } from 'wouter';
import { useAccount, useReadContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Home, Lock, Brain } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { RiddleQuest } from '@/components/RiddleQuest';
import { NFT_CONTRACT } from '@/lib/constants';
import { Button } from '@/components/ui/button';

const ERC721_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export default function RiddleQuestPage() {
  const [, navigate] = useLocation();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const { data: nftBalance, isLoading: isLoadingBalance } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: ERC721_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const isHolder = nftBalance ? Number(nftBalance) > 0 : false;

  if (!isConnected) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#050510] to-[#0a0020] relative overflow-hidden">
        <Navbar activeTab="game" onTabChange={() => navigate('/')} isConnected={isConnected} />
        
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div 
            className="text-center p-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Brain className="w-20 h-20 text-cyan-500 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-orbitron font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Connect Wallet to Play
              </span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Connect your wallet holding a Guardian NFT to access Riddle Quest.
            </p>
            <Button 
              onClick={openConnectModal}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-orbitron font-bold px-8 py-4 rounded-xl"
              data-testid="button-connect-riddle"
            >
              Connect Wallet
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  if (isLoadingBalance) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#050510] to-[#0a0020] relative overflow-hidden">
        <Navbar activeTab="game" onTabChange={() => navigate('/')} isConnected={isConnected} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-xl font-orbitron">Verifying NFT ownership...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isHolder) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#050510] to-[#0a0020] relative overflow-hidden">
        <Navbar activeTab="game" onTabChange={() => navigate('/')} isConnected={isConnected} />
        
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div 
            className="text-center p-8 max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500/50">
              <Lock className="w-12 h-12 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-orbitron font-bold text-white mb-4">
              Own a Guardian NFT to Play
            </h2>
            <p className="text-gray-400 mb-8">
              Riddle Quest is exclusive to Guardian NFT holders. Mint or purchase a Guardian to unlock access.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => navigate('/#mint')}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-bold px-6 py-3 rounded-xl"
                data-testid="button-go-mint"
              >
                Mint a Guardian
              </Button>
              <Button 
                onClick={() => navigate('/games')}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-6 py-3 rounded-xl"
                data-testid="button-back-arcade"
              >
                Back to Arcade
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#050510] to-[#0a0020] relative overflow-y-auto pb-24">
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 2,
            }}
          />
        ))}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <Navbar activeTab="game" onTabChange={() => navigate('/')} isConnected={isConnected} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <div className="mb-4">
          <button 
            onClick={() => navigate('/games')}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-mono transition-colors"
            data-testid="button-back-arcade"
          >
            <Home size={16} />
            <span>Back to Arcade</span>
          </button>
        </div>

        <RiddleQuest />
      </div>
    </section>
  );
}
