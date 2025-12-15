import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { OLD_MARKETPLACE_V1 } from '@/lib/constants';

const OLD_MARKETPLACE_ABI = [
  {
    name: 'cancelListing',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
] as const;

export function RetrieveOldListing() {
  const { isConnected } = useAccount();
  const [tokenId, setTokenId] = useState('');
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCancel = () => {
    if (!tokenId) return;
    writeContract({
      address: OLD_MARKETPLACE_V1 as `0x${string}`,
      abi: OLD_MARKETPLACE_ABI,
      functionName: 'cancelListing',
      args: [BigInt(tokenId)],
      gas: BigInt(200000),
    });
  };

  if (!isConnected) return null;

  return (
    <Card className="p-4 bg-orange-500/10 border-orange-500/30 mb-6" data-testid="retrieve-old-listing">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-orange-400 mt-1 shrink-0" size={20} />
        <div className="flex-1">
          <h4 className="font-bold text-orange-400 mb-1">Retrieve NFT from Old Marketplace</h4>
          <p className="text-sm text-muted-foreground mb-3">
            If you listed an NFT on the old V1 marketplace, it may be stuck there. 
            Enter the token ID to cancel the listing and get it back.
          </p>
          
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Token ID (e.g. 149)"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="w-32 bg-black/30 border-orange-500/30"
              data-testid="input-token-id"
            />
            <Button
              onClick={handleCancel}
              disabled={!tokenId || isPending || isConfirming}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-retrieve-nft"
            >
              {isPending || isConfirming ? (
                <><Loader2 className="animate-spin mr-2" size={16} /> Processing...</>
              ) : (
                'Retrieve NFT'
              )}
            </Button>
          </div>

          {isSuccess && (
            <Alert className="mt-3 bg-green-500/20 border-green-500/30">
              <CheckCircle className="text-green-400" size={16} />
              <AlertDescription className="text-green-400">
                NFT #{tokenId} retrieved! Refresh your portfolio to see it.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mt-3 bg-red-500/20 border-red-500/30">
              <AlertTriangle className="text-red-400" size={16} />
              <AlertDescription className="text-red-400">
                {error.message.includes('not the seller') 
                  ? 'You are not the seller of this NFT'
                  : error.message.includes('not listed')
                  ? 'This NFT is not listed on the old marketplace'
                  : 'Failed to retrieve. Make sure you are the original seller.'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </Card>
  );
}
