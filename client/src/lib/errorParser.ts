/**
 * Contract Error Parser
 * 
 * Parses blockchain/contract errors into user-friendly messages
 */

export function parseContractError(error: any): string {
  const message = error?.message || error?.toString() || 'Unknown error';
  
  // User-initiated cancellations
  if (message.includes('user rejected') || message.includes('User rejected')) return 'Transaction cancelled';
  
  // Insufficient funds
  if (message.includes('insufficient funds')) return 'Not enough $BASED';
  
  // Ownership errors
  if (message.includes('NotTokenOwner') || message.includes('Not token owner') || message.includes('not owner')) return 'You do not own this NFT';
  
  // Listing errors
  if (message.includes('ListingNotActive') || message.includes('Listing not active') || message.includes('not active')) return 'This listing no longer exists';
  
  // Approval errors
  if (message.includes('Not approved') || message.includes('not approved') || message.includes('ERC721')) return 'Please approve marketplace first';
  
  // Price errors
  if (message.includes('PriceTooLow') || message.includes('price too low')) return 'Price must be at least 1 $BASED';
  
  // Other marketplace errors
  if (message.includes('AlreadyListed') || message.includes('already listed')) return 'This NFT is already listed';
  if (message.includes('Offer expired') || message.includes('expired')) return 'This offer has expired';
  
  // Contract state errors
  if (message.includes('Pausable: paused') || message.includes('paused')) return 'Contract is paused';
  if (message.includes('exceeds max supply') || message.includes('Sold out')) return 'Sold out!';
  if (message.includes('Public mint not enabled') || message.includes('not enabled')) return 'Minting not started yet';
  
  // Voting errors
  if (message.includes('Already voted')) return 'You have already voted';
  if (message.includes('Voting ended') || message.includes('voting ended')) return 'Voting period has ended';
  if (message.includes('Voting not ended') || message.includes('not ended')) return 'Voting period not yet ended';
  
  // Technical errors
  if (message.includes('JSON-RPC') || message.includes('Internal JSON-RPC error')) return 'Transaction failed - please try again';
  if (message.includes('execution reverted')) return 'Transaction failed - please try again';
  if (message.includes('gas required exceeds')) return 'Transaction failed - please try again';
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
