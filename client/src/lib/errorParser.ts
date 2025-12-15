/**
 * Contract Error Parser
 * 
 * Parses blockchain/contract errors into user-friendly messages
 */

const DEBUG = import.meta.env.DEV;

export function parseContractError(error: any): string {
  const message = error?.message || error?.toString() || 'Unknown error';
  const shortMessage = error?.shortMessage || '';
  
  // Log full error in dev for debugging
  if (DEBUG) {
    console.error('[ErrorParser] Full error:', error);
    console.error('[ErrorParser] Message:', message);
    console.error('[ErrorParser] Short message:', shortMessage);
  }
  
  // User-initiated cancellations
  if (message.includes('user rejected') || message.includes('User rejected') || message.includes('User denied')) return 'Transaction cancelled';
  
  // Gas limit errors (BasedAI network specific)
  if (message.includes('exceeds block gas limit')) return 'Transaction failed - please try again';
  
  // Marketplace-specific errors
  if (message.includes('InsufficientPayment')) return 'Insufficient $BASED balance';
  if (message.includes('NotSeller')) return 'Only the owner can perform this action';
  if (message.includes('CannotBuyOwnListing')) return 'You cannot buy your own listing';
  
  // Insufficient funds
  if (message.includes('insufficient funds')) return 'Not enough $BASED';
  
  // Ownership errors
  if (message.includes('NotTokenOwner') || message.includes('Not token owner') || message.includes('not owner') || message.includes('caller is not owner')) return 'You do not own this NFT';
  
  // Listing errors
  if (message.includes('ListingNotActive') || message.includes('Listing not active')) return 'This NFT is no longer listed';
  
  // Approval errors - check for ERC721 transfer errors which indicate approval issues
  if (message.includes('Not approved') || message.includes('not approved')) return 'Please approve marketplace first';
  if (message.includes('ERC721: caller is not token owner or approved') || message.includes('ERC721: transfer caller is not owner nor approved')) return 'Please approve marketplace first - click Approve and wait for confirmation';
  if (message.includes('ERC721InsufficientApproval')) return 'Please approve marketplace first - click Approve and wait for confirmation';
  
  // Price errors
  if (message.includes('PriceTooLow') || message.includes('price too low') || message.includes('Price too low')) return 'Minimum price is 1 $BASED';
  if (message.includes('PriceMismatch') || message.includes('price mismatch')) return 'Price has changed - please refresh and try again';
  
  // Other marketplace errors
  if (message.includes('AlreadyListed') || message.includes('already listed')) return 'This NFT is already listed';
  if (message.includes('Offer expired') || message.includes('expired')) return 'This offer has expired';
  if (message.includes('NoOffer') || message.includes('no offer')) return 'No active offer found';
  
  // Contract state errors
  if (message.includes('Pausable: paused') || message.includes('paused')) return 'Contract is paused';
  if (message.includes('exceeds max supply') || message.includes('Sold out')) return 'Sold out!';
  if (message.includes('Public mint not enabled') || message.includes('not enabled')) return 'Minting not started yet';
  
  // Voting errors
  if (message.includes('Already voted')) return 'You have already voted';
  if (message.includes('Voting ended') || message.includes('voting ended')) return 'Voting period has ended';
  if (message.includes('Voting not ended') || message.includes('not ended')) return 'Voting period not yet ended';
  
  // Technical errors with more context
  if (message.includes('execution reverted')) {
    // Try to extract revert reason
    const revertMatch = message.match(/reverted:?\s*"?([^"]+)"?/i) || message.match(/reason="([^"]+)"/);
    if (revertMatch && revertMatch[1]) {
      const reason = revertMatch[1].trim();
      if (DEBUG) console.error('[ErrorParser] Revert reason:', reason);
      // Re-parse the revert reason
      return parseContractError({ message: reason });
    }
    return 'Transaction reverted - you may not own this NFT or it may already be listed';
  }
  
  if (message.includes('JSON-RPC') || message.includes('Internal JSON-RPC error')) return 'Transaction failed - please try again';
  if (message.includes('gas required exceeds')) return 'Transaction would fail - check that you own this NFT';
  if (message.includes('nonce')) return 'Transaction failed - please try again';
  
  // Network errors
  if (message.includes('network') || message.includes('Network')) return 'Network error - check your connection';
  if (message.includes('timeout') || message.includes('Timeout')) return 'Request timed out - try again';
  if (message.includes('disconnected')) return 'Wallet disconnected - please reconnect';
  if (message.includes('chain') || message.includes('Chain')) return 'Wrong network - please switch to BasedAI';
  
  // Default fallback
  return 'Transaction failed - please try again';
}

/**
 * Check if error is user-initiated cancellation
 */
export function isUserRejection(error: any): boolean {
  const message = error?.message || error?.toString() || '';
  return message.includes('user rejected') || 
         message.includes('User rejected') || 
         message.includes('User denied') ||
         message.includes('cancelled');
}

/**
 * Check if error is a network/connection issue
 */
export function isNetworkError(error: any): boolean {
  const message = error?.message || error?.toString() || '';
  return message.includes('network') || 
         message.includes('timeout') || 
         message.includes('disconnected') ||
         message.includes('fetch');
}
