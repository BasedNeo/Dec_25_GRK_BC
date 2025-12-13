import DOMPurify from 'dompurify';

export const Security = {
  // Use the robust textContent method to escape HTML entities as requested
  // This prevents XSS by ensuring all content is treated as text
  escapeHtml(unsafe: unknown): string {
    if (typeof unsafe !== 'string') return '';
    if (typeof document === 'undefined') return unsafe; // Server-side fallback
    
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
  },
  
  // Strip all HTML tags to ensure clean text rendering
  sanitizeText(unsafe: unknown): string {
    if (typeof unsafe !== 'string') return '';
    return DOMPurify.sanitize(unsafe, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  },

  sanitizeUrl(url: unknown): string {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    // Allow data URIs for dynamic content as per CSP
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
