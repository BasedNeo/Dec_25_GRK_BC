import DOMPurify from 'dompurify';

export const Security = {
  escapeHtml(unsafe: unknown): string {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
  
  sanitizeUrl(url: unknown): string {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('https://') || 
        trimmed.startsWith('http://') ||
        trimmed.startsWith('ipfs://')) {
      return trimmed;
    }
    return '';
  },
  
  validateMetadata(data: any, tokenId: number) {
    if (!data || typeof data !== 'object') {
      return { name: `Based Guardian #${tokenId}`, image: '', attributes: [] };
    }
    return {
      name: typeof data.name === 'string' ? data.name : `Based Guardian #${tokenId}`,
      image: this.sanitizeUrl(data.image),
      attributes: Array.isArray(data.attributes) ? data.attributes.filter((a: any) => 
        a && typeof a.trait_type === 'string' && a.value !== undefined
      ) : []
    };
  }
};
