import React, { createContext, useContext, useState, ReactNode } from 'react';
import DOMPurify from 'dompurify';

interface SecurityContextType {
  isPaused: boolean;
  togglePause: () => void;
  sanitize: (input: string) => string;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [isPaused, setIsPaused] = useState(false);

  const togglePause = () => setIsPaused(prev => !prev);

  const sanitize = (input: string) => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href']
    });
  };

  return (
    <SecurityContext.Provider value={{ isPaused, togglePause, sanitize }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
