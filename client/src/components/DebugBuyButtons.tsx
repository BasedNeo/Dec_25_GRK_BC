import { useEffect } from 'react';

export function DebugBuyButtons() {
  useEffect(() => {
    const debugBuyButtons = () => {
      console.log('--- DEBUG BUY BUTTONS START ---');
      
      // Select by class
      const classButtons = Array.from(document.querySelectorAll('[class*="buy"]'));
      // Select by text content (simulating :contains)
      const allButtons = Array.from(document.querySelectorAll('button'));
      const textButtons = allButtons.filter(btn => btn.textContent?.toLowerCase().includes('buy'));
      
      const uniqueButtons = new Set([...classButtons, ...textButtons]);
      
      if (uniqueButtons.size === 0) {
        console.log('No buy buttons found in DOM yet.');
      }

      uniqueButtons.forEach((btn, i) => {
        const element = btn as HTMLElement;
        const styles = window.getComputedStyle(element);
        
        console.log(`Button ${i}:`, {
          element: element,
          text: element.textContent,
          classes: element.className,
          computedStyles: {
              background: styles.background,
              backgroundImage: styles.backgroundImage,
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity,
          },
          attributes: {
              'data-token-id': element.getAttribute('data-token-id'),
              'data-price': element.getAttribute('data-price'),
              'data-action': element.getAttribute('data-action'),
              'disabled': element.hasAttribute('disabled')
          },
          parentSection: element.closest('section')?.className || element.closest('div.nft-card')?.className
        });
      });
      console.log('--- DEBUG BUY BUTTONS END ---');
    };

    // Run after page loads (2 seconds delay as requested)
    const timer = setTimeout(debugBuyButtons, 2000);

    // Also run when user interacts, to catch dynamic content (optional but helpful)
    const handleInteraction = () => {
        setTimeout(debugBuyButtons, 1000);
    };
    
    // Attaching to window click to re-run debug when things might change
    window.addEventListener('click', handleInteraction);

    return () => {
        clearTimeout(timer);
        window.removeEventListener('click', handleInteraction);
    };
  }, []);

  return null; // Headless component
}
