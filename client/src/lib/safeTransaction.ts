import { ethers } from 'ethers';
import { RPC_URL } from './constants';

export interface TransactionParams {
  to: string;
  data: string;
  value?: bigint;
  from: string;
}

export interface TransactionResult {
  hash: string;
  confirmed: boolean;
  blockNumber?: number;
  gasUsed?: bigint;
}

export class SafeTransaction {
  private static readonly CONFIRMATION_BLOCKS = 2;
  private static readonly GAS_BUFFER_PERCENT = 20;
  private static readonly MAX_WAIT_TIME = 180000; // 3 minutes

  static async estimateGas(params: TransactionParams): Promise<bigint> {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const gasEstimate = await provider.estimateGas({
        to: params.to,
        data: params.data,
        value: params.value || BigInt(0),
        from: params.from,
      });
      
      const buffered = gasEstimate * BigInt(100 + this.GAS_BUFFER_PERCENT) / BigInt(100);
      return buffered;
    } catch (error: any) {
      console.error('[SafeTx] Gas estimation failed:', error);
      throw new Error(`Gas estimation failed: ${error.message || 'Unknown error'}`);
    }
  }

  static async getGasPrice(): Promise<bigint> {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const feeData = await provider.getFeeData();
      return feeData.gasPrice || BigInt(10000000000); // 10 gwei default
    } catch (error) {
      console.warn('[SafeTx] Failed to get gas price, using default');
      return BigInt(10000000000);
    }
  }

  static async verifyBalance(address: string, requiredAmount: bigint): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const balance = await provider.getBalance(address);
      
      const hasEnough = balance >= requiredAmount;
      
      if (!hasEnough) {
        const shortfall = requiredAmount - balance;
        console.warn(`[SafeTx] Insufficient balance. Need ${ethers.formatEther(requiredAmount)}, have ${ethers.formatEther(balance)}, short ${ethers.formatEther(shortfall)}`);
      }
      
      return hasEnough;
    } catch (error) {
      console.error('[SafeTx] Balance check failed:', error);
      return false;
    }
  }

  static async waitForConfirmation(
    txHash: string,
    confirmations: number = this.CONFIRMATION_BLOCKS
  ): Promise<TransactionResult> {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const startTime = Date.now();

    try {
      const receipt = await provider.waitForTransaction(txHash, confirmations, this.MAX_WAIT_TIME);
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      return {
        hash: txHash,
        confirmed: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      };
    } catch (error: any) {
      if (Date.now() - startTime >= this.MAX_WAIT_TIME) {
        console.warn('[SafeTx] Transaction confirmation timeout');
        return {
          hash: txHash,
          confirmed: false,
        };
      }
      throw error;
    }
  }

  static async getNonce(address: string): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      return await provider.getTransactionCount(address, 'pending');
    } catch (error) {
      console.error('[SafeTx] Failed to get nonce:', error);
      throw error;
    }
  }

  static async preFlightCheck(params: TransactionParams, value: bigint = BigInt(0)): Promise<{
    canProceed: boolean;
    gasEstimate?: bigint;
    totalCost?: bigint;
    error?: string;
  }> {
    try {
      const gasEstimate = await this.estimateGas(params);
      const gasPrice = await this.getGasPrice();
      const gasCost = gasEstimate * gasPrice;
      const totalCost = value + gasCost;

      const hasBalance = await this.verifyBalance(params.from, totalCost);

      if (!hasBalance) {
        return {
          canProceed: false,
          gasEstimate,
          totalCost,
          error: `Insufficient balance. Need ${ethers.formatEther(totalCost)} $BASED total (${ethers.formatEther(value)} + ${ethers.formatEther(gasCost)} gas)`,
        };
      }

      return {
        canProceed: true,
        gasEstimate,
        totalCost,
      };
    } catch (error: any) {
      return {
        canProceed: false,
        error: error.message || 'Pre-flight check failed',
      };
    }
  }
}
