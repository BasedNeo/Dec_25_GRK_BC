import { rpcProvider } from './rpcProvider';

interface TransactionParams {
  from: string;
  to: string;
  value?: bigint;
  data?: string;
}

interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  receipt?: unknown;
}

export class SafeTransaction {
  private static readonly CONFIRMATION_BLOCKS = 2;
  private static readonly MAX_WAIT_TIME = 120000;

  static async estimateGas(params: TransactionParams): Promise<bigint> {
    return await rpcProvider.executeWithFailover(async (provider) => {
      const estimate = await provider.estimateGas({
        from: params.from,
        to: params.to,
        value: params.value,
        data: params.data,
      });
      
      return estimate * BigInt(120) / BigInt(100);
    });
  }

  static async getGasPrice(): Promise<bigint> {
    return await rpcProvider.executeWithFailover(async (provider) => {
      const feeData = await provider.getFeeData();
      return feeData.gasPrice || BigInt(10000000000);
    });
  }

  static async verifyBalanceWithGas(address: string, value: bigint, estimatedGas: bigint): Promise<boolean> {
    return await rpcProvider.executeWithFailover(async (provider) => {
      const balance = await provider.getBalance(address);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(10000000000);
      const totalRequired = value + (estimatedGas * gasPrice);
      return balance >= totalRequired;
    });
  }

  static async verifyBalance(address: string, requiredAmount: bigint): Promise<boolean> {
    return await rpcProvider.executeWithFailover(async (provider) => {
      const balance = await provider.getBalance(address);
      return balance >= requiredAmount;
    });
  }

  static async waitForConfirmation(
    txHash: string,
    confirmations = this.CONFIRMATION_BLOCKS
  ): Promise<TransactionResult> {
    const startTime = Date.now();
    
    return await rpcProvider.executeWithFailover(async (provider) => {
      while (Date.now() - startTime < this.MAX_WAIT_TIME) {
        try {
          const receipt = await provider.getTransactionReceipt(txHash);
          
          if (receipt) {
            if (receipt.status === 0) {
              return {
                success: false,
                txHash,
                error: 'Transaction reverted',
                receipt,
              };
            }
            
            const currentBlock = await provider.getBlockNumber();
            const confirmedBlocks = currentBlock - receipt.blockNumber;
            
            if (confirmedBlocks >= confirmations) {
              return {
                success: true,
                txHash,
                receipt,
              };
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch {
          // Continue waiting
        }
      }
      
      return {
        success: false,
        txHash,
        error: 'Transaction confirmation timeout',
      };
    });
  }

  static async getNonce(address: string): Promise<number> {
    return await rpcProvider.executeWithFailover(async (provider) => {
      return await provider.getTransactionCount(address, 'pending');
    });
  }
}
