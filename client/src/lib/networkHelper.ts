export const BASEDAI_CHAIN_CONFIG = {
  chainId: '0x7E53',
  chainName: 'BasedAI',
  nativeCurrency: {
    name: 'Based',
    symbol: 'BASED',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.basedaibridge.com/rpc/'],
  blockExplorerUrls: ['https://explorer.bf1337.org'],
};

export async function addBasedAINetwork(): Promise<boolean> {
  if (!window.ethereum) {
    console.error('No wallet detected');
    return false;
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [BASEDAI_CHAIN_CONFIG],
    });
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASEDAI_CHAIN_CONFIG.chainId }],
        });
        return true;
      } catch (switchError) {
        console.error('Failed to switch network:', switchError);
        return false;
      }
    }
    console.error('Failed to add network:', error);
    return false;
  }
}

export async function switchToBasedAI(): Promise<boolean> {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASEDAI_CHAIN_CONFIG.chainId }],
    });
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      return addBasedAINetwork();
    }
    return false;
  }
}
