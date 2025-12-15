/**
 * Contract Error Parser
 * 
 * Parses blockchain/contract errors into user-friendly messages
 */

export function parseContractError(error: any): string {
  const message = error?.message || error?.toString() || 'Unknown error';
  
  // Common revert reasons
  if (message.includes('insufficient funds')) return 'Insufficient $BASED balance';
  if (message.includes('user rejected') || message.includes('User rejected')) return 'Transaction cancelled by user';
  if (message.includes('Pausable: paused') || message.includes('paused')) return 'Contract is paused';
  if (message.includes('exceeds max supply') || message.includes('Sold out')) return 'Sold out!';
  if (message.includes('Public mint not enabled') || message.includes('not enabled')) return 'Minting not started yet';
  if (message.includes('Not token owner') || message.includes('not owner')) return 'You do not own this NFT';
  if (message.includes('Listing not active') || message.includes('not active')) return 'This listing is no longer active';
  if (message.includes('Offer expired') || message.includes('expired')) return 'This offer has expired';
  if (message.includes('Already voted')) return 'You have already voted';
  if (message.includes('Voting ended') || message.includes('voting ended')) return 'Voting period has ended';
  if (message.includes('Voting not ended') || message.includes('not ended')) return 'Voting period not yet ended';
  if (message.includes('Not approved') || message.includes('not approved') || message.includes('ERC721')) return 'NFT not approved for marketplace. Please approve first.';
  if (message.includes('PriceTooLow') || message.includes('price too low')) return 'Price must be at least 1 $BASED';
  if (message.includes('AlreadyListed') || message.includes('already listed')) return 'This NFT is already listed';
  if (message.includes('JSON-RPC') || message.includes('Internal JSON-RPC error')) return 'Contract error - please try again or check your approval status';
  if (message.includes('execution reverted')) return 'Transaction failed - contract rejected';
  if (message.includes('gas required exceeds')) return 'Transaction would fail - insufficient gas';
  if (message.includes('nonce')) return 'Transaction nonce error - please refresh and try again';
  
  // Network errors
  if (message.includes('network') || message.includes('Network')) return 'Network error - check your connection';
  if (message.includes('timeout') || message.includes('Timeout')) return 'Request timed out - try again';
  if (message.includes('disconnected')) return 'Wallet disconnected - please reconnect';
  if (message.includes('chain') || message.includes('Chain')) return 'Wrong network - please switch to BasedAI';
  
  // Return shortened version of unknown errors
  return message.length > 100 ? message.slice(0, 100) + '...' : message;
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
