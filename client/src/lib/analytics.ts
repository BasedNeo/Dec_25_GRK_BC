// Google Analytics Integration with IP Anonymization
declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA_ID = import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX';

export const initAnalytics = () => {
  if (typeof window === 'undefined') return;

  // Load GA Script if not already loaded
  if (!document.querySelector(`script[src*="googletagmanager"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){window.dataLayer.push(arguments);}
    window.gtag('js', new Date());

    // Security: Anonymize IP
    window.gtag('config', GA_ID, {
      'anonymize_ip': true,
      'send_page_view': true
    });
  }
};

export const trackSearch = (searchTerm: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'search', {
            event_category: 'Marketplace',
            event_label: searchTerm,
            anonymize_ip: true
        });
    }
};

export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      anonymize_ip: true // Redundant but explicit security
    });
  }
};
