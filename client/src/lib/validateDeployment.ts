import { ethers } from "ethers";
import {
  NFT_CONTRACT,
  MARKETPLACE_CONTRACT,
  GOVERNANCE_CONTRACT,
  RPC_URL,
  BLOCK_EXPLORER,
} from "./constants";

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export async function validateDeployment(): Promise<ValidationResult> {
  const issues: string[] = [];

  const contracts = {
    NFT_CONTRACT,
    MARKETPLACE_CONTRACT,
    GOVERNANCE_CONTRACT,
  };

  for (const [name, addr] of Object.entries(contracts)) {
    if (!addr || addr.includes("0x0000") || addr.length !== 42) {
      issues.push(`${name} has invalid address: ${addr}`);
    }
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    await provider.getBlockNumber();
  } catch {
    issues.push("RPC_URL is not reachable");
  }

  for (const [name, addr] of Object.entries(contracts)) {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const code = await provider.getCode(addr);
      if (code === "0x") {
        issues.push(`${name} has no code at ${addr}`);
      }
    } catch {
      issues.push(`Failed to check ${name}`);
    }
  }

  if (!BLOCK_EXPLORER.startsWith("http")) {
    issues.push("BLOCK_EXPLORER URL invalid");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
