import DOMPurify from 'dompurify';

export const Security = {
  escapeHtml(unsafe: unknown): string {
    if (typeof unsafe !== 'string') return '';
    if (typeof document === 'undefined') return unsafe;
    
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
  },
  
  sanitizeText(unsafe: unknown): string {
    if (typeof unsafe !== 'string') return '';
    return DOMPurify.sanitize(unsafe, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  },

  sanitizeProposalInput(text: unknown): string {
    if (typeof text !== 'string') return '';
    return DOMPurify.sanitize(text.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
      .slice(0, 1000);
  },

  validateProposalTitle(title: string): { valid: boolean; error?: string } {
    const clean = this.sanitizeProposalInput(title);
    if (clean.length < 5) return { valid: false, error: 'Title must be at least 5 characters' };
    if (clean.length > 100) return { valid: false, error: 'Title must be under 100 characters' };
    return { valid: true };
  },

  validateProposalDescription(desc: string): { valid: boolean; error?: string } {
    const clean = this.sanitizeProposalInput(desc);
    if (clean.length < 20) return { valid: false, error: 'Description must be at least 20 characters' };
    if (clean.length > 1000) return { valid: false, error: 'Description must be under 1000 characters' };
    return { valid: true };
  },

  sanitizeUrl(url: unknown): string {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('https://') || 
        trimmed.startsWith('http://') ||
        trimmed.startsWith('ipfs://') ||
        trimmed.startsWith('data:')) {
      return trimmed;
    }
    return '';
  },
  
  validateMetadata(data: any, tokenId: number) {
    if (!data || typeof data !== 'object') {
      return { name: `Based Guardian #${tokenId}`, image: '', attributes: [] };
    }
    return {
      name: typeof data.name === 'string' ? this.sanitizeText(data.name) : `Based Guardian #${tokenId}`,
      image: this.sanitizeUrl(data.image),
      attributes: Array.isArray(data.attributes) ? data.attributes.filter((a: any) => 
        a && typeof a.trait_type === 'string' && a.value !== undefined
      ) : []
    };
  }
};
